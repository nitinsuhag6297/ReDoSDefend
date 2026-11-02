"""Pydantic request/response schemas for the WAF API."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# /api/compile
# --------------------------------------------------------------------------- #
class CompileRequest(BaseModel):
    pattern: str = Field(
        ...,
        min_length=1,
        max_length=512,
        description="Regular expression to compile into a strict DFA.",
        examples=["^(a+)+$"],
    )


class DFAStateOut(BaseModel):
    id: int
    accepting: bool
    start: bool
    trap: bool = Field(
        ..., description="True for the dead (trap) state -- the empty NFA subset."
    )
    subset: List[int] = Field(
        ..., description="The NFA states this DFA state represents."
    )


class CompileResponse(BaseModel):
    pattern: str
    alphabet: List[str]
    literals: List[str]
    start_state: int
    trap_state: Optional[int] = None
    states: List[DFAStateOut]
    transitions: List[dict]
    nfa: dict
    ast: dict
    redos_warnings: List[str]
    state_count: int
    nfa_state_count: int
    compile_ms: float


# --------------------------------------------------------------------------- #
# /api/benchmark
# --------------------------------------------------------------------------- #
class BenchmarkRequest(BaseModel):
    pattern: str = Field(..., min_length=1, max_length=512)
    prefix: str = Field("a", max_length=8, description="Repeated payload prefix.")
    suffix: str = Field("!", max_length=8, description="Non-matching payload suffix.")
    lengths: Optional[List[int]] = Field(
        None,
        description="Explicit payload lengths. If omitted, a geometric series is used.",
    )
    min_length: int = Field(8, ge=1, le=4096)
    max_length: int = Field(128, ge=1, le=65536)
    step_budget: int = Field(
        1_000_000, ge=1_000, le=50_000_000,
        description="Backtracking steps the vulnerable engine may take before abort.",
    )
    native_timeout_ms: float = Field(250.0, ge=10.0, le=10000.0)
    include_native: bool = Field(
        True, description="Also time Python's own `re` module on the same payloads."
    )


class BenchmarkRowOut(BaseModel):
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


class BenchmarkResponse(BaseModel):
    pattern: str
    rows: List[BenchmarkRowOut]
    dfa_state_count: int
    totals: dict
    verdict: str


# --------------------------------------------------------------------------- #
# /api/match  (the actual WAF filter endpoint)
# --------------------------------------------------------------------------- #
class MatchRequest(BaseModel):
    pattern: str = Field(..., min_length=1, max_length=512)
    text: str = Field(..., max_length=100_000)


class MatchResponse(BaseModel):
    pattern: str
    text_preview: str
    allowed: bool
    reason: str
    dfa_steps: int
    elapsed_ms: float
    dfa_state_count: int


# --------------------------------------------------------------------------- #
# /api/health
# --------------------------------------------------------------------------- #
class HealthResponse(BaseModel):
    status: str
    version: str
    patterns_compiled: int
