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

# ---------------------------------------------------------
# Console progress
# ---------------------------------------------------------

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

    Write-Host -NoNewline (
        " {0,3}% ({1}/{2})" -f $Percent, $Current, $Total
    )
}

function Clear-ConsoleProgress {
    Write-Host -NoNewline (
        "`r" + (" " * [Console]::WindowWidth) + "`r"
    )
}

# ---------------------------------------------------------
# Discover templates
# ---------------------------------------------------------

$AllAvailable = $PDFTemplateCode -eq "AllAvailable"

if ($AllAvailable) {
    $ConfigDirectory = Join-Path $PSScriptRoot "config_files"

    if (!(Test-Path $ConfigDirectory -PathType Container)) {
        throw "Configuration directory was not found: $ConfigDirectory"
    }

    $Templates = @(
        Get-ChildItem -LiteralPath $ConfigDirectory -Filter "*.json" -File |
            Sort-Object Name |
            ForEach-Object { $_.BaseName }
    )

    if ($Templates.Count -eq 0) {
        throw "No template JSON files were found in $ConfigDirectory"
    }

    if (!$PrintURL) {
        Write-Host "Found $($Templates.Count) available templates."
    }
}
else {
    $ConfigFile = Join-Path $PSScriptRoot (
        "config_files\$PDFTemplateCode.json"
    )

    if (!(Test-Path $ConfigFile -PathType Leaf)) {
        throw "Template configuration was not found: $ConfigFile"
    }

    $Templates = @($PDFTemplateCode)
}

# ---------------------------------------------------------
# Worker: process one template
#
# Returns one object per template so that the parent
# runspace can update the progress bar safely.
# ---------------------------------------------------------

