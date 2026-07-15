@echo off
title RVD Autônoma
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\iniciar-rvd-autonoma.ps1"
pause
