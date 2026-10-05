#### Powershell Script Copyright 2024-12-28 thsconline. Not covered under MIT license.
Param (
    [Parameter(Mandatory=$true)]
    $PDFTemplateCode,

    [switch]$StageOnly
)

$host.ui.RawUI.WindowTitle = "thsconline admin script $PDFTemplateCode"
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

. .\ForEach-Parallel.ps1

if ($PDFTemplateCode -eq "AllAvailable") {
    $host.UI.RawUI.WindowTitle = "thsconline admin script AllAvailable"
    $TemplateGroups = Get-ChildItem ".\config_files\*.json" |
        ForEach-Object { $_.BaseName } |
        Group-Object {
            if ($_.Length -ge 3) { $_.Substring(0,3) } else { $_ }
        }

    Write-Host -ForegroundColor Cyan "Staging all templates..."

    $StagedUpdates = @(
        $TemplateGroups | ForEach-Parallel -MaxRunspaces 6 -ArgumentList $PSScriptRoot -ScriptBlock {
            $group = $_.Group
            $scriptRoot = $0
            $ProgressPreference = "SilentlyContinue"

            foreach ($template in $group) {
                Write-Host -ForegroundColor Magenta "Staging template $template"
                & (Join-Path $scriptRoot "thsc_paper_update_listing.ps1") `
                    -PDFTemplateCode $template `
                    -StageOnly
            }
        }
    )

    Write-Host ""
    Write-Host -ForegroundColor Cyan "Committing staged changes..."

    foreach ($Update in $StagedUpdates) {
        if ($null -eq $Update) { continue }

        if ($Update.PapersFilePath -and $null -ne $Update.PapersFileContent) {
            Set-Content -Encoding UTF8 `
                -Path $Update.PapersFilePath `
                -Value $Update.PapersFileContent

            Write-Host -ForegroundColor Green `
                "Updated $($Update.PapersFilePath)"
        }
    }

    foreach ($Update in $StagedUpdates) {
        if ($null -eq $Update) { continue }

        if ($Update.IndexFilePath -and $null -ne $Update.IndexFileContent) {
            Set-Content -Encoding UTF8 `
                -Path $Update.IndexFilePath `
                -Value $Update.IndexFileContent

            Write-Host -ForegroundColor Green `
                "Updated $($Update.IndexFilePath)"
        }
    }

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

    foreach ($Update in $StagedUpdates) {
        if ($null -eq $Update) { continue }

        foreach ($FeedUpdate in @($Update.FeedUpdates)) {
            if ($null -eq $FeedUpdate) { continue }

            $PKeyTitle = ([string]$FeedUpdate.Title).Trim()
            $PKeyCollection = ([string]$FeedUpdate.Collection).Trim()

            $ExistingEntry = @(
                $Feed.entry |
                    Where-Object {
                        ([string]$_.title).Trim() -eq $PKeyTitle -and
                        ([string]$_.collection).Trim() -eq $PKeyCollection
                    }
            ) | Select-Object -First 1

            $FileUpdated = [DateTime]$FeedUpdate.Updated

            if ($null -eq $ExistingEntry) {
                $Entry = $FeedXml.CreateElement("entry")

                $Title = $FeedXml.CreateElement("title")
                $Title.InnerText = $PKeyTitle

                $Collection = $FeedXml.CreateElement("collection")
                $Collection.InnerText = $PKeyCollection

                $Updated = $FeedXml.CreateElement("updated")
                $Updated.InnerText = $FileUpdated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

                $Entry.AppendChild($Title) | Out-Null
                $Entry.AppendChild($Collection) | Out-Null
                $Entry.AppendChild($Updated) | Out-Null
                $Feed.AppendChild($Entry) | Out-Null

                $FeedChanged = $true

                Write-Host -ForegroundColor Green `
                    "Added feed entry: $PKeyTitle [$PKeyCollection]"
            }
            else {
                try {
                    $ExistingUpdated = [DateTime]::Parse(
                        [string]$ExistingEntry.updated
                    ).ToUniversalTime()
                }
                catch {
                    $ExistingUpdated = [DateTime]::MinValue.ToUniversalTime()
                }

                if ($FileUpdated.ToUniversalTime() -gt $ExistingUpdated) {
                    $ExistingEntry.updated =
                        $FileUpdated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

                    $FeedChanged = $true

                    Write-Host -ForegroundColor Yellow `
                        "Updated feed entry: $PKeyTitle [$PKeyCollection]"
                }
            }
        }
    }

    if ($FeedChanged) {
        $Feed.updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

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

        Write-Host -ForegroundColor Green "feed.atom updated."
    }
    else {
        Write-Host "feed.atom unchanged."
    }

    Write-Host ""
    Write-Host -ForegroundColor Green "All templates staged and committed."
    exit
}

