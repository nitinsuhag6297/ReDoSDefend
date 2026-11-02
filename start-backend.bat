@echo off
REM Start the FastAPI backend for the ReDoS-Proof DFA Security Engine.
pushd "%~dp0backend"
python -m uvicorn app.main:app --reload --port 8000
