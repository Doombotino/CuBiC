@echo off
echo Starting CuBiC Game Server...
echo.
echo Trying Python...
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python found! Starting server on http://localhost:8000
    echo.
    echo Open your browser to: http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
    goto :end
)

py --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python found! Starting server on http://localhost:8000
    echo.
    echo Open your browser to: http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    py -m http.server 8000
    goto :end
)

echo Python not found. Trying Node.js...
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Node.js found! Installing http-server...
    npx http-server -p 8000 -c-1
    goto :end
)

echo.
echo ERROR: Neither Python nor Node.js found!
echo.
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
echo Or use VS Code with the "Live Server" extension.
echo.
pause

:end
