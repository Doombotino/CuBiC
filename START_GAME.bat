@echo off
title CuBiC Game Server

echo.
echo ╔════════════════════════════════════════╗
echo ║        Starting CuBiC Server...       ║
echo ╚════════════════════════════════════════╝
echo.

cd /d "%~dp0"

"C:\Program Files\nodejs\node.exe" server.js

pause
