@echo off
rem First-time setup / change the website folder: checks Node.js, picks the site folder, puts the desktop icon.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0install.ps1"
