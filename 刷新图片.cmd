@echo off
rem === Refresh image manifest / shua xin tu pian ===
rem Drop <slug>.png into assets\images\<section>\ then double-click this file.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "build.ps1"
echo.
pause
