"""Differential test: the compiled DFA must agree with Python's `re` on
full-match semantics for every pattern and every generated string.

Run with:  python -m tests.test_dfa        (from the backend directory)
"""

from __future__ import annotations

import itertools
import re
import sys

from app.dfa import build_dfa, match_dfa
from app.regex_parser import parse
from app.thompson import build_nfa

# Patterns exercised, with a note on what each one is meant to cover.
PATTERNS = [
    "a",
    "ab",
    "a|b",
    "a|b|c",
    "a*",
    "a+",
    "a?",
    "a* b".replace(" ", ""),
    "(ab)*",
    "(a|b)*",
    "(a|ab)(c|bcd)",
    "a{2}",
    "a{2,}",
    "a{2,4}",
    "a{0,2}",
    "[abc]",
    "[a-c]+",
    "[^a-c]+",
    "[a-z0-9_]{3,10}",
    r"\d+",
    r"\w+",
    r"\s+",
    r"\D",
    r"\W",
    r"\S",
    r"a\.b",
    r"a\\b",
    ".",
    ".*",
    ".+",
    "(a+)+",
    "(a|aa)+",
    "^(a+)+$",
    "^abc$",
    "^$",
    "(ab|a)b?",
    "((a|b)*c)+",
    "a(bc|de)*f",
    "[^0-9]{2}",
    "(x+x+)+y",
]

# Alphabet used to generate test strings (kept small so coverage is dense).
ALPHABET = "abc019._x "
MAX_LEN = 4


def all_strings(alphabet: str, max_len: int):
    for length in range(max_len + 1):
        for combo in itertools.product(alphabet, repeat=length):
            yield "".join(combo)


def check_pattern(pattern: str, strings) -> tuple[int, list[str]]:
    node = parse(pattern)
    nfa = build_nfa(node)
    dfa = build_dfa(nfa)
    compiled = re.compile(pattern)

    mismatches: list[str] = []
    for text in strings:
        # Python's `fullmatch` mirrors the DFA engine's whole-string semantics.
        expected = compiled.fullmatch(text) is not None
        actual, _steps = match_dfa(dfa, text)
        if actual != expected:
            mismatches.append(f"{text!r}: dfa={actual} re={expected}")
    return len(strings), mismatches


def main() -> int:
    strings = list(all_strings(ALPHABET, MAX_LEN))
    total = 0
    failures: list[str] = []

    for pattern in PATTERNS:
        try:
            count, mismatches = check_pattern(pattern, strings)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{pattern!r}: raised {type(exc).__name__}: {exc}")
            continue
        total += count
        if mismatches:
            failures.append(f"{pattern!r}: {len(mismatches)} mismatches -> {mismatches[:4]}")

    print(f"Checked {total} (pattern, string) pairs across {len(PATTERNS)} patterns.")
    if failures:
        print(f"\n{len(failures)} FAILING patterns:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("All patterns agree with Python's `re`. DFA semantics verified.")
    return 0


def test_dfa_matches_python_re() -> None:
    """Every pattern must agree with Python's `re` on every generated string."""
    strings = list(all_strings(ALPHABET, MAX_LEN))
    failures: list[str] = []

    for pattern in PATTERNS:
        try:
            _count, mismatches = check_pattern(pattern, strings)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{pattern!r}: raised {type(exc).__name__}: {exc}")
            continue
        if mismatches:
            failures.append(f"{pattern!r}: {len(mismatches)} mismatches -> {mismatches[:4]}")

    assert not failures, "\n".join(failures)


if __name__ == "__main__":
    sys.exit(main())
