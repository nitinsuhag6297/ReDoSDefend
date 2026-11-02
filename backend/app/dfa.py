"""Powerset (subset) construction: epsilon-NFA -> strict DFA.

Why this kills ReDoS
--------------------
A backtracking engine explores *paths* through the NFA. For an ambiguous regex
such as ``(a+)+$`` the NFA contains a catree of epsilon-closures: the string
``"aaaa...a"`` can be split among the nested repetitions in exponentially many
ways, and a failing match must try all of them. Cost: O(2^n).

The Powerset construction replaces "the set of states I could be in" with a
*single state of the DFA*. Every reachable set becomes one row of a transition
table, and a character advances you to exactly one next row. There is no
alternative path left to explore, so there is nothing to backtrack into. Cost:
O(n) -- one table lookup per input character, independent of how ambiguous the
source regex was.

The construction itself is a BFS over subsets; the *matching* is what is
linear, because the table is fully materialised.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, FrozenSet, List, Optional, Set, Tuple

from .regex_parser import CharClass
from .thompson import NFA

# Sentinel symbol for "any character not mentioned literally in the pattern".
# It is not a legal input character, so it can never collide with a literal.
OTHER = "\x00OTHER"


@dataclass
class DFA:
    """A fully materialised deterministic finite automaton."""

    alphabet: List[str]                      # ordered symbols, OTHER always last
    literals: FrozenSet[str]                  # concrete characters in the alphabet
    transitions: List[Dict[str, int]]         # per-state: symbol -> target state
    accepting: List[bool]                     # per-state
    subsets: List[Tuple[int, ...]]            # per-state: the NFA subset it encodes
    start: int = 0

    def symbol_for(self, ch: str) -> str:
        """Map a concrete input character onto an alphabet symbol."""
        return ch if ch in self.literals else OTHER

    def to_dict(self) -> dict:
        return {
            "alphabet": list(self.alphabet),
            "literals": sorted(self.literals),
            "start": self.start,
            "states": [
                {
                    "id": i,
                    "accepting": self.accepting[i],
                    "start": i == self.start,
                    "subset": list(self.subsets[i]),
                }
                for i in range(len(self.accepting))
            ],
            "transitions": self.transitions,
        }


def _symbol_matches(symbol: str, cls: CharClass) -> bool:
    """Does a transition label ``cls`` fire for the alphabet symbol ``symbol``?

    Every class's ``chars`` set is a subset of the literal alphabet, so the
    "other" symbol (any character outside that alphabet) is matched by negated
    classes and by nothing else. This keeps the alphabet finite and exact.
    """
    if symbol == OTHER:
        return cls.negated
    return cls.matches(symbol)


def epsilon_closure(nfa: NFA, states) -> FrozenSet[int]:
    """All states reachable from ``states`` using only epsilon edges."""
    seen: Set[int] = set(states)
    stack = list(seen)
    while stack:
        u = stack.pop()
        for v in nfa.states[u].eps:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return frozenset(seen)


def _move(nfa: NFA, subset: FrozenSet[int], symbol: str) -> Optional[FrozenSet[int]]:
    """The epsilon-closure of the states reached by consuming ``symbol``."""
    moved: Set[int] = set()
    for s in subset:
        for cls, targets in nfa.states[s].trans.items():
            if _symbol_matches(symbol, cls):
                moved |= targets
    if not moved:
        return None
    return epsilon_closure(nfa, moved)


def build_dfa(nfa: NFA) -> DFA:
    """Run the Powerset construction over ``nfa``.

    The construction produces a **complete** DFA: a *trap state* (the empty
    NFA subset) is added, and every symbol that has no successor from a state
    leads to the trap. The trap loops to itself on every symbol.

    The trap is what makes the "dead state" row visible in the matrix
    inspector, and it is the textbook complete-DFA formulation. It costs
    nothing in matching time -- reaching the trap ends the match immediately
    because the trap is non-accepting -- and it does not change the set of
    accepted strings.
    """
    literals = frozenset(nfa.alphabet_literals())
    alphabet = sorted(literals) + [OTHER]

    start_subset = epsilon_closure(nfa, {nfa.start})

    index: Dict[FrozenSet[int], int] = {start_subset: 0}
    order: List[FrozenSet[int]] = [start_subset]
    rows: List[Dict[str, int]] = []

    i = 0
    while i < len(order):
        current = order[i]
        row: Dict[str, int] = {}
        for symbol in alphabet:
            target = _move(nfa, current, symbol)
            if target is None:
                continue  # no successor yet; resolved to the trap below
            if target not in index:
                index[target] = len(order)
                order.append(target)
            row[symbol] = index[target]
        rows.append(row)
        i += 1

    # Add the trap state (empty subset) and wire it as the fallback target
    # for every symbol with no successor.
    trap_index = len(order)
    order.append(frozenset())  # the empty subset
    trap_row: Dict[str, int] = {symbol: trap_index for symbol in alphabet}
    rows.append(trap_row)

    for row in rows[:-1]:
        for symbol in alphabet:
            row.setdefault(symbol, trap_index)

    accepting = [nfa.accept in subset for subset in order]
    return DFA(
        alphabet=alphabet,
        literals=literals,
        transitions=rows,
        accepting=accepting,
        subsets=[tuple(s) for s in order],
        start=0,
    )


def match_dfa(dfa: DFA, text: str) -> Tuple[bool, int]:
    """Match ``text`` against ``dfa`` in O(n).

    Returns ``(matched, steps)`` where ``steps`` is the number of transition
    lookups performed -- i.e. exactly one per input character, which is the
    observable proof that the engine is linear.
    """
    state = dfa.start
    steps = 0
    for ch in text:
        symbol = dfa.symbol_for(ch)
        nxt = dfa.transitions[state].get(symbol)
        steps += 1
        if nxt is None:
            return False, steps
        state = nxt
    return dfa.accepting[state], steps
