@echo off
rem Puts a "JasperPeng" admin icon on the desktop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make-shortcut.ps1"
pause