$Worker = {
    param(
        $ScriptRoot,
        $TargetYear,
        $Filter,
		$PrintURLMode
    )

    $Template = [string]$_
    $Results = [System.Collections.Generic.List[object]]::new()

    try {
        $ConfigFile = Join-Path $ScriptRoot (
            "config_files\$Template.json"
        )

        $Params = Get-Content -LiteralPath $ConfigFile -Raw |
            ConvertFrom-Json

        if ([string]::IsNullOrWhiteSpace([string]$Params.PapersFile)) {
            throw "PapersFile is missing from $ConfigFile"
        }

        $PapersFile = [string]$Params.PapersFile

        if (!(Test-Path -LiteralPath $PapersFile -PathType Leaf)) {
            # Also allow PapersFile paths relative to the script.
            $PapersFile = Join-Path $ScriptRoot $PapersFile
        }

        if (!(Test-Path -LiteralPath $PapersFile -PathType Leaf)) {
            throw "PapersFile was not found: $($Params.PapersFile)"
        }

        $Content = Get-Content -LiteralPath $PapersFile -Raw -Encoding UTF8

        $Pattern = '<a\s+href="#v"\s+onClick="pdf\(this,\s*' +
            [regex]::Escape($Template) +
            '\)"[^>]*>(?<titlex>[^<]*' +
            [regex]::Escape([string]$TargetYear) +
            '[^<]*)</a>'

        $AnchorMatches = [regex]::Matches(
            $Content,
            $Pattern,
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        foreach ($Match in $AnchorMatches) {
            $Title = $Match.Groups["titlex"].Value.Trim()

            if ($Filter) {
                $FilterPattern = [regex]::Escape($Filter) -replace '\\\s+', '\s*'

                if ($Title -notmatch $FilterPattern) {
                    continue
                }
            }

            $EncodedTitle = [uri]::EscapeDataString($Title)

            $Uri = "https://www.thsconline.net/api/v1/getmetadata/" +
                "$Template/$EncodedTitle"

            if ($PrintURLMode) {
                $Results.Add([PSCustomObject]@{
                    Template      = $Template
                    Title         = $Title
                    URL           = $Uri
                    FragmentCount = $null
                    Error         = $null
                })

                continue
            }

            try {
                $Response = Invoke-RestMethod `
                    -Uri $Uri `
                    -Method Get `
                    -ErrorAction Stop

                $FragmentCount = [int]$Response.fragmentcount

                $Results.Add([PSCustomObject]@{
                    Template      = $Template
                    Title         = $Title
                    URL           = $Uri
                    FragmentCount = $FragmentCount
                    Error         = $null
                })
            }
            catch {
                $Results.Add([PSCustomObject]@{
                    Template      = $Template
                    Title         = $Title
                    URL           = $Uri
                    FragmentCount = $null
                    Error         = $_.Exception.Message
                })
            }
        }

        [PSCustomObject]@{
            Template = $Template
            Results  = @($Results.ToArray())
            Error    = $null
        }
    }
    catch {
        [PSCustomObject]@{
            Template = $Template
            Results  = @()
            Error    = $_.Exception.Message
        }
    }
}

# ---------------------------------------------------------
# Process templates
# ---------------------------------------------------------

$MissingPapers = @{}
$Completed = 0
$Total = $Templates.Count

if ($AllAvailable -and !$PrintURL) {
    $ParallelScript = Join-Path $PSScriptRoot "ForEach-Parallel.ps1"

    if (!(Test-Path -LiteralPath $ParallelScript -PathType Leaf)) {
        throw "Parallel script was not found: $ParallelScript"
    }

    . $ParallelScript

    $TemplateResults = $Templates | ForEach-Parallel `
        -MaxRunspaces 6 `
        -ArgumentList $PSScriptRoot, $Year, $TitleFilter, ([bool]$PrintURL) `
        -ScriptBlock $Worker
}
else {
    $TemplateResults = foreach ($Template in $Templates) {
        $_ = $Template
        & $Worker $PSScriptRoot $Year $TitleFilter ([bool]$PrintURL)
    }
}

foreach ($TemplateResult in $TemplateResults) {
    $Completed++

    # Progress bar is only for sequential processing.
    if (!$AllAvailable -and !$PrintURL) {
        Set-ConsoleProgress `
            -Activity "Checking templates" `
            -Current $Completed `
            -Total $Total
    }

    if ($TemplateResult.Error) {
        if (!$AllAvailable -and !$PrintURL) {
            Clear-ConsoleProgress
        }

        Write-Warning (
            "Template '{0}' failed: {1}" -f
            $TemplateResult.Template,
            $TemplateResult.Error
        )
        continue
    }

    foreach ($Result in $TemplateResult.Results) {
        if ($PrintURL) {
            Write-Output $Result.URL
            continue
        }

        if ($Result.Error) {
            Write-Warning (
                "API request failed for '{0}' ({1}): {2}" -f
                $Result.Title,
                $Result.Template,
                $Result.Error
            )
            continue
        }

        $Output = "{0} | {1} | fragmentcount: {2}" -f
            $Result.Template,
            $Result.Title,
            $Result.FragmentCount

        if ($Result.FragmentCount -eq 0) {
            Write-Host $Output -ForegroundColor Red

            if ($UploadMissing) {
                $Key = "$($Result.Title)|$($Result.Template)"

                $MissingPapers[$Key] = [PSCustomObject]@{
                    Title      = $Result.Title
                    Collection = $Result.Template
                }
            }
        }
        elseif ($Result.FragmentCount -gt 0) {
            Write-Host $Output -ForegroundColor Green
        }
        else {
            Write-Host $Output -ForegroundColor Yellow
        }
    }
}

if (!$AllAvailable -and !$PrintURL) {
    Clear-ConsoleProgress
}

# ---------------------------------------------------------
# Finish if feed updates were not requested
# ---------------------------------------------------------

if (!$UploadMissing) {
    return
}

if ($MissingPapers.Count -eq 0) {
    Write-Host "No missing papers to add to feed.atom."
    return
}

# ---------------------------------------------------------
# Update feed.atom ONCE, after every template has finished
# ---------------------------------------------------------

$FeedFile = Join-Path (
    Split-Path $PSScriptRoot -Parent
) "feed.atom"

if (!(Test-Path -LiteralPath $FeedFile -PathType Leaf)) {
    throw "feed.atom was not found at $FeedFile"
}

[xml]$FeedXml = Get-Content -LiteralPath $FeedFile -Raw -Encoding UTF8
$Feed = $FeedXml.feed

if ($null -eq $Feed) {
    throw "feed.atom does not contain a <feed> element."
}

$Namespace = $FeedXml.DocumentElement.NamespaceURI
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
        $Entry = $FeedXml.CreateElement("entry", $Namespace)

        $Title = $FeedXml.CreateElement("title", $Namespace)
        $Title.InnerText = $PKeyTitle

        $Collection = $FeedXml.CreateElement("collection", $Namespace)
        $Collection.InnerText = $PKeyCollection

        $Updated = $FeedXml.CreateElement("updated", $Namespace)
        $Updated.InnerText = $UpdatedText

        $Entry.AppendChild($Title) | Out-Null
        $Entry.AppendChild($Collection) | Out-Null
        $Entry.AppendChild($Updated) | Out-Null
        $Feed.AppendChild($Entry) | Out-Null

        Write-Host (
            "Added to feed: {0} [{1}]" -f
            $PKeyTitle,
            $PKeyCollection
        ) -ForegroundColor Cyan

        $FeedChanged = $true
    }
    else {
        $ExistingEntry.updated = $UpdatedText

        Write-Host (
            "Refreshed feed entry: {0} [{1}]" -f
            $PKeyTitle,
            $PKeyCollection
        ) -ForegroundColor Cyan

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

    Write-Host (
        "feed.atom updated with $($MissingPapers.Count) missing paper(s)."
    ) -ForegroundColor Green
}
else {
    Write-Host "feed.atom unchanged."
}