try {
    $Params = Get-Content ".\config_files\$PDFTemplateCode.json" |
        ConvertFrom-Json
}
catch {
    exit
}

Add-Type -Path .\AngleSharp.dll -ErrorAction SilentlyContinue
Add-Type -Path .\System.Text.Encoding.CodePages.dll -ErrorAction SilentlyContinue
Add-Type -Path .\System.Buffers.dll -ErrorAction SilentlyContinue
Add-Type -Path .\System.Runtime.CompilerServices.Unsafe.dll -ErrorAction SilentlyContinue

$DrivePath = $Params.DrivePath
$PapersFile = $Params.PapersFile
$IndexFile = "$(Split-Path -Path $PapersFile -Parent)\index.html"
$WithSolutionsSuffix = $Params.WithSolutionsSuffix
$WithoutSolutionsSuffix = $Params.WithoutSolutionsSuffix

$Schools = (Get-ChildItem $DrivePath -Directory | Sort-Object Name).Name

$Papers = $Schools | ForEach-Object {
    (Get-ChildItem "$DrivePath\$($_)" |
        Where-Object {
            $_.Name -match "[A-z ]{3,} (19|20)[0-9]{2} ($WithoutSolutionsSuffix|$WithSolutionsSuffix)"
        } |
        Sort-Object Name).Name
}

$PapersFormatted = (
    $Papers `
        -replace [regex]::Escape($WithSolutionsSuffix), "w. sol" `
        -replace [regex]::Escape($WithoutSolutionsSuffix), ""
).Trim()

$PapersFileLeaf = Split-Path -Path $PapersFile -Leaf

$PapersHTMLBlob = Get-Content -Encoding UTF8 $PapersFile
$PapersHTMLParser = New-Object AngleSharp.Html.Parser.HtmlParser
$PapersHTMLSitePage = $PapersHTMLParser.ParseDocument($PapersHTMLBlob)

$ContentAllBlock = $PapersHTMLSitePage.GetElementById("content-all")
$TableBody = $ContentAllBlock.GetElementsByTagName("table")[0].GetElementsByTagName("tbody")[0]
$TableRows = $TableBody.GetElementsByTagName("tr")

$TableRows | ForEach-Object {
    $_.Remove() | Out-Null
}

