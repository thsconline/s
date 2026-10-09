# Add-CanonicalLinks.ps1
# Inserts or updates canonical links in HTML files recursively.
# No backups are created.

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath,

    [string]$BaseUrl = "https://www.thsconline.net/s/"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath $RootPath).Path
$BaseUrl = $BaseUrl.TrimEnd('/') + '/'

$files = Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object { $_.Extension -match '^\.html?$' }

$updated = 0
$unchanged = 0
$skipped = 0
$failed = 0

foreach ($file in $files) {
    try {
        $relativePath = [System.IO.Path]::GetRelativePath(
            $root, $file.FullName
        ) -replace '\\', '/'

        # Convert index.html to its directory URL.
        if ($relativePath -match '(?i)(^|/)index\.html?$') {
            $relativePath = $relativePath -replace '(?i)index\.html?$', ''
        }

        # URL-encode individual path segments.
        $encodedPath = (
            $relativePath -split '/' |
            ForEach-Object {
                [System.Uri]::EscapeDataString($_)
            }
        ) -join '/'

        $canonicalUrl = $BaseUrl + $encodedPath
        $html = [System.IO.File]::ReadAllText($file.FullName)

        if ($html -notmatch '(?is)<head(?:\s[^>]*)?>') {
            Write-Warning "Skipping (no <head>): $relativePath"
            $skipped++
            continue
        }

        $canonicalTag = '<link rel="canonical" href="' +
            $canonicalUrl + '" />'

        $canonicalPattern = '(?is)<link\b(?=[^>]*\brel\s*=\s*["'']?canonical\b)[^>]*\/?>'

        if ([regex]::IsMatch($html, $canonicalPattern)) {
            $newHtml = [regex]::Replace(
                $html,
                $canonicalPattern,
                [System.Text.RegularExpressions.MatchEvaluator]{
                    param($match)
                    $canonicalTag
                },
                1
            )
        }
        else {
            $headPattern = '(?is)(<head(?:\s[^>]*)?>)'

            $newHtml = [regex]::Replace(
                $html,
                $headPattern,
                [System.Text.RegularExpressions.MatchEvaluator]{
                    param($match)
                    $match.Groups[1].Value + "`r`n    " + $canonicalTag
                },
                1
            )
        }

        if ($newHtml -ceq $html) {
            Write-Host "Unchanged: $relativePath"
            $unchanged++
            continue
        }

        if ($PSCmdlet.ShouldProcess($relativePath, "Set canonical URL to $canonicalUrl")) {
            [System.IO.File]::WriteAllText(
                $file.FullName,
                $newHtml,
                [System.Text.UTF8Encoding]::new($false)
            )

            Write-Host "Updated: $relativePath -> $canonicalUrl" -ForegroundColor Green
            $updated++
        }
    }
    catch {
        Write-Warning "Failed: $($file.FullName) - $($_.Exception.Message)"
        $failed++
    }
}

Write-Host "`nFinished."
Write-Host "Updated:   $updated"
Write-Host "Unchanged: $unchanged"
Write-Host "Skipped:   $skipped"
Write-Host "Failed:    $failed"