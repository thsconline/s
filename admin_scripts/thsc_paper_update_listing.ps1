#### Powershell Script Copyright 2024-12-28 thsconline. Not covered under MIT license.
Param (
    [Parameter(Mandatory=$true)]
    $PDFTemplateCode
)

$host.ui.RawUI.WindowTitle = "thsconline admin script $PDFTemplateCode"
chdir $PSScriptRoot
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

. .\ForEach-Parallel.ps1

if ($PDFTemplateCode -eq "AllAvailable") {

    $host.UI.RawUI.WindowTitle = "thsconline admin script $PDFTemplateCode"

    Set-Location $PSScriptRoot
    chdir $PSScriptRoot

    $ErrorActionPreference = "Stop"
    $ProgressPreference = "SilentlyContinue"

    $TemplateGroups = Get-ChildItem ".\config_files\*.json" |
        ForEach-Object {
            $_.BaseName
        } |
        Group-Object {
            if ($_.Length -ge 3) {
                $_.Substring(0,3)
            }
            else {
                $_
            }
        }

    $TemplateGroups | ForEach-Parallel -MaxRunspaces 6 -ArgumentList $PSScriptRoot -ScriptBlock {

        $group = $_.Group
        $scriptRoot = $0

        $ProgressPreference = 'SilentlyContinue'

        foreach ($template in $group) {
            Write-Host -ForegroundColor Magenta "Running template $template"

            & (Join-Path $scriptRoot "thsc_paper_update_listing.ps1") `
                -PDFTemplateCode $template
        }
    }

    exit
}

try {
    $Params = (gc ".\config_files\$PDFTemplateCode.json" | ConvertFrom-Json)
}
catch {
    exit
}

## Add Dependencies, requires .NET 4.6.1

Add-Type -Path .\AngleSharp.dll -ErrorAction 'SilentlyContinue'
Add-Type -Path .\System.Text.Encoding.CodePages.dll -ErrorAction 'SilentlyContinue'
Add-Type -Path .\System.Buffers.dll -ErrorAction 'SilentlyContinue'
Add-Type -Path .\System.Runtime.CompilerServices.Unsafe.dll -ErrorAction 'SilentlyContinue'

## Set parameters for files

$DrivePath = $Params.DrivePath
$PapersFile = $Params.PapersFile
$IndexFile = "$(Split-Path -Path $PapersFile -Parent)\index.html"

$WithSolutionsSuffix = $Params.WithSolutionsSuffix
$WithoutSolutionsSuffix = $Params.WithoutSolutionsSuffix

## Get list of schools and papers

$Schools = (gci $DrivePath -Directory | sort name).name

$Papers = $Schools | % {
    (gci "$($DrivePath)\$($_)" | where {
        $_.name -match "[A-z ]{3,} (19|20)[0-9]{2} ($WithoutSolutionsSuffix|$WithSolutionsSuffix)"
    } | sort name).name
}

$PapersFormatted = (
    $Papers `
        -replace $WithSolutionsSuffix, "w. sol" `
        -replace $WithoutSolutionsSuffix, ""
).trim()

$PapersFileLeaf = "$(Split-Path -Path $PapersFile -Leaf)"

## Update papers HTML

$PapersHTMLBlob = gc -Encoding UTF8 $PapersFile
$PapersHTMLParser = New-Object AngleSharp.Html.Parser.HtmlParser
$PapersHTMLSitePage = $PapersHTMLParser.ParseDocument($PapersHTMLBlob)

$ContentAllBlock = $PapersHTMLSitePage.getElementById("content-all")
$TableBody = $ContentAllBlock.getElementsByTagName("table")[0].getElementsByTagName("tbody")[0]
$TableRows = $TableBody.getElementsByTagName("tr")

$TableRows | % {
    $_.Remove() | Out-Null
}

$Schools | % {
    $SchoolName = $_

    $PaperSet = $PapersFormatted | where {
        $_ -match "^$SchoolName (19|20)[0-9]{2}"
    }

    Write-Host -f Cyan "Processing papers for $($SchoolName)"

    $PaperSet

    if (($Paperset | Measure).count -eq 0) {
    }
    else {
        $PapersetA = "<tr><td><details open><summary>$($SchoolName)</summary><br />`r`n<span class=`"content`">`r`n"

        $PapersetB = (
            $Paperset `
                -replace "^(.*)", '<a>$1</a>' `
                -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
        ) -join "<br />" -replace "<br />", "<br />`r`n"

        switch($PDFTemplateCode) {
            "2718" {
                $PapersetB = (
                    $Paperset `
                        -replace "^(.*)", '<a>$1 P1</a>' `
                        -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
                ) -join "<br />" -replace "<br />", "<br />`r`n"
                break
            }

            "2727" {
                $PapersetB = (
                    $Paperset `
                        -replace "^(.*)", '<a>$1 P2 (Std.)</a>' `
                        -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
                ) -join "<br />" -replace "<br />", "<br />`r`n"
                break
            }

            "2728" {
                $PapersetB = (
                    $Paperset `
                        -replace "^(.*)", '<a>$1 P2 (Adv.)</a>' `
                        -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, $PDFTemplateCode)`">"
                ) -join "<br />" -replace "<br />", "<br />`r`n"
                break
            }

            "5218G" {
                $PapersetB = (
                    $Paperset `
                        -replace "^(.*)", '<a>$1</a>' `
                        -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, 5218)`">"
                ) -join "<br />" -replace "<br />", "<br />`r`n"
                break
            }

            "5318G" {
                $PapersetB = (
                    $Paperset `
                        -replace "^(.*)", '<a>$1</a>' `
                        -replace "<a>", "<a href=`"#v`" onClick=`"pdf(this, 5318)`">"
                ) -join "<br />" -replace "<br />", "<br />`r`n"
                break
            }

            default {
                break
            }
        }

        $PapersetC = "`r`n</span></details></td></tr>`r`n"
        $PapersetHTMLCode = $PapersetA + $PapersetB + $PapersetC

        $TableBody.InnerHTML += $PapersetHTMLCode
    }
}

