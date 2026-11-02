"""FastAPI application exposing the ReDoS-proof DFA security filter.

Routes
------
GET  /api/health      -- liveness probe
POST /api/compile     -- regex -> NFA -> DFA (transition matrix + accepting states)
POST /api/benchmark   -- run the DFA engine and the vulnerable engine side by side
POST /api/match       -- the WAF filter itself: does this payload pass?
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .regex_parser import RegexSyntaxError
from .schemas import (
    BenchmarkRequest,
    BenchmarkResponse,
    CompileRequest,
    CompileResponse,
    HealthResponse,
    MatchRequest,
    MatchResponse,
)
from .service import PatternCache, benchmark_payload, compile_payload, match_payload
from .thompson import MAX_REPEAT_EXPANSION

VERSION = "1.0.0"

app = FastAPI(
    title="ReDoS-Proof DFA Security Engine",
    description=(
        "Compiles regular expressions into deterministic finite automata via "
        "Thompson's construction and the Powerset algorithm, guaranteeing "
        "O(n) matching time and immunity to Regular Expression Denial of Service."
    ),
    version=VERSION,
)

# The frontend dev server runs on a different port during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = PatternCache(capacity=128)


@app.get("/api/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    """Liveness probe."""
    return HealthResponse(
        status="ok",
        version=VERSION,
        patterns_compiled=len(cache),
    )


@app.post("/api/compile", response_model=CompileResponse, tags=["compiler"])
def compile_regex(request: CompileRequest) -> dict:
    """Compile a regex into a strict DFA.

    Returns the full transition matrix, the accepting states, the intermediate
    epsilon-NFA, the AST and any ReDoS warnings detected in the source pattern.
    """
    try:
        return compile_payload(request.pattern, cache)
    except RegexSyntaxError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"could not compile: {exc}") from exc
    except RecursionError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "pattern is too deeply nested to compile; the expansion limit is "
                f"{MAX_REPEAT_EXPANSION} repetitions"
            ),
        ) from exc


@app.post("/api/benchmark", response_model=BenchmarkResponse, tags=["benchmark"])
def benchmark(request: BenchmarkRequest) -> dict:
    """Measure the DFA engine against a vulnerable backtracking engine.

    Payload lengths default to a geometric series so that an exponential curve
    is visible on a readable axis.
    """
    if request.max_length < request.min_length:
        raise HTTPException(
            status_code=400, detail="max_length must be >= min_length"
        )
    if request.lengths is not None:
        if any(length < 0 for length in request.lengths):
            raise HTTPException(
                status_code=400, detail="payload lengths must be non-negative"
            )
    try:
        return benchmark_payload(
            pattern=request.pattern,
            prefix=request.prefix,
            suffix=request.suffix,
            lengths=request.lengths,
            min_length=request.min_length,
            max_length=request.max_length,
            step_budget=request.step_budget,
            native_timeout_ms=request.native_timeout_ms,
            include_native=request.include_native,
            cache=cache,
        )
    except RegexSyntaxError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RecursionError as exc:
        raise HTTPException(
            status_code=400, detail="pattern is too deeply nested to compile"
        ) from exc


@app.post("/api/match", response_model=MatchResponse, tags=["filter"])
def match(request: MatchRequest) -> dict:
    """The WAF filter: test a payload against a compiled pattern.

    This endpoint is O(n) in the payload length for *any* pattern -- there is no
    backtracking path to exploit.
    """
    try:
        return match_payload(request.pattern, request.text, cache)
    except RegexSyntaxError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
