@echo off
title ReDoS-Proof DFA Security Engine
echo ===================================================
echo Starting ReDoS-Proof DFA Security Engine...
echo ===================================================

echo Starting FastAPI Backend on http://127.0.0.1:8000...
start "WAF Backend Server" cmd /k "pushd "%~dp0backend" && python -m uvicorn app.main:app --port 8000"

echo Starting Vite Frontend on http://localhost:5173...
start "WAF Frontend Console" cmd /k "pushd "%~dp0frontend" && npm.cmd run dev"

echo.
echo Both servers started!
echo Open your browser at: http://localhost:5173
echo ===================================================
timeout /t 3 >nul
start http://localhost:5173
