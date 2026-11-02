"""Thompson's construction: AST -> epsilon-NFA.

Every sub-expression becomes a fragment with a fresh entry and exit state.
Operators are wired with direct epsilon edges:

    a          s --a--> t
    a|b        s -e-> s1 ... t  /  s -e-> s2 ... t
    a*         s -e-> s1 ... t  /  s -e-> t  /  t1 -e-> t  /  t1 -e-> s1
    a+         s -e-> s1 ... t  /  t1 -e-> t  /  t1 -e-> s1
    a?         s -e-> s1 ... t  /  s -e-> t  /  t1 -e-> t

The resulting automaton has O(|regex|) states and is *ambiguous*: several
distinct paths can accept the same string. That ambiguity is exactly what makes
a backtracking matcher exponential -- and exactly what the Powerset
construction removes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple

from .regex_parser import (
    AltNode,
    AnchorNode,
    CharClass,
    CharNode,
    ConcatNode,
    EmptyNode,
    Node,
    OptNode,
    PlusNode,
    RegexSyntaxError,
    RepeatNode,
    StarNode,
)

MAX_REPEAT_EXPANSION = 64


@dataclass
class NFAState:
    id: int
    eps: Set[int] = field(default_factory=set)
    trans: Dict[CharClass, Set[int]] = field(default_factory=dict)

    def add_trans(self, cls: CharClass, dst: int) -> None:
        self.trans.setdefault(cls, set()).add(dst)


@dataclass
class NFA:
    states: List[NFAState]
    start: int
    accept: int

    def alphabet_literals(self) -> Set[str]:
        """Every literal character that appears in any transition label."""
        out: Set[str] = set()
        for st in self.states:
            for cls in st.trans:
                out |= cls.chars
        return out


class ThompsonBuilder:
    def __init__(self) -> None:
        self.states: List[NFAState] = []

    def new_state(self) -> int:
        self.states.append(NFAState(len(self.states)))
        return len(self.states) - 1

    # ------------------------------------------------------------------ #
    def build(self, node: Node) -> Tuple[int, int]:
        """Return the (start, accept) fragment for ``node``."""
        if isinstance(node, CharNode):
            s = self.new_state()
            a = self.new_state()
            self.states[s].add_trans(node.cls, a)
            return s, a

        if isinstance(node, EmptyNode):
            s = self.new_state()
            a = self.new_state()
            self.states[s].eps.add(a)
            return s, a

        if isinstance(node, AnchorNode):
            # Zero-width assertion. The DFA matcher uses *full-match* semantics,
            # so a leading '^' / trailing '$' is satisfied by construction.
            return self.build(EmptyNode())

        if isinstance(node, ConcatNode):
            frags = [self.build(p) for p in node.parts]
            return self._chain(frags)

        if isinstance(node, AltNode):
            s = self.new_state()
            a = self.new_state()
            for opt in node.options:
                os_, oa = self.build(opt)
                self.states[s].eps.add(os_)
                self.states[oa].eps.add(a)
            return s, a

        if isinstance(node, StarNode):
            return self._star(self.build(node.child))

        if isinstance(node, PlusNode):
            return self._plus(self.build(node.child))

        if isinstance(node, OptNode):
            return self._opt(self.build(node.child))

        if isinstance(node, RepeatNode):
            return self._repeat(node)

        raise TypeError(f"unsupported AST node: {type(node).__name__}")

    # ------------------------------------------------------------------ #
    def _chain(self, frags: List[Tuple[int, int]]) -> Tuple[int, int]:
        if not frags:
            return self.build(EmptyNode())
        for (_, a1), (s2, _) in zip(frags, frags[1:]):
            self.states[a1].eps.add(s2)
        return frags[0][0], frags[-1][1]

    def _star(self, frag: Tuple[int, int]) -> Tuple[int, int]:
        s = self.new_state()
        a = self.new_state()
        cs, ca = frag
        self.states[s].eps.update({cs, a})
        self.states[ca].eps.update({a, cs})
        return s, a

    def _plus(self, frag: Tuple[int, int]) -> Tuple[int, int]:
        s = self.new_state()
        a = self.new_state()
        cs, ca = frag
        self.states[s].eps.add(cs)
        self.states[ca].eps.update({a, cs})
        return s, a

    def _opt(self, frag: Tuple[int, int]) -> Tuple[int, int]:
        s = self.new_state()
        a = self.new_state()
        cs, ca = frag
        self.states[s].eps.update({cs, a})
        self.states[ca].eps.add(a)
        return s, a

    def _repeat(self, node: RepeatNode) -> Tuple[int, int]:
        m, mx = node.minimum, node.maximum
        if mx is not None and mx == 0:
            return self.build(EmptyNode())

        if mx is None:
            if m == 0:
                return self._star(self.build(node.child))
            if m > MAX_REPEAT_EXPANSION:
                raise RegexSyntaxError(
                    f"repetition bound {{{m},}} exceeds the expansion limit of "
                    f"{MAX_REPEAT_EXPANSION}"
                )
            frags = [self.build(node.child) for _ in range(m - 1)]
            frags.append(self._plus(self.build(node.child)))
        else:
            extra = mx - m
            if extra > MAX_REPEAT_EXPANSION:
                raise RegexSyntaxError(
                    f"repetition bound {{{m},{mx}}} exceeds the expansion limit "
                    f"of {MAX_REPEAT_EXPANSION}"
                )
            frags = [self.build(node.child) for _ in range(m)]
            for _ in range(extra):
                frags.append(self._opt(self.build(node.child)))

        return self._chain(frags)


def build_nfa(node: Node) -> NFA:
    """Compile an AST into an epsilon-NFA."""
    b = ThompsonBuilder()
    start, accept = b.build(node)
    return NFA(states=b.states, start=start, accept=accept)
