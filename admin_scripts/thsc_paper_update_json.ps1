#### Powershell Script Copyright 2026-05-24 thsconline. Not covered under MIT license.
Param (
    [Parameter(Mandatory=$true)]
    $PDFTemplateCode,

    [Parameter(Mandatory=$true)]
    $Subject
)

$host.ui.RawUI.WindowTitle = "thsconline admin script $PDFTemplateCode"
chdir $PSScriptRoot # change to current directory
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if ($PDFTemplateCode[3] -notin '0','5') {
    Write-Host "Skipping template $PDFTemplateCode" -ForegroundColor DarkGray
    return
}

. .\ForEach-Parallel.ps1

# =========================
# Dependencies
# =========================
Add-Type -Path .\AngleSharp.dll -ErrorAction SilentlyContinue
Add-Type -Path .\System.Text.Encoding.CodePages.dll -ErrorAction SilentlyContinue
Add-Type -Path .\System.Buffers.dll -ErrorAction SilentlyContinue
Add-Type -Path .\System.Runtime.CompilerServices.Unsafe.dll -ErrorAction SilentlyContinue

# =========================
# INPUT
# =========================
# Array of year pages
$x = @(

	@{ year = 2000; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2000exams/index.html" }
	@{ year = 2000; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2000exams/index2.html" }
	@{ year = 2000; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2000exams/index3.html" }
	@{ year = 2000; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2000exams/index4.html" }
	@{ year = 2001; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2001exams/index.html" }
	@{ year = 2001; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2001exams/index2.html" }
	@{ year = 2001; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2001exams/index3.html" }
	@{ year = 2001; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2001exams/index4.html" }
	@{ year = 2002; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2002exams/index.html" }
	@{ year = 2002; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2002exams/index2.html" }
	@{ year = 2002; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2002exams/index3.html" }
	@{ year = 2002; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2002exams/index4.html" }
	@{ year = 2003; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2003exams/index.html" }
	@{ year = 2003; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2003exams/index2.html" }
	@{ year = 2003; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2003exams/index3.html" }
	@{ year = 2003; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2003exams/index4.html" }
	@{ year = 2004; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2004exams/index.html" }
	@{ year = 2004; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2004exams/index2.html" }
	@{ year = 2004; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2004exams/index3.html" }
	@{ year = 2004; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2004exams/index4.html" }
	@{ year = 2005; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2005exams/index.html" }
	@{ year = 2005; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2005exams/index2.html" }
	@{ year = 2005; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2005exams/index3.html" }
	@{ year = 2005; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2005exams/index4.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index2.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index3.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index4.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index5.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index2.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index3.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index4.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index5.html" }	
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index2.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index3.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index4.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index5.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index2.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index3.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index4.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index5.html" }
    @{ year = 2010; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2010exams/index.html" }
    @{ year = 2011; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2011exams/index.html" }
    @{ year = 2012; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2012exams/index.html" }
    @{ year = 2013; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/2013/index.html" }
    @{ year = 2014; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/2014/index.html" }
    @{ year = 2015; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/2015/index.html" }
)


# =========================
# PARALLEL SCRAPE (PRESERVES PRE/POST 2013 LOGIC)
# =========================
$linklist = $x | ForEach-Parallel -MaxRunspaces 8 -ArgumentList $Subject, $PSScriptRoot -ScriptBlock {
	$ProgressPreference = "SilentlyContinue"
    $subject    = $0
    $scriptRoot = $1
    $item       = $_
	Write-Host -ForegroundColor DarkGray "Checking $($item.url)"
    Add-Type -Path (Join-Path $scriptRoot 'AngleSharp.dll') -ErrorAction SilentlyContinue
    $HTMLParser = New-Object AngleSharp.Html.Parser.HtmlParser

    try {
        $response = Invoke-WebRequest $item.url -MaximumRedirection 10 -UseBasicParsing
    }
    catch {
        return
    }

    $doc = $HTMLParser.ParseDocument($response.RawContent)
    $parentURL = ($item.url -replace "index.*\.html")

    # =========================
    # PRE-2013 LOGIC (TABLE BASED)
    # =========================
    

	
	if ($item.year -lt 2013) {

		if ($item.year -lt 2006) {

			$tables = @($doc.GetElementsByTagName("table"))

			$rows = @()

			foreach ($table in $tables) {

				$nestedTables = @($table.GetElementsByTagName("table"))

				# skip parent tables that contain nested tables
				if ($nestedTables.Count -gt 0) {
					continue
				}

				# collect rows from leaf tables
				$rows += @($table.GetElementsByTagName("tr"))
			}
		}
		else {
			$rows = @($doc.GetElementsByTagName("tr"))
		}
		
        foreach ($row in $rows) {
			$cells = @($row.GetElementsByTagName("td"))
			if ($cells.Count -lt 1) { continue }

			$firstCell = $cells[0].TextContent.Trim()

			

			# strict case-insensitive match only on first column
			if ($firstCell -notmatch "(?i)\b$([regex]::Escape($subject))\b") {				
				continue
			}

			$nextRow = $null

			if ($item.year -eq 2000) {
				$nextRow = $row.NextElementSibling
			}

			$linkNodes = @($row.GetElementsByTagName("a"))

			if ($nextRow) {
				$linkNodes = @(
					$linkNodes
					$nextRow.GetElementsByTagName("a") | ForEach-Object { $_ }
				)
			}

			foreach ($link in ($linkNodes | Where-Object { $_.PathName -match "\.pdf$" })) {

                $tempurl = $link.href
                $tempurl = $tempurl -replace ".*http\:\/\/www\.boardofstudies\.nsw\.edu\.au", "https://www.boardofstudies.nsw.edu.au"
                $tempurl = $tempurl -replace "about\:\/\/\/", $parentURL
                $tempurl = $tempurl -replace 'hsc_exams/.*/hsc_exams', 'hsc_exams'
				$tempurl = $tempurl -replace '.*/http\:\/\/www', 'https://www'
				$tempurl = $tempurl -replace '.*/https\:\/\/www', 'https://www'
				
				
				$year = $item.year
				if ($item.year -eq "2000") {

					$file = [System.IO.Path]::GetFileName(([uri]$tempurl).AbsolutePath)

					if ($file -match '^(\d{2})') {

						$yy = [int]$matches[1]

						$year = if ($yy -eq 0) {
							"2000"
						} else {
							"$(1900 + $($yy))"
						}

						Write-Host -ForegroundColor DarkGray "Derived year $year from $file"
					}
				}
				Write-Host -ForegroundColor Cyan "[$($year) $($subject)] Found: $($tempurl)"
				
				#if($tempurl -match 
                try {
                    Invoke-WebRequest -Uri $tempurl -Method Head -ErrorAction Stop -MaximumRedirection 10 -UseBasicParsing | Out-Null
                }
                catch {
					Write-Host -ForegroundColor Yellow "Skipped [$($year) $($subject)] Found: $($tempurl)"
                    continue
                }

                [PSCustomObject]@{
                    Year  = $year
                    Title = $link.TextContent.Trim()
                    Url   = $tempurl
                }
            }
        }
    }

    # =========================
    # POST-2013 LOGIC (ANCHOR BASED)
    # =========================
    else {

        foreach ($link in ($doc.GetElementsByTagName("a") | Where-Object {
            $_.InnerHtml -match $subject -and $_.PathName -match "\.pdf$"
        })) {

            $tempurl = $link.href
            $tempurl = $tempurl -Replace ".*http\:\/\/www\.boardofstudies\.nsw\.edu\.au", "https://www.boardofstudies.nsw.edu.au"
            $tempurl = $tempurl -Replace "about\:\/\/\/", $parentURL
            $tempurl = $tempurl -Replace 'hsc_exams/.*/hsc_exams', 'hsc_exams'
				Write-Host -ForegroundColor Cyan "[$($item.year) $($subject)] Found: $($tempurl)"
            try {
                Invoke-WebRequest -Uri $tempurl -Method Head -ErrorAction Stop -MaximumRedirection 10 -UseBasicParsing | Out-Null			
            }
            catch {
				Write-Host -ForegroundColor Yellow "Skipped [$($item.year) $($subject)] Found: $($tempurl)"
                continue
            }

            [PSCustomObject]@{
                Year  = $item.year
                Title = $link.TextContent.Trim()
                Url   = $tempurl
            }
        }
    }

}

# =========================
# CLASSIFICATION PASS (UNCHANGED LOGIC)
# =========================
$result = $linklist | ForEach-Object {

    $r = $_
    $key = "$($r.Year) HSC"
    $title = "$($r.Year) HSC"
    switch ($r.Year) {

        {$_ -ge 1995 -and $_ -le 2005} {
            if ($r.Url -match "_er") { $title += " - Marking Guidelines" ;  $key = $key -replace "HSC", "Marking Guidelines"
			}
        }

        {$_ -ge 2006 -and $_ -le 2008} {
            if ($r.Url -match "-notes|_notes") { $title += " - Marking Guidelines"; $key = $key -replace "HSC", "Marking Guidelines"}
        }

        {$_ -ge 2009 -and $_ -le 2012} {
            if ($r.Url -match "-marking-guide") { $title += " - Marking Guidelines"; $key = $key -replace "HSC", "Marking Guidelines"}
            elseif ($r.Url -match "-sample-answers") { $title += " - Sample Answers"; $key = $key -replace "HSC", "Sample Answers" }
            elseif ($r.Url -match "-notes") { $title += " - Marking Feedback"; $key = $key -replace "HSC", "Marking Feedback" }
        }

        {$_ -ge 2013 -and $_ -le 2015} {
            if ($r.Url -match "-mg") { $title += " - Marking Guidelines"; $key = $key -replace "HSC", "Marking Guidelines" }
            elseif ($r.Url -match "-notes") { $title += " - Marking Feedback"; $key = $key -replace "HSC", "Marking Feedback" }
        }
    }

    [PSCustomObject]@{
        Key   = $key
        Value = @(
            [PSCustomObject]@{
                display = "Board of Studies / NESA (official)"
                title   = "$Subject $($title)"
                url     = $r.Url
                type    = "official"
                default = $true
            }
        )
    }
}

# =========================
# OUTPUT
# =========================
$outputFile = Join-Path $PSScriptRoot "..\index\$PDFTemplateCode.json"

# -------------------------
# Load existing JSON
# -------------------------
if (Test-Path $outputFile) {
    Write-Host "Loading existing file..." -ForegroundColor Yellow
    $existing = Get-Content $outputFile -Raw | ConvertFrom-Json
}
else {
    $existing = [pscustomobject]@{}
}

# Convert existing to hashtable for merging
$existingHash = @{}
$existing.PSObject.Properties | ForEach-Object {
    $existingHash[$_.Name] = $_.Value
}
# -------------------------
# Ensure incoming data is FLAT (NO Key/Value wrappers)
# -------------------------
$flatResult = $result | ForEach-Object {
    $_.Value
} | Where-Object { $_ -ne $null }

# -------------------------
# Build incoming grouped data
# -------------------------
$incomingHash = @{}

foreach ($group in ($result | Group-Object Key)) {

    $key = $group.Name

    # FLATTEN properly (prevents wrapper duplication bug)
    $newValues = @(
        $group.Group | ForEach-Object { $_.Value }
    ) | Where-Object { $_ -ne $null }

    if (-not $incomingHash.ContainsKey($key)) {
        $incomingHash[$key] = @()
    }

    $incomingHash[$key] += $newValues
}

# -------------------------
# MERGE WITH EXISTING
# -------------------------
foreach ($key in $incomingHash.Keys) {

    $newValues = @($incomingHash[$key])

    if ($existingHash.ContainsKey($key)) {

        $existingList = @($existingHash[$key])

        $existingOfficial = @($existingList | Where-Object { $_.type -eq "official" })
        $existingOther    = @($existingList | Where-Object { $_.type -ne "official" })

        $incomingOfficial = @($newValues | Where-Object { $_.type -eq "official" })
        $incomingOther    = @($newValues | Where-Object { $_.type -ne "official" })

        # dedupe official
        $mergedOfficial =
            @($existingOfficial + $incomingOfficial) |
            Group-Object url |
            ForEach-Object { $_.Group[0] }

        # append other
        $mergedOther = @($existingOther + $incomingOther)

        $existingHash[$key] = @(
            $mergedOfficial
            $mergedOther
        )
    }
    else {
        $existingHash[$key] = @($newValues)
    }
}

# -------------------------
# SORT KEYS
# -------------------------
$sorted = [ordered]@{}

foreach ($key in ($existingHash.Keys | Sort-Object)) {
    $sorted[$key] = $existingHash[$key]
}

# -------------------------
# WRITE JSON
# -------------------------
$outputFile = Join-Path $PSScriptRoot "..\index\$PDFTemplateCode.json"

$json = $sorted | ConvertTo-Json -Depth 10

Set-Content $outputFile -Value $json -Encoding UTF8

# -------------------------
# POST-PROCESS CLEANUP
# remove whitespace/newlines before fields
# -------------------------
$content = Get-Content $outputFile -Raw

$content = $content -replace '\s+"title"', '"title"'
$content = $content -replace '\s+"url"', '"url"'
$content = $content -replace '\s+"type"', '"type"'
$content = $content -replace '\s+"default"', '"default"'

$content = $content -replace '"title"\s*:\s*', '"title":'
$content = $content -replace '"url"\s*:\s*', '"url":'
$content = $content -replace '"type"\s*:\s*', '"type":'
$content = $content -replace '"default"\s*:\s*', '"default":'
$content = $content -replace '(?m)^\s+', ''
$content = $content -replace '"display"\s*:\s*', ' "display":'
Set-Content $outputFile -Value $content -Encoding UTF8

Write-Host ""
Write-Host "Updated $outputFile" -ForegroundColor Green
Write-Host "$($sorted.Count) keys written." -ForegroundColor Green