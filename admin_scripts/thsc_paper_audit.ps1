param(
    [Parameter(Mandatory = $true)]
    [string]$PDFTemplateCode,
    [Parameter(Mandatory = $true)]
    [int]$Year = 2025,
    [string]$TitleFilter = "",

    [switch]$UploadMissing,
	[switch]$PrintURL
)


$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if ($PrintURL -and $UploadMissing) {
    throw "-PrintURL cannot be used with -UploadMissing."
}

$Params = Get-Content ".\config_files\$PDFTemplateCode.json" -Raw |
    ConvertFrom-Json

$PapersFile = $Params.PapersFile
$Content = Get-Content $PapersFile -Raw -Encoding UTF8

# Match the paper ID and year using regex only.
$Pattern = '<a\s+href="#v"\s+onClick="pdf\(this,\s*' +
    [regex]::Escape([string]$PDFTemplateCode) +
    '\)"[^>]*>(?<titlex>[^<]*' +
    [regex]::Escape([string]$Year) +
    '[^<]*)</a>'

$AnchorMatches = [regex]::Matches(
    $Content,
    $Pattern,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

# Collect papers that need uploading.
$MissingPapers = @{}

foreach ($Match in $AnchorMatches) {
    $titlex = $Match.Groups["titlex"].Value.Trim()

    if ($TitleFilter) {
        $FilterPattern = [regex]::Escape($TitleFilter) -replace '\\\s+', '\s*'

        if ($titlex -notmatch $FilterPattern) {
            continue
        }
    }

    $EncodedTitle = [uri]::EscapeDataString($titlex)
    $Uri = "https://www.thsconline.net/api/v1/getmetadata/$PDFTemplateCode/$EncodedTitle"

	if ($PrintURL) {
		Write-Output $Uri
		continue
	}
    try {
        $Response = Invoke-RestMethod `
            -Uri $Uri `
            -Method Get `
            -ErrorAction Stop

        $FragmentCount = [int]$Response.fragmentcount
        $Output = "$titlex | fragmentcount: $FragmentCount"

        if ($FragmentCount -eq 0) {
            Write-Host $Output -ForegroundColor Red

            if ($UploadMissing) {
                $Key = "$titlex|$PDFTemplateCode"
                $MissingPapers[$Key] = [PSCustomObject]@{
                    Title      = $titlex
                    Collection = ([string]$PDFTemplateCode).Trim()
                }
            }
        }
        elseif ($FragmentCount -gt 0) {
            Write-Host $Output -ForegroundColor Green
        }
        else {
            Write-Host $Output -ForegroundColor Yellow
        }
    }
    catch {
        Write-Warning "API request failed for '$titlex': $($_.Exception.Message)"
    }
}

if (!$UploadMissing) {
    return
}

if ($MissingPapers.Count -eq 0) {
    Write-Host "No missing papers to add to feed.atom."
    return
}

# Load the feed.
$FeedFile = Join-Path (Split-Path $PSScriptRoot -Parent) "feed.atom"

if (!(Test-Path $FeedFile)) {
    throw "feed.atom was not found at $FeedFile"
}

[xml]$FeedXml = Get-Content -Raw -Encoding UTF8 $FeedFile
$Feed = $FeedXml.feed

if ($null -eq $Feed) {
    throw "feed.atom does not contain a <feed> element."
}

$FeedChanged = $false
$BatchUpdated = (Get-Date).ToUniversalTime()
$UpdatedText = $BatchUpdated.ToString("yyyy-MM-ddTHH:mm:ssZ")

foreach ($Missing in $MissingPapers.Values) {
    $PKeyTitle = ([string]$Missing.Title).Trim()
    $PKeyCollection = ([string]$Missing.Collection).Trim()

    $ExistingEntry = @(
        $Feed.entry |
            Where-Object {
                ([string]$_.title).Trim() -eq $PKeyTitle -and
                ([string]$_.collection).Trim() -eq $PKeyCollection
            }
    ) | Select-Object -First 1

    if ($null -eq $ExistingEntry) {
        # Add a new feed entry.
        $Entry = $FeedXml.CreateElement("entry")

        $Title = $FeedXml.CreateElement("title")
        $Title.InnerText = $PKeyTitle

        $Collection = $FeedXml.CreateElement("collection")
        $Collection.InnerText = $PKeyCollection

        $Updated = $FeedXml.CreateElement("updated")
        $Updated.InnerText = $UpdatedText

        $Entry.AppendChild($Title) | Out-Null
        $Entry.AppendChild($Collection) | Out-Null
        $Entry.AppendChild($Updated) | Out-Null
        $Feed.AppendChild($Entry) | Out-Null

        Write-Host "Added to feed: $PKeyTitle" -ForegroundColor Cyan
        $FeedChanged = $true
    }
    else {
        # Refresh the timestamp to trigger processing again.
        $ExistingEntry.updated = $UpdatedText

        Write-Host "Refreshed feed entry: $PKeyTitle" -ForegroundColor Cyan
        $FeedChanged = $true
    }
}

if ($FeedChanged) {
    $Feed.updated = $UpdatedText

    $Settings = New-Object System.Xml.XmlWriterSettings
    $Settings.Encoding = New-Object System.Text.UTF8Encoding($false)
    $Settings.Indent = $true

    $Writer = [System.Xml.XmlWriter]::Create($FeedFile, $Settings)

    try {
        $FeedXml.Save($Writer)
    }
    finally {
        $Writer.Close()
    }

    Write-Host "feed.atom updated with $($MissingPapers.Count) missing paper(s)." `
        -ForegroundColor Green
}
else {
    Write-Host "feed.atom unchanged."
}