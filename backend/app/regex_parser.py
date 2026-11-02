"""Regular-expression parser producing an AST for the DFA compiler.

The grammar implemented here is deliberately small and *unambiguous*, so no
precedence-climbing table is required::

    alternation := concat ('|' concat)*
    concat      := repeat*
    repeat      := atom ('*' | '+' | '?' | '{m,n}')*
    atom        := '(' alternation ')' | '[' class ']' | '.' | escape | literal
                 | '^' | '$'

Anything outside this subset (lookarounds, backreferences, named groups) is
rejected with a clear error rather than silently mis-compiled -- a security
filter that quietly changes the meaning of a pattern is worse than one that
refuses it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, List, Optional, Tuple, Union

__all__ = [
    "RegexSyntaxError",
    "CharClass",
    "CharNode",
    "EmptyNode",
    "ConcatNode",
    "AltNode",
    "StarNode",
    "PlusNode",
    "OptNode",
    "RepeatNode",
    "AnchorNode",
    "Node",
    "RegexParser",
    "parse",
    "ast_summary",
    "find_redos_patterns",
]


class RegexSyntaxError(ValueError):
    """Raised when a pattern uses syntax outside the supported subset."""


# --------------------------------------------------------------------------- #
# Character classes
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class CharClass:
    """A set of characters, optionally negated.

    ``chars`` is always finite. Negated classes therefore describe "everything
    except this finite set", which is what lets us build a *finite* alphabet:
    every literal character mentioned anywhere in the pattern ends up in the
    alphabet, and one extra "other" symbol covers everything that is not.
    """

    chars: FrozenSet[str]
    negated: bool = False

    def matches(self, ch: str) -> bool:
        inside = ch in self.chars
        return (not inside) if self.negated else inside

    def describe(self) -> str:
        if self.negated:
            return "any char except " + _fmt_set(self.chars)
        return _fmt_set(self.chars)


def _fmt_set(chars: FrozenSet[str]) -> str:
    if not chars:
        return "∅"
    return "".join(sorted(chars))


# --------------------------------------------------------------------------- #
# AST
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class CharNode:
    cls: CharClass


@dataclass(frozen=True)
class EmptyNode:
    """Matches the empty string (ε)."""


@dataclass(frozen=True)
class ConcatNode:
    parts: Tuple["Node", ...]


@dataclass(frozen=True)
class AltNode:
    options: Tuple["Node", ...]


@dataclass(frozen=True)
class StarNode:
    child: "Node"


@dataclass(frozen=True)
class PlusNode:
    child: "Node"


@dataclass(frozen=True)
class OptNode:
    child: "Node"


@dataclass(frozen=True)
class RepeatNode:
    child: "Node"
    minimum: int
    maximum: Optional[int]  # None == unbounded


@dataclass(frozen=True)
class AnchorNode:
    kind: str  # "start" | "end"


Node = Union[
    CharNode, EmptyNode, ConcatNode, AltNode, StarNode, PlusNode, OptNode,
    RepeatNode, AnchorNode,
]


# --------------------------------------------------------------------------- #
# Shorthand class expansions
# --------------------------------------------------------------------------- #
DIGITS = frozenset("0123456789")
WORD = frozenset(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
)
SPACE = frozenset(" \t\n\r\f\v")

_SHORT = {
    "d": (DIGITS, False),
    "D": (DIGITS, True),
    "w": (WORD, False),
    "W": (WORD, True),
    "s": (SPACE, False),
    "S": (SPACE, True),
}

_ESCAPES = {
    "n": "\n",
    "t": "\t",
    "r": "\r",
    "f": "\f",
    "v": "\v",
    "0": "\0",
}

# Group prefixes we knowingly cannot support.
_UNSUPPORTED_GROUP = ("?:", "?=", "?!", "?<", "?P", "?>", "?#", "?!", "?&")


# --------------------------------------------------------------------------- #
# Parser
# --------------------------------------------------------------------------- #
class RegexParser:
    def __init__(self, pattern: str):
        self.pattern = pattern
        self.pos = 0
        self.n = len(pattern)

    # -- helpers ----------------------------------------------------------- #
    def _peek(self, offset: int = 0) -> str:
        i = self.pos + offset
        return self.pattern[i] if i < self.n else ""

    def _error(self, msg: str):
        raise RegexSyntaxError(
            f"{msg} (position {self.pos} in {self.pattern!r})"
        )

    # -- entry point ------------------------------------------------------ #
    def parse(self) -> Node:
        node = self._parse_alternation()
        if self.pos != self.n:
            self._error(f"unexpected {self.pattern[self.pos]!r}")
        return node

    # -- grammar rules ---------------------------------------------------- #
    def _parse_alternation(self) -> Node:
        options = [self._parse_concat()]
        while self._peek() == "|":
            self.pos += 1
            options.append(self._parse_concat())
        if len(options) == 1:
            return options[0]
        return AltNode(tuple(options))

    def _parse_concat(self) -> Node:
        parts: List[Node] = []
        while True:
            c = self._peek()
            if c == "" or c in "|)":
                break
            parts.append(self._parse_repeat())
        if not parts:
            return EmptyNode()
        if len(parts) == 1:
            return parts[0]
        return ConcatNode(tuple(parts))

    def _parse_repeat(self) -> Node:
        atom = self._parse_atom()
        while True:
            c = self._peek()
            if c == "*":
                self.pos += 1
                atom = StarNode(atom)
            elif c == "+":
                self.pos += 1
                atom = PlusNode(atom)
            elif c == "?":
                self.pos += 1
                atom = OptNode(atom)
            elif c == "{" and self._looks_like_bound():
                atom = self._parse_bound(atom)
            else:
                return atom

    def _looks_like_bound(self) -> bool:
        j = self.pos + 1
        digits = 0
        while j < self.n and self.pattern[j].isdigit():
            j += 1
            digits += 1
        if digits == 0:
            return False
        if j < self.n and self.pattern[j] == ",":
            j += 1
            while j < self.n and self.pattern[j].isdigit():
                j += 1
        return j < self.n and self.pattern[j] == "}"

    def _parse_bound(self, atom: Node) -> Node:
        self.pos += 1  # consume '{'
        min_s = ""
        while self._peek().isdigit():
            min_s += self.pattern[self.pos]
            self.pos += 1
        minimum = int(min_s)
        maximum: Optional[int] = minimum
        if self._peek() == ",":
            self.pos += 1
            max_s = ""
            while self._peek().isdigit():
                max_s += self.pattern[self.pos]
                self.pos += 1
            maximum = int(max_s) if max_s else None
        if self._peek() != "}":
            self._error("unterminated repetition bound")
        self.pos += 1
        if maximum is not None and maximum < minimum:
            self._error(f"invalid repetition range {{{minimum},{maximum}}}")
        return RepeatNode(atom, minimum, maximum)

    def _parse_atom(self) -> Node:
        c = self._peek()
        if c == "":
            self._error("unexpected end of pattern")
        if c == "(":
            for pfx in _UNSUPPORTED_GROUP:
                if self.pattern.startswith(pfx, self.pos + 1):
                    self._error(
                        "group modifiers and lookarounds are not supported by the "
                        "DFA compiler"
                    )
            self.pos += 1
            inner = self._parse_alternation()
            if self._peek() != ")":
                self._error("unclosed group")
            self.pos += 1
            return inner
        if c == "[":
            return self._parse_class()
        if c == ".":
            self.pos += 1
            # '.' matches any character except newline -- modelled as a negated
            # class so the alphabet stays finite.
            return CharNode(CharClass(frozenset({"\n"}), negated=True))
        if c == "^":
            self.pos += 1
            return AnchorNode("start")
        if c == "$":
            self.pos += 1
            return AnchorNode("end")
        if c == "\\":
            chars, negated, literal = self._parse_escape()
            return CharNode(CharClass(chars, negated))
        if c in "*+?":
            self._error(f"nothing to repeat before {c!r}")
        if c == ")":
            self._error("unmatched ')'")
        if c == "{":
            self._error("nothing to repeat before '{'")
        self.pos += 1
        return CharNode(CharClass(frozenset({c})))

    # -- character classes ------------------------------------------------ #
    def _parse_class(self) -> Node:
        self.pos += 1  # consume '['
        negated = False
        if self._peek() == "^":
            negated = True
            self.pos += 1
        chars: set[str] = set()
        first = True
        while True:
            c = self._peek()
            if c == "":
                self._error("unterminated character class")
            if c == "]" and not first:
                self.pos += 1
                break
            first = False

            atom = self._parse_class_atom()
            # range?  a-z
            if (
                isinstance(atom, str)
                and self._peek() == "-"
                and self._peek(1) != ""
                and self._peek(1) != "]"
            ):
                self.pos += 1  # consume '-'
                hi = self._parse_class_atom()
                if not isinstance(hi, str):
                    self._error("invalid character range")
                if ord(hi) < ord(atom):
                    self._error(f"invalid character range {atom}-{hi}")
                for o in range(ord(atom), ord(hi) + 1):
                    chars.add(chr(o))
            elif isinstance(atom, str):
                chars.add(atom)
            else:
                chars |= atom
        return CharNode(CharClass(frozenset(chars), negated))

    def _parse_class_atom(self) -> Union[str, FrozenSet[str]]:
        """Return a single character or a set of characters (shorthand class)."""
        if self._peek() == "\\":
            chars, negated, literal = self._parse_escape()
            if negated:
                self._error(
                    "negated shorthand classes (\\D, \\W, \\S) are not supported "
                    "inside a character class"
                )
            if literal is not None:
                return literal
            return chars
        c = self._peek()
        self.pos += 1
        return c

    # -- escapes ---------------------------------------------------------- #
    def _parse_escape(self) -> Tuple[FrozenSet[str], bool, Optional[str]]:
        """Return (chars, negated, literal_or_None)."""
        self.pos += 1  # consume '\'
        c = self._peek()
        if c == "":
            self._error("trailing backslash")
        self.pos += 1
        if c in _SHORT:
            chars, neg = _SHORT[c]
            return chars, neg, None
        if c in _ESCAPES:
            ch = _ESCAPES[c]
            return frozenset({ch}), False, ch
        if c == "x":
            hexs = self.pattern[self.pos : self.pos + 2]
            if len(hexs) == 2 and all(h in "0123456789abcdefABCDEF" for h in hexs):
                self.pos += 2
                ch = chr(int(hexs, 16))
                return frozenset({ch}), False, ch
            self._error("invalid \\x escape")
        # Backreference: reject loudly.
        if c.isdigit():
            self._error("backreferences are not supported by the DFA compiler")
        return frozenset({c}), False, c


def parse(pattern: str) -> Node:
    """Parse ``pattern`` into an AST. Raises :class:`RegexSyntaxError`."""
    return RegexParser(pattern).parse()


# --------------------------------------------------------------------------- #
# Introspection helpers
# --------------------------------------------------------------------------- #
def ast_summary(node: Node) -> dict:
    """Return a JSON-friendly summary of the AST (for the API response)."""
    kind = type(node).__name__
    if isinstance(node, CharNode):
        return {"kind": "char", "class": node.cls.describe()}
    if isinstance(node, EmptyNode):
        return {"kind": "empty"}
    if isinstance(node, AnchorNode):
        return {"kind": "anchor", "anchor": node.kind}
    if isinstance(node, ConcatNode):
        return {"kind": "concat", "parts": [ast_summary(p) for p in node.parts]}
    if isinstance(node, AltNode):
        return {"kind": "alt", "options": [ast_summary(o) for o in node.options]}
    if isinstance(node, StarNode):
        return {"kind": "star", "child": ast_summary(node.child)}
    if isinstance(node, PlusNode):
        return {"kind": "plus", "child": ast_summary(node.child)}
    if isinstance(node, OptNode):
        return {"kind": "opt", "child": ast_summary(node.child)}
    if isinstance(node, RepeatNode):
        return {
            "kind": "repeat",
            "min": node.minimum,
            "max": node.maximum,
            "child": ast_summary(node.child),
        }
    return {"kind": kind}


def find_redos_patterns(node: Node) -> List[str]:
    """Heuristically flag constructs that make a *backtracking* engine vulnerable.

    These flags describe the native engine's risk only. The compiled DFA is
    immune to all of them, which is precisely the point of the project.
    """
    findings: List[str] = []
    quantifiers = (StarNode, PlusNode, RepeatNode)

    def walk(n: Node, under_quant: bool) -> None:
        if isinstance(n, (StarNode, PlusNode, RepeatNode)):
            if under_quant:
                findings.append(
                    "nested quantifier: a repetition inside a repetition is the "
                    "classic ReDoS shape (e.g. (a+)+)"
                )
            walk(n.child, True)
            return
        if isinstance(n, ConcatNode):
            for p in n.parts:
                walk(p, under_quant)
            return
        if isinstance(n, AltNode):
            for o in n.options:
                walk(o, under_quant)
            return
        if isinstance(n, OptNode):
            walk(n.child, under_quant)
            return

    def has_alt(n: Node) -> bool:
        if isinstance(n, AltNode):
            return True
        if isinstance(n, (StarNode, PlusNode, OptNode, RepeatNode)):
            return has_alt(n.child)
        if isinstance(n, ConcatNode):
            return any(has_alt(p) for p in n.parts)
        return False

    def check_quantified_alt(n: Node) -> None:
        if isinstance(n, (StarNode, PlusNode, RepeatNode)) and has_alt(n.child):
            findings.append(
                "quantified alternation: a repetition over a branch point makes "
                "the number of backtracking paths grow with input length"
            )

    def scan(n: Node) -> None:
        check_quantified_alt(n)
        if isinstance(n, (StarNode, PlusNode, OptNode, RepeatNode)):
            scan(n.child)
        elif isinstance(n, ConcatNode):
            for p in n.parts:
                scan(p)
        elif isinstance(n, AltNode):
            for o in n.options:
                scan(o)

    scan(node)
    walk(node, False)
    # de-duplicate, keep order
    seen = set()
    out = []
    for f in findings:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out
