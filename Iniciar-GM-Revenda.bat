@echo off
title Revenda Autônoma
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\iniciar-gm-revenda.ps1"
pause
