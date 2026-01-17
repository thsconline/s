@ECHO OFF
CD %~dp0

powershell.exe -ExecutionPolicy Bypass -File .\thsc_cleanup.ps1

pause