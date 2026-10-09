#Powershell Script Copyright 2024-12-28 thsconline. Not covered under MIT license.

Param (
[Parameter(Mandatory=$true)]
[int]$Year
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"


function Set-ConsoleProgress {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Activity,

        [Parameter(Mandatory = $true)]
        [int]$Current,

        [Parameter(Mandatory = $true)]
        [int]$Total
    )

    $Percent = if ($Total -le 0) {
        100
    }
    else {
        [math]::Min(100, [math]::Floor(($Current / $Total) * 100))
    }

    $Width = 30
    $Filled = [math]::Floor(($Percent / 100) * $Width)
    $Empty = $Width - $Filled

    Write-Host -NoNewline "`r$Activity "

    Write-Host -NoNewline (" " * $Filled) `
        -BackgroundColor Green

    Write-Host -NoNewline (" " * $Empty) `
        -BackgroundColor DarkGray

    Write-Host -NoNewline (" {0,3}% ({1}/{2})" -f $Percent, $Current, $Total)
}

function Clear-ConsoleProgress {
    Write-Host -NoNewline ("`r" + (" " * [Console]::WindowWidth) + "`r")
}


$FeedFile = Join-Path (Split-Path $PSScriptRoot -Parent) "feed.atom"

if (!(Test-Path $FeedFile)) {
throw "feed.atom was not found at $FeedFile"
}

if ($Year -lt 1900 -or $Year -gt 2100) {
throw "Year must be between 1900 and 2100."
}

$BackupFile = "$FeedFile.bak"

Write-Host "Loading $FeedFile..."

Copy-Item $FeedFile $BackupFile -Force

[xml]$FeedXml = Get-Content -Raw -Encoding UTF8 $FeedFile
$Feed = $FeedXml.feed

if ($null -eq $Feed) {
throw "feed.atom does not contain a <feed> root element."
}

$Now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$EntriesToRemove = @()
$EntriesToKeep = @()
$AllEntries = @($Feed.entry | Where-Object { $null -ne $_ })
$TotalEntries = $AllEntries.Count
$CurrentEntry = 0

foreach ($Entry in $AllEntries) {
    $CurrentEntry++

    Set-ConsoleProgress `
        -Activity "Cleaning feed" `
        -Current $CurrentEntry `
        -Total $TotalEntries

    $Title = ([string]$Entry.title).Trim()

    if ([string]::IsNullOrWhiteSpace($Title)) {
        continue
    }

    $YearMatch = [regex]::Match($Title, '(19|20)[0-9]{2}')

    if (!$YearMatch.Success) {
        continue
    }

    $PaperYear = [int]$YearMatch.Value

    if ($PaperYear -ne $Year) {
        $EntriesToRemove += $Entry
    }
    else {
        $Entry.updated = $Now
        $EntriesToKeep += $Entry
    }
}

Clear-ConsoleProgress

foreach ($Entry in $EntriesToRemove) {
    if ($null -ne $Entry.ParentNode) {
        $Entry.ParentNode.RemoveChild($Entry) | Out-Null
    }
}

$Feed.updated = $Now

$Settings = New-Object System.Xml.XmlWriterSettings
$Settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$Settings.Indent = $true

$Writer = [System.Xml.XmlWriter]::Create(
$FeedFile,
$Settings
)

try {
$FeedXml.Save($Writer)
}
finally {
$Writer.Close()
}

Write-Host ""
Write-Host -ForegroundColor Green "Feed cleanup complete."
Write-Host "Removed $($EntriesToRemove.Count) entries."
Write-Host "Updated $($EntriesToKeep.Count) entries to $Now."
Write-Host "Feed updated to $Now."
Write-Host "Backup: $BackupFile"