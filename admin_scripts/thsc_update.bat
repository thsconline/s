@ECHO OFF
CD %~dp0

powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode AllAvailable
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_trueup_feed.ps1
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_create_jsx.ps1

powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 2718 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 2727 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 2728 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 5228 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 5238 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 5318 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 5328 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 5338 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_update_listing.ps1 -PDFTemplateCode 5348 -SkipFeed
powershell.exe -ExecutionPolicy Bypass -File .\thsc_paper_create_jsx.ps1
pause