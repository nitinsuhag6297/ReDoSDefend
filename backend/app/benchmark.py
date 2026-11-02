"""Benchmark orchestration: run both engines over a growing payload family."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .dfa import DFA
from .engines import (
    DEFAULT_STEP_BUDGET,
    BacktrackingEngine,
    DFAEngine,
    NativeRegexEngine,
)
from .regex_parser import Node


@dataclass
class PayloadSpec:
    """How to build the attack payloads for a pattern."""

    prefix: str = "a"
    suffix: str = "!"
    lengths: List[int] = field(default_factory=list)
    description: str = "repeated prefix followed by a non-matching suffix"

    def build(self, length: int) -> str:
        return (self.prefix * length) + self.suffix


@dataclass
class BenchmarkRow:
    length: int
    payload_preview: str
    dfa_ms: float
    dfa_steps: int
    dfa_matched: Optional[bool]
    backtrack_ms: float
    backtrack_steps: int
    backtrack_matched: Optional[bool]
    backtrack_aborted: bool
    native_ms: Optional[float]
    native_matched: Optional[bool]
    native_aborted: bool
    speedup: Optional[float]


def run_benchmark(
    node: Node,
    dfa: DFA,
    spec: PayloadSpec,
    *,
    pattern: str = "",
    step_budget: int = DEFAULT_STEP_BUDGET,
    native_timeout_ms: float = 250.0,
    include_native: bool = True,
) -> List[BenchmarkRow]:
    """Run the DFA, the backtracking simulator and (optionally) native ``re``.

    Every row is a point on the complexity curve: payload length on X, time on Y.
    The DFA column is the flat line; the backtracking column is the curve that
    bends upwards.
    """
    dfa_engine = DFAEngine(dfa)
    backtrack_engine = BacktrackingEngine(node, step_budget=step_budget)
    native_engine: Optional[NativeRegexEngine] = None
    if include_native and pattern:
        try:
            native_engine = NativeRegexEngine(pattern, native_timeout_ms)
        except Exception:
            native_engine = None

    rows: List[BenchmarkRow] = []
    for length in spec.lengths:
        payload = spec.build(length)

        dfa_res = dfa_engine.match(payload)
        bt_res = backtrack_engine.match(payload)

        native_ms = None
        native_matched = None
        native_aborted = False
        if native_engine is not None:
            nat = native_engine.match(payload)
            native_ms = nat.elapsed_ms
            native_matched = nat.matched
            native_aborted = nat.aborted

        speedup = None
        if bt_res.elapsed_ms > 0:
            speedup = bt_res.elapsed_ms / dfa_res.elapsed_ms if dfa_res.elapsed_ms > 0 else None

        preview = payload if len(payload) <= 40 else payload[:37] + "..."

        rows.append(
            BenchmarkRow(
                length=length,
                payload_preview=preview,
                dfa_ms=round(dfa_res.elapsed_ms, 4),
                dfa_steps=dfa_res.steps,
                dfa_matched=dfa_res.matched,
                backtrack_ms=round(bt_res.elapsed_ms, 4),
                backtrack_steps=bt_res.steps,
                backtrack_matched=bt_res.matched,
                backtrack_aborted=bt_res.aborted,
                native_ms=round(native_ms, 4) if native_ms is not None else None,
                native_matched=native_matched,
                native_aborted=native_aborted,
                speedup=round(speedup, 2) if speedup else None,
            )
        )
    return rows