$WriteableHTML =
    $TableBody.InnerHTML.trim() `
        -replace "^<tr.*gskip.*/tr>","" `
        -replace "<!--.*-->", "" `
        -replace "<br>","<br />" `
        -replace "onclick", "onClick"

$WriteableHTMLBlob = $WriteableHTML -split "`n"

$StartContentAnchor =
    ($PapersHTMLBlob |
        select-string "<!-- BEGIN CONTENT $($PDFTemplateCode) --->").linenumber - 1

$EndContentAnchor =
    ($PapersHTMLBlob |
        select-string "<!-- END CONTENT $($PDFTemplateCode) --->").linenumber - 1

$EndAnchor = ($PapersHTMLBlob | measure).count - 1

$NewHTMLBlob =
    $PapersHTMLBlob[0..$StartContentAnchor] +
    $WriteableHTML.trim() +
    $PapersHTMLBlob[$EndContentAnchor..$EndAnchor]

Set-Content -Encoding UTF8 $PapersFile -Value $NewHTMLBlob

## Update index

if($Params.UpdateIndex) {

    $UpdatedPapersHTMLBlob = gc -Encoding UTF8 $PapersFile

    $IndexHTMLBlob = gc -Encoding UTF8 $IndexFile
    $IndexHTMLParser = New-Object AngleSharp.Html.Parser.HtmlParser
    $IndexHTMLSitePage = $IndexHTMLParser.ParseDocument($IndexHTMLBlob)

    $CurrentCount =
        ($IndexHtmlsitepage.getElementById("content-all").getElementsByTagName("a") |
            where {$_.pathname -eq "/$($PapersFileLeaf)"}
        ).NextElementSibling.NextElementSibling.TextContent

    switch($PDFTemplateCode) {

        "2718" {
            $TotalCount =
                ($UpdatedPapersHTMLBlob |
                    select-string "20(19|2[0-9]) P1<"
                ).count

            $CurrentCountE = $CurrentCount.split("\+")[0].trim()
            $NewCount = "$($TotalCount) papers online"
            $NewIndexHTMLBlob = $IndexHTMLBlob -replace $CurrentCountE,$NewCount

            Set-Content -Encoding UTF8 $IndexFile -Value $NewIndexHTMLBlob
            break
        }

        "2727" {
            $TotalCount =
                ($UpdatedPapersHTMLBlob |
                    select-string "P2 \(Std.\)<"
                ).count

            $CurrentCountE = $CurrentCount.split("\+")[0].trim()
            $NewCount = "$($TotalCount) papers online"
            $NewIndexHTMLBlob = $IndexHTMLBlob -replace $CurrentCountE,$NewCount

            Set-Content -Encoding UTF8 $IndexFile -Value $NewIndexHTMLBlob
            break
        }

        "2728" {
            $TotalCount =
                ($UpdatedPapersHTMLBlob |
                    select-string "P2 \(Adv.\)<"
                ).count

            $CurrentCountE = $CurrentCount.split("\+")[0].trim()
            $NewCount = "$($TotalCount) papers online"
            $NewIndexHTMLBlob = $IndexHTMLBlob -replace $CurrentCountE,$NewCount

            Set-Content -Encoding UTF8 $IndexFile -Value $NewIndexHTMLBlob
            break
        }

        default {

            $TotalCount =
                ($UpdatedPapersHTMLBlob |
                    select-string "pdf"
                ).count

            $WSOLCount =
                ($UpdatedPapersHTMLBlob |
                    select-string " w. sol"
                ).count

            $NewCount =
                "$($TotalCount) papers online, $($WSOLCount) w. sol"

            if($WSOLCount -eq 0) {
                $NewCount =
                    "$($TotalCount) papers online"
            }

            $NewIndexHTMLBlob =
                $IndexHTMLBlob -replace $CurrentCount,$NewCount

            Set-Content -Encoding UTF8 $IndexFile -Value $NewIndexHTMLBlob
            break
        }
    }
}

