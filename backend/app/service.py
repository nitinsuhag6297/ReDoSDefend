"""Service layer: the pipeline the API routes call into.

Pipeline:  pattern -> AST -> epsilon-NFA (Thompson) -> DFA (Powerset) -> matcher
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict, Optional

from .benchmark import PayloadSpec, run_benchmark
from .dfa import DFA, build_dfa
from .engines import DFAEngine
from .regex_parser import (
    Node,
    ast_summary,
    find_redos_patterns,
    parse,
)
from .thompson import NFA, build_nfa


@dataclass
class CompiledPattern:
    pattern: str
    node: Node
    nfa: NFA
    dfa: DFA
    compile_ms: float


class PatternCache:
    """LRU-ish cache of compiled patterns (compiled patterns are immutable)."""

    def __init__(self, capacity: int = 64):
        self.capacity = capacity
        self._store: Dict[str, CompiledPattern] = {}
        self._order: list[str] = []

    def get_or_compile(self, pattern: str) -> CompiledPattern:
        if pattern in self._store:
            self._order.remove(pattern)
            self._order.append(pattern)
            return self._store[pattern]

        t0 = time.perf_counter()
        node = parse(pattern)
        nfa = build_nfa(node)
        dfa = build_dfa(nfa)
        compile_ms = (time.perf_counter() - t0) * 1000.0
        compiled = CompiledPattern(pattern, node, nfa, dfa, compile_ms)

        self._store[pattern] = compiled
        self._order.append(pattern)
        if len(self._order) > self.capacity:
            oldest = self._order.pop(0)
            self._store.pop(oldest, None)
        return compiled

    def __len__(self) -> int:
        return len(self._store)


def default_lengths(min_length: int, max_length: int) -> list[int]:
    """A geometric series of payload lengths.

    Geometric growth is what makes an exponential curve visible: with a linear
    ramp, 2^n would blow past any readable axis long before the DFA line
    finishes.
    """
    lengths = []
    n = min_length
    while n <= max_length:
        lengths.append(n)
        n = max(n + 1, int(n * 2))
    if lengths[-1] != max_length:
        lengths.append(max_length)
    return lengths


def compile_payload(pattern: str, cache: PatternCache) -> dict:
    """Build the JSON payload for POST /api/compile."""
    compiled = cache.get_or_compile(pattern)
    dfa = compiled.dfa
    # The trap state (empty NFA subset) is the dead state: it is non-accepting
    # and loops to itself on every symbol.
    trap_state = next(
        (i for i, subset in enumerate(dfa.subsets) if not subset), None
    )
    return {
        "pattern": pattern,
        "alphabet": list(dfa.alphabet),
        "literals": sorted(dfa.literals),
        "start_state": dfa.start,
        "trap_state": trap_state,
        "states": [
            {
                "id": i,
                "accepting": dfa.accepting[i],
                "start": i == dfa.start,
                "trap": i == trap_state,
                "subset": list(dfa.subsets[i]),
            }
            for i in range(len(dfa.accepting))
        ],
        "transitions": dfa.transitions,
        "nfa": {
            "start": compiled.nfa.start,
            "accept": compiled.nfa.accept,
            "states": [
                {
                    "id": s.id,
                    "epsilon": sorted(s.eps),
                    "transitions": [
                        {
                            "label": cls.describe(),
                            "negated": cls.negated,
                            "to": sorted(targets),
                        }
                        for cls, targets in s.trans.items()
                    ],
                }
                for s in compiled.nfa.states
            ],
        },
        "ast": ast_summary(compiled.node),
        "redos_warnings": find_redos_patterns(compiled.node),
        "state_count": len(dfa.accepting),
        "nfa_state_count": len(compiled.nfa.states),
        "compile_ms": round(compiled.compile_ms, 3),
    }


def benchmark_payload(
    pattern: str,
    prefix: str,
    suffix: str,
    lengths: Optional[list[int]],
    min_length: int,
    max_length: int,
    step_budget: int,
    native_timeout_ms: float,
    include_native: bool,
    cache: PatternCache,
) -> dict:
    """Build the JSON payload for POST /api/benchmark."""
    compiled = cache.get_or_compile(pattern)
    use_lengths = lengths or default_lengths(min_length, max_length)
    spec = PayloadSpec(prefix=prefix, suffix=suffix, lengths=use_lengths)

    rows = run_benchmark(
        compiled.node,
        compiled.dfa,
        spec,
        pattern=pattern,
        step_budget=step_budget,
        native_timeout_ms=native_timeout_ms,
        include_native=include_native,
    )

    dfa_total = sum(r.dfa_ms for r in rows)
    bt_total = sum(r.backtrack_ms for r in rows)
    last = rows[-1] if rows else None
    verdict = _verdict(rows)
    return {
        "pattern": pattern,
        "rows": [
            {
                "length": r.length,
                "payload_preview": r.payload_preview,
                "dfa_ms": r.dfa_ms,
                "dfa_steps": r.dfa_steps,
                "dfa_matched": r.dfa_matched,
                "backtrack_ms": r.backtrack_ms,
                "backtrack_steps": r.backtrack_steps,
                "backtrack_matched": r.backtrack_matched,
                "backtrack_aborted": r.backtrack_aborted,
                "native_ms": r.native_ms,
                "native_matched": r.native_matched,
                "native_aborted": r.native_aborted,
                "speedup": r.speedup,
            }
            for r in rows
        ],
        "dfa_state_count": len(compiled.dfa.accepting),
        "totals": {
            "dfa_total_ms": round(dfa_total, 3),
            "backtrack_total_ms": round(bt_total, 3),
            "aggregate_speedup": round(bt_total / dfa_total, 2) if dfa_total > 0 else None,
            "max_payload_length": last.length if last else 0,
            "max_backtrack_steps": max((r.backtrack_steps for r in rows), default=0),
            "max_dfa_steps": max((r.dfa_steps for r in rows), default=0),
        },
        "verdict": verdict,
    }


def _verdict(rows) -> str:
    if not rows:
        return "No benchmark rows were produced."
    last = rows[-1]
    growth = None
    if len(rows) >= 2 and rows[0].backtrack_steps > 0:
        growth = last.backtrack_steps / max(rows[0].backtrack_steps, 1)
    aborted = any(r.backtrack_aborted for r in rows)
    if aborted:
        return (
            f"The backtracking engine was aborted at n={last.length} after "
            f"{last.backtrack_steps:,} steps, while the DFA finished the same "
            f"payload in {last.dfa_steps} steps."
        )
    if growth and growth > 10:
        return (
            f"Backtracking steps grew {growth:.0f}x across the payload range "
            f"while DFA steps grew linearly (1 step per character)."
        )
    return (
        "This pattern is not catastrophically ambiguous; the backtracking engine "
        "stays roughly linear too. The DFA still guarantees a hard O(n) bound."
    )


def match_payload(pattern: str, text: str, cache: PatternCache) -> dict:
    """Build the JSON payload for POST /api/match."""
    compiled = cache.get_or_compile(pattern)
    engine = DFAEngine(compiled.dfa)
    result = engine.match(text)
    preview = text if len(text) <= 80 else text[:77] + "..."
    if result.matched:
        reason = "Payload matched the pattern and was allowed through."
    else:
        reason = "Payload did not match; rejected by the DFA filter."
    return {
        "pattern": pattern,
        "text_preview": preview,
        "allowed": bool(result.matched),
        "reason": reason,
        "dfa_steps": result.steps,
        "elapsed_ms": round(result.elapsed_ms, 4),
        "dfa_state_count": len(compiled.dfa.accepting),
    }
