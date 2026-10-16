@echo off
rem JasperPeng admin launcher: starts the local server (hidden) and opens the app window.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start.ps1"
