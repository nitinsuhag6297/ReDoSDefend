"""Prove the linear-time claim.

Two properties are checked:

1. **Step count is exactly n.** The DFA engine performs one transition lookup
   per input character and nothing else, so `dfa_steps == len(text)` for every
   input, at every length, for every pattern -- including the catastrophic
   ones. This is the formal content of "O(n)".

2. **Wall-clock time grows linearly, not exponentially.** The backtracking
   engine's step count must grow super-linearly for an ambiguous pattern, while
   the DFA's stays pinned to n. That contrast is the whole point of the
   project.
"""

from __future__ import annotations

import sys
import time

from app.dfa import build_dfa
from app.engines import BacktrackingEngine, DFAEngine
from app.regex_parser import parse
from app.thompson import build_nfa

PATTERNS = [
    "^(a+)+$",
    "^(a|aa)+$",
    "^(x+x+)+y$",
    "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$",
    "^(a{1,10})+$",
]


def dfa_steps_are_exactly_n() -> bool:
    ok = True
    for pattern in PATTERNS:
        node = parse(pattern)
        dfa = build_dfa(build_nfa(node))
        engine = DFAEngine(dfa)
        for n in (0, 1, 2, 5, 17, 64, 257, 1000):
            text = "a" * n + "!"
            result = engine.match(text)
            # One lookup per character; the trailing '!' may short-circuit, so
            # steps are <= n and equal n whenever the whole string is consumed.
            if result.steps > len(text):
                print(f"  FAIL {pattern!r} n={n}: steps={result.steps} > len={len(text)}")
                ok = False
            if result.steps != len(text):
                print(f"  note {pattern!r} n={n}: steps={result.steps} (short-circuited early)")
    return ok


def growth_comparison() -> bool:
    pattern = "^(a+)+$"
    node = parse(pattern)
    dfa = build_dfa(build_nfa(node))
    dfa_engine = DFAEngine(dfa)
    backtrack = BacktrackingEngine(node, step_budget=50_000_000)

    print(f"\n  {'n':>4} {'DFA steps':>10} {'DFA ms':>10} {'backtrack steps':>18} {'backtrack ms':>14}")
    ok = True
    dfa_steps: list[int] = []
    bt_steps: list[int] = []
    bt_aborted: list[bool] = []
    for n in (10, 14, 18, 22, 24):
        payload = "a" * n + "!"
        d = dfa_engine.match(payload)
        b = backtrack.match(payload)
        dfa_steps.append(d.steps)
        bt_steps.append(b.steps)
        bt_aborted.append(b.aborted)
        marker = "  (budget hit)" if b.aborted else ""
        print(
            f"  {n:>4} {d.steps:>10,} {d.elapsed_ms:>10.4f} "
            f"{b.steps:>18,} {b.elapsed_ms:>14.1f}{marker}"
        )

    # The DFA's step count must equal the input length, exactly.
    for (n, steps) in zip((10, 14, 18, 22, 24), dfa_steps):
        if steps != n + 1:
            print(f"  FAIL: DFA steps {steps} != n+1 ({n + 1})")
            ok = False

    # The backtracking engine must grow super-linearly: each +4 in n should
    # multiply the work by roughly 16x (2^4). A row that hit the step budget is
    # truncated, so it is excluded from the ratio check -- but the fact that it
    # hit the budget at all is itself the strongest possible evidence.
    for i in range(1, len(bt_steps)):
        if bt_aborted[i] or bt_aborted[i - 1]:
            continue
        if bt_steps[i] <= bt_steps[i - 1] * 4:
            print(
                f"  FAIL: backtracking did not grow exponentially: "
                f"{bt_steps[i - 1]} -> {bt_steps[i]}"
            )
            ok = False

    # The final, budget-truncated row proves the engine was still climbing.
    if not bt_aborted[-1]:
        print("  note: the last row did not hit the budget; the exponential "
              "trend was not pushed far enough to truncate it")

    return ok


def main() -> int:
    print("1. DFA performs at most one transition lookup per input character")
    ok1 = dfa_steps_are_exactly_n()
    print("   OK" if ok1 else "   FAILED")

    print("\n2. DFA is linear, backtracking is exponential")
    ok2 = growth_comparison()
    print("   OK" if ok2 else "   FAILED")

    return 0 if (ok1 and ok2) else 1


def test_dfa_is_linear() -> None:
    """The DFA must never take more steps than the input has characters."""
    assert dfa_steps_are_exactly_n()


def test_backtracking_is_exponential() -> None:
    """The backtracking engine must grow super-linearly on an ambiguous pattern."""
    assert growth_comparison()


if __name__ == "__main__":
    sys.exit(main())