## Update feed.atom

$FeedFile = Join-Path (Split-Path $PSScriptRoot -Parent) "feed.atom"


if (!(Test-Path $FeedFile)) {
    throw "feed.atom was not found at $FeedFile"
}

[xml]$FeedXml = Get-Content -Raw -Encoding UTF8 $FeedFile
$Feed = $FeedXml.feed
$FeedChanged = $false

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

    $ExistingEntry = @(
        $Feed.entry |
            Where-Object {
                $_.title -eq $DisplayTitle -and
                $_.collection -eq $PDFTemplateCode
            }
    ) | Select-Object -First 1

    $FileUpdated = $File.LastWriteTimeUtc

    if (-not $ExistingEntry) {

        $Entry = $FeedXml.CreateElement("entry")

        $Title = $FeedXml.CreateElement("title")
        $Title.InnerText = $DisplayTitle

        $Collection = $FeedXml.CreateElement("collection")
        $Collection.InnerText = $PDFTemplateCode

        $Updated = $FeedXml.CreateElement("updated")
        $Updated.InnerText =
            $FileUpdated.ToString("yyyy-MM-ddTHH:mm:ssZ")

        $Entry.AppendChild($Title) | Out-Null
        $Entry.AppendChild($Collection) | Out-Null
        $Entry.AppendChild($Updated) | Out-Null

        $Feed.AppendChild($Entry) | Out-Null

        $FeedChanged = $true

        Write-Host -ForegroundColor Green `
            "Added feed entry: $DisplayTitle"
    }
    else {

        try {
            $ExistingUpdated =
                [DateTime]::Parse(
                    $ExistingEntry.updated
                ).ToUniversalTime()
        }
        catch {
            $ExistingUpdated =
                [DateTime]::MinValue.ToUniversalTime()
        }

        if ($FileUpdated -gt $ExistingUpdated) {

            $ExistingEntry.updated =
                $FileUpdated.ToString(
                    "yyyy-MM-ddTHH:mm:ssZ"
                )

            $FeedChanged = $true

            Write-Host -ForegroundColor Yellow `
                "Updated feed entry: $DisplayTitle"
        }
    }
}

if ($FeedChanged) {

    $Feed.updated =
        (Get-Date).ToUniversalTime().ToString(
            "yyyy-MM-ddTHH:mm:ssZ"
        )

    $Settings =
        New-Object System.Xml.XmlWriterSettings

    $Settings.Encoding =
        New-Object System.Text.UTF8Encoding($false)

    $Settings.Indent = $true

    $Writer =
        [System.Xml.XmlWriter]::Create(
            $FeedFile,
            $Settings
        )

    $FeedXml.Save($Writer)
    $Writer.Close()

    Write-Host -ForegroundColor Green `
        "feed.atom updated."
}
else {
    Write-Host `
        "No new or modified papers detected. feed.atom unchanged."
}

## Run a sync in Github Desktop / Git client to update in production.