$Schools | ForEach-Object {
    $SchoolName = $_
    $PaperSet = $PapersFormatted | Where-Object {
        $_ -match "^$([regex]::Escape($SchoolName)) (19|20)[0-9]{2}"
    }

    Write-Host -ForegroundColor Cyan "Processing papers for $SchoolName"

    if (($PaperSet | Measure-Object).Count -eq 0) {
        return
    }

    $PapersetA = "<tr><td><details open><summary>$SchoolName</summary><br />`r`n<span class=`"content`">`r`n"

    $PapersetB = (
        $PaperSet |
            ForEach-Object { "<a>$_</a>" } |
            ForEach-Object {
                $_ -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
            }
    ) -join "<br />`r`n"

    switch ($PDFTemplateCode) {
        "2718" {
            $PapersetB = (
                $PaperSet |
                    ForEach-Object { "<a>$_ P1</a>" } |
                    ForEach-Object {
                        $_ -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
                    }
            ) -join "<br />`r`n"
        }
        "2727" {
            $PapersetB = (
                $PaperSet |
                    ForEach-Object { "<a>$_ P2 (Std.)</a>" } |
                    ForEach-Object {
                        $_ -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
                    }
            ) -join "<br />`r`n"
        }
        "2728" {
            $PapersetB = (
                $PaperSet |
                    ForEach-Object { "<a>$_ P2 (Adv.)</a>" } |
                    ForEach-Object {
                        $_ -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
                    }
            ) -join "<br />`r`n"
        }
        "5218G" {
            $PapersetB = (
                $PaperSet |
                    ForEach-Object { "<a>$_</a>" } |
                    ForEach-Object {
                        $_ -replace "<a>", '<a href="#v" onClick="pdf(this, 5218)">'
                    }
            ) -join "<br />`r`n"
        }
        "5318G" {
            $PapersetB = (
                $PaperSet |
                    ForEach-Object { "<a>$_</a>" } |
                    ForEach-Object {
                        $_ -replace "<a>", '<a href="#v" onClick="pdf(this, 5318)">'
                    }
            ) -join "<br />`r`n"
        }
    }

    $PapersetC = "`r`n</span></details></td></tr>`r`n"
    $TableBody.InnerHTML += $PapersetA + $PapersetB + $PapersetC
}

$WriteableHTML = $TableBody.InnerHTML.Trim() `
    -replace "^<tr.*gskip.*/tr>", "" `
    -replace "<!--.*-->", "" `
    -replace "<br>", "<br />" `
    -replace "onclick", "onClick"

$StartContentAnchor = (
    $PapersHTMLBlob |
        Select-String "<!-- BEGIN CONTENT $($PDFTemplateCode) --->"
).LineNumber - 1

$EndContentAnchor = (
    $PapersHTMLBlob |
        Select-String "<!-- END CONTENT $($PDFTemplateCode) --->"
).LineNumber - 1

$EndAnchor = ($PapersHTMLBlob | Measure-Object).Count - 1

$NewHTMLBlob =
    $PapersHTMLBlob[0..$StartContentAnchor] +
    $WriteableHTML.Trim() +
    $PapersHTMLBlob[$EndContentAnchor..$EndAnchor]

$PapersFileContent = $NewHTMLBlob -join "`r`n"

$IndexFileContent = $null

if ($Params.UpdateIndex) {
    $UpdatedPapersHTMLBlob = $PapersFileContent -split "`r?`n"
    $IndexHTMLBlob = Get-Content -Encoding UTF8 $IndexFile
    $IndexHTMLParser = New-Object AngleSharp.Html.Parser.HtmlParser
    $IndexHTMLSitePage = $IndexHTMLParser.ParseDocument($IndexHTMLBlob)

    $IndexLink =
        $IndexHTMLSitePage.GetElementById("content-all").GetElementsByTagName("a") |
            Where-Object { $_.pathname -eq "/$PapersFileLeaf" } |
            Select-Object -First 1

    if ($null -eq $IndexLink) {
        throw "Could not find $PapersFileLeaf in index.html"
    }

    $CurrentCount =
        $IndexLink.NextElementSibling.NextElementSibling.TextContent

    switch ($PDFTemplateCode) {
        "2718" {
            $TotalCount = ($UpdatedPapersHTMLBlob | Select-String "20(19|2[0-9]) P1<").Count
            $CurrentCountE = $CurrentCount.Split("\+")[0].Trim()
            $NewCount = "$TotalCount papers online"
            $IndexFileContent = $IndexHTMLBlob -replace [regex]::Escape($CurrentCountE), $NewCount
        }
        "2727" {
            $TotalCount = ($UpdatedPapersHTMLBlob | Select-String "P2 \(Std.\)<").Count
            $CurrentCountE = $CurrentCount.Split("\+")[0].Trim()
            $NewCount = "$TotalCount papers online"
            $IndexFileContent = $IndexHTMLBlob -replace [regex]::Escape($CurrentCountE), $NewCount
        }
        "2728" {
            $TotalCount = ($UpdatedPapersHTMLBlob | Select-String "P2 \(Adv.\)<").Count
            $CurrentCountE = $CurrentCount.Split("\+")[0].Trim()
            $NewCount = "$TotalCount papers online"
            $IndexFileContent = $IndexHTMLBlob -replace [regex]::Escape($CurrentCountE), $NewCount
        }
        default {
            $TotalCount = ($UpdatedPapersHTMLBlob | Select-String "pdf").Count
            $WSOLCount = ($UpdatedPapersHTMLBlob | Select-String " w. sol").Count
            if ($WSOLCount -eq 0) {
                $NewCount = "$TotalCount papers online"
            }
            else {
                $NewCount = "$TotalCount papers online, $WSOLCount w. sol"
            }
            $IndexFileContent = $IndexHTMLBlob -replace [regex]::Escape($CurrentCount), $NewCount
        }
    }
}

$FeedUpdates = @()

$FeedPapers = $Schools | ForEach-Object {
    Get-ChildItem "$DrivePath\$($_)" -File |
        Where-Object {
            $_.Name -match "^[A-z ]{3,} (19|20)[0-9]{2} ($WithoutSolutionsSuffix|$WithSolutionsSuffix)$" -and
            $_.Name -match "\s(20(0[1-9]|1[0-9]|2[0-9]))\s"
        }
}

foreach ($File in $FeedPapers) {
    $DisplayTitle = (
        $File.Name `
            -replace [regex]::Escape($WithSolutionsSuffix), "w. sol" `
            -replace [regex]::Escape($WithoutSolutionsSuffix), ""
    ).Trim()

    $FeedUpdates += [PSCustomObject]@{
        Title = $DisplayTitle
        Collection = ([string]$PDFTemplateCode).Trim()
        Updated = $File.LastWriteTimeUtc
    }
}

if ($StageOnly) {
    [PSCustomObject]@{
        TemplateCode = $PDFTemplateCode
        PapersFilePath = $PapersFile
        PapersFileContent = $PapersFileContent
        IndexFilePath = if ($Params.UpdateIndex) { $IndexFile } else { $null }
        IndexFileContent = $IndexFileContent
        FeedUpdates = $FeedUpdates
    }
    exit
}

Set-Content -Encoding UTF8 -Path $PapersFile -Value $PapersFileContent

if ($Params.UpdateIndex -and $null -ne $IndexFileContent) {
    Set-Content -Encoding UTF8 -Path $IndexFile -Value $IndexFileContent
}

$FeedFile = Join-Path (Split-Path $PSScriptRoot -Parent) "feed.atom"

if (!(Test-Path $FeedFile)) {
    throw "feed.atom was not found at $FeedFile"
}

[xml]$FeedXml = Get-Content -Raw -Encoding UTF8 $FeedFile
$Feed = $FeedXml.feed
$FeedChanged = $false

foreach ($FeedUpdate in $FeedUpdates) {
    $PKeyTitle = ([string]$FeedUpdate.Title).Trim()
    $PKeyCollection = ([string]$FeedUpdate.Collection).Trim()

    $ExistingEntry = @(
        $Feed.entry |
            Where-Object {
                ([string]$_.title).Trim() -eq $PKeyTitle -and
                ([string]$_.collection).Trim() -eq $PKeyCollection
            }
    ) | Select-Object -First 1

    if ($null -eq $ExistingEntry) {
        $Entry = $FeedXml.CreateElement("entry")
        $Title = $FeedXml.CreateElement("title")
        $Title.InnerText = $PKeyTitle
        $Collection = $FeedXml.CreateElement("collection")
        $Collection.InnerText = $PKeyCollection
        $Updated = $FeedXml.CreateElement("updated")
        $Updated.InnerText = ([DateTime]$FeedUpdate.Updated).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

        $Entry.AppendChild($Title) | Out-Null
        $Entry.AppendChild($Collection) | Out-Null
        $Entry.AppendChild($Updated) | Out-Null
        $Feed.AppendChild($Entry) | Out-Null

        $FeedChanged = $true
    }
    else {
        try {
            $ExistingUpdated = [DateTime]::Parse([string]$ExistingEntry.updated).ToUniversalTime()
        }
        catch {
            $ExistingUpdated = [DateTime]::MinValue.ToUniversalTime()
        }

        if ([DateTime]$FeedUpdate.Updated -gt $ExistingUpdated) {
            $ExistingEntry.updated = ([DateTime]$FeedUpdate.Updated).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            $FeedChanged = $true
        }
    }
}

if ($FeedChanged) {
    $Feed.updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
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
    Write-Host -ForegroundColor Green "feed.atom updated."
}
else {
    Write-Host "feed.atom unchanged."
}
