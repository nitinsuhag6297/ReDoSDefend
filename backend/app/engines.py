"""Execution engines: a linear-time DFA matcher and a vulnerable backtracker.

Two engines are provided so the same payload can be measured twice:

``DFAEngine``
    Steps the compiled transition table. One table lookup per input character,
    so the cost is O(n) and the step count equals the payload length exactly.

``BacktrackingEngine``
    A faithful simulation of a naive backtracking regex engine. It explores
    *every* way the pattern could match, and counts each comparison it makes.
    For an ambiguous pattern such as ``(a+)+$`` the number of ways grows
    exponentially with the input length, so the step count grows like 2^n --
    the very behaviour that makes ``re``-based filters vulnerable to ReDoS.

``NativeRegexEngine``
    Wraps Python's own :mod:`re` module and times it under a hard wall-clock
    budget so a real-world catastrophic case can be observed (and capped) on
    the same payload.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Callable, Optional

from .dfa import DFA, match_dfa
from .regex_parser import (
    AltNode,
    AnchorNode,
    CharNode,
    ConcatNode,
    EmptyNode,
    Node,
    OptNode,
    PlusNode,
    RepeatNode,
    StarNode,
)

# Maximum number of backtracking steps before the simulator gives up. Keeps a
# pathological payload from burning the CPU: the run is reported as "aborted"
# with the step count at the moment it was cut off.
DEFAULT_STEP_BUDGET = 20_000_000


@dataclass
class MatchResult:
    matched: Optional[bool]     # None == aborted (budget exhausted / timeout)
    steps: int
    elapsed_ms: float
    aborted: bool = False
    note: str = ""


class StepBudgetExceeded(Exception):
    pass


# --------------------------------------------------------------------------- #
# DFA engine
# --------------------------------------------------------------------------- #
class DFAEngine:
    """O(n) matcher over the compiled DFA."""

    name = "DFA (Powerset)"

    def __init__(self, dfa: DFA):
        self.dfa = dfa

    def match(self, text: str) -> MatchResult:
        t0 = time.perf_counter()
        matched, steps = match_dfa(self.dfa, text)
        elapsed = (time.perf_counter() - t0) * 1000.0
        return MatchResult(matched=matched, steps=steps, elapsed_ms=elapsed)


# --------------------------------------------------------------------------- #
# Backtracking engine (the "vulnerable" one)
# --------------------------------------------------------------------------- #
class BacktrackingEngine:
    """Naive backtracking matcher with an exact step counter.

    The matcher is written in continuation-passing style: every state of the
    search is a (node, position, continuation) triple, and a branch that fails
    causes the search to *revisit* earlier decisions. That re-visiting is the
    exponential blow-up we want to demonstrate.
    """

    name = "Native backtracking (simulated)"

    def __init__(self, node: Node, step_budget: int = DEFAULT_STEP_BUDGET):
        self.node = node
        self.step_budget = step_budget
        self.steps = 0

    # -- budget bookkeeping ------------------------------------------------ #
    def _tick(self) -> None:
        self.steps += 1
        if self.steps > self.step_budget:
            raise StepBudgetExceeded

    # -- the matcher ------------------------------------------------------- #
    def match(self, text: str) -> MatchResult:
        self.steps = 0
        t0 = time.perf_counter()
        n = len(text)
        try:
            result = self._m(self.node, 0, text, n, lambda p: p == n)
        except StepBudgetExceeded:
            elapsed = (time.perf_counter() - t0) * 1000.0
            return MatchResult(
                matched=None,
                steps=self.steps,
                elapsed_ms=elapsed,
                aborted=True,
                note=f"step budget of {self.step_budget:,} exhausted",
            )
        except RecursionError:
            elapsed = (time.perf_counter() - t0) * 1000.0
            return MatchResult(
                matched=None,
                steps=self.steps,
                elapsed_ms=elapsed,
                aborted=True,
                note="recursion limit reached",
            )
        elapsed = (time.perf_counter() - t0) * 1000.0
        return MatchResult(matched=result, steps=self.steps, elapsed_ms=elapsed)

    def _m(self, node: Node, pos: int, text: str, n: int, k: Callable[[int], bool]) -> bool:
        self._tick()

        if isinstance(node, EmptyNode):
            return k(pos)

        if isinstance(node, AnchorNode):
            # Full-match semantics: ^ at the start and $ at the end are
            # satisfied by the overall match requirement.
            return k(pos)

        if isinstance(node, CharNode):
            if pos < n and node.cls.matches(text[pos]):
                return k(pos + 1)
            return False

        if isinstance(node, ConcatNode):
            def step(i: int, p: int) -> bool:
                if i == len(node.parts):
                    return k(p)
                return self._m(node.parts[i], p, text, n, lambda q: step(i + 1, q))
            return step(0, pos)

        if isinstance(node, AltNode):
            for opt in node.options:
                if self._m(opt, pos, text, n, k):
                    return True
            return False

        if isinstance(node, OptNode):
            # Greedy: try the child first, then the empty branch.
            if self._m(node.child, pos, text, n, k):
                return True
            return k(pos)

        if isinstance(node, StarNode):
            # Greedy repetition with backtracking.
            #
            # `rep(p)` means: "the repetition is open at position p; consume one
            # more occurrence of the body". If the body cannot be matched at p,
            # the repetition closes here and the continuation `k` is tried at p.
            # If the body *was* matched but the deeper search failed, control
            # unwinds and each level offers its own shorter exit.
            #
            # That unwinding is precisely the mechanism that makes `(a+)+` cost
            # O(2^n): the "aaaa...a" prefix can be split between the inner and
            # outer repetition in exponentially many ways, and every split has
            # to be tried before the match can be declared a failure.
            def rep(p: int) -> bool:
                def body(q: int) -> bool:
                    if q == p:
                        # Zero-width body match: stop repeating (no progress).
                        return k(p)
                    return rep(q)
                if self._m(node.child, p, text, n, body):
                    return True
                # The body does not match here: close the repetition at p.
                return k(p)
            return rep(pos)

        if isinstance(node, PlusNode):
            # One mandatory occurrence, then the star behaviour.
            def after_first(q: int) -> bool:
                def rep(p: int) -> bool:
                    def body(r: int) -> bool:
                        if r == p:
                            return k(p)
                        return rep(r)
                    if self._m(node.child, p, text, n, body):
                        return True
                    return k(p)
                return rep(q)
            return self._m(node.child, pos, text, n, after_first)

        if isinstance(node, RepeatNode):
            return self._m_repeat(node, pos, text, n, k)

        raise TypeError(f"unsupported node in backtracker: {type(node).__name__}")

    def _m_repeat(self, node: RepeatNode, pos: int, text: str, n: int,
                  k: Callable[[int], bool]) -> bool:
        """Bounded repetition ``{m,n}``.

        Greedy semantics: try the largest legal repetition count first, then
        back off one count at a time. Every back-off re-walks the child, which
        is exactly the multiplicative cost that makes bounded quantifiers over
        ambiguous bodies exponential as well.
        """
        minimum, maximum = node.minimum, node.maximum
        child = node.child

        def rep(count: int, p: int) -> bool:
            # 'count' repetitions have been consumed and we are at position p.
            if count >= minimum and (maximum is None or count >= maximum):
                if maximum is None:
                    # Unbounded: this is the greedy exit branch.
                    return k(p)
                return k(p)
            if maximum is not None and count >= maximum:
                return k(p) if count >= minimum else False
            return self._m(child, p, text, n, lambda q: rep(count + 1, q))

        def bounded(count: int, p: int) -> bool:
            """Try counts >= count, most first."""
            if maximum is not None and count > maximum:
                return False
            if count >= minimum:
                # Greedy: attempt to continue matching the body first.
                if maximum is not None and count >= maximum:
                    return k(p)
                if self._m(child, p, text, n, lambda q: bounded(count + 1, q)):
                    return True
                # Body did not match: close the repetition here.
                return k(p)
            return self._m(child, p, text, n, lambda q: bounded(count + 1, q))

        return bounded(0, pos)


# --------------------------------------------------------------------------- #
# Native Python `re` engine
# --------------------------------------------------------------------------- #
# Child program: measure one `re.fullmatch` and report the result as JSON.
# Kept as a plain string so it can be handed to `python -c` with no imports
# beyond the standard library and no risk of re-importing the host app.
_NATIVE_WORKER = """
import json, re, sys, time
pattern, text = sys.argv[1], sys.argv[2]
try:
    compiled = re.compile(pattern)
    t0 = time.perf_counter()
    m = compiled.fullmatch(text)
    elapsed = (time.perf_counter() - t0) * 1000.0
    print(json.dumps({"matched": m is not None, "ms": elapsed, "error": None}))
