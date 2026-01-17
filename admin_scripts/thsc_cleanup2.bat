@ECHO OFF
CD %~dp0

powershell.exe -ExecutionPolicy Bypass -File .\thsc_cleanup2.ps1

pause