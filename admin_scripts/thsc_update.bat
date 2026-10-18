@ECHO OFF
CD %~dp0

powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode AllAvailable
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_create_jsx.ps1
pause