except Exception as exc:
    print(json.dumps({"matched": None, "ms": 0.0,
                      "error": type(exc).__name__ + ": " + str(exc)}))
"""


class NativeRegexEngine:
    """Times Python's own :mod:`re` against the same payload.

    The match runs in a child process with a hard wall-clock budget. If the
    budget is exceeded the child is killed, which is the only reliable way to
    stop a catastrophically backtracking match in CPython -- a thread would
    keep burning CPU after the timeout.
    """

    name = "Native Python re"

    def __init__(self, pattern: str, timeout_ms: float = 250.0):
        self.pattern = pattern
        self.timeout_ms = timeout_ms

    def match(self, text: str) -> MatchResult:
        import subprocess
        import sys

        try:
            proc = subprocess.run(
                [sys.executable, "-c", _NATIVE_WORKER, self.pattern, text],
                capture_output=True,
                text=True,
                timeout=self.timeout_ms / 1000.0,
            )
        except subprocess.TimeoutExpired:
            return MatchResult(
                matched=None,
                steps=0,
                elapsed_ms=self.timeout_ms,
                aborted=True,
                note=(
                    f"exceeded {self.timeout_ms:.0f} ms wall-clock budget "
                    "(child process killed)"
                ),
            )

        out = (proc.stdout or "").strip()
        if not out:
            return MatchResult(
                matched=None, steps=0, elapsed_ms=0.0, aborted=True,
                note=(proc.stderr or "child produced no output").strip()[:200],
            )
        try:
            data = json.loads(out.splitlines()[-1])
        except (ValueError, IndexError):
            return MatchResult(
                matched=None, steps=0, elapsed_ms=0.0, aborted=True,
                note="could not parse child output",
            )

        if data.get("error"):
            return MatchResult(
                matched=None, steps=0, elapsed_ms=0.0, aborted=True,
                note=str(data["error"])[:200],
            )
        return MatchResult(
            matched=bool(data["matched"]),
            steps=0,
            elapsed_ms=float(data["ms"]),
        )
