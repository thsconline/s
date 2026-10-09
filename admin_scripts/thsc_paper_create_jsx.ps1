param(
    [string]$SourceDirectory = "..\"
)

$host.ui.RawUI.WindowTitle = "thsconline admin script"
chdir $PSScriptRoot # change to current directory
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$ErrorActionPreference = "Stop"

$SourceDirectory = (Resolve-Path $SourceDirectory).Path

Write-Host "Syncing: $SourceDirectory" -ForegroundColor Cyan
Write-Host ""


# ============================================================
# HTML -> JSX
# ============================================================

# ============================================================
# Escape text for JavaScript string literals
# ============================================================

function ConvertTo-JsString {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value) {
        return ""
    }

    $Value = $Value.Replace('\', '\\')
    $Value = $Value.Replace('"', '\"')
    $Value = $Value.Replace("'", "\'")
    $Value = $Value.Replace("`r", '\r')
    $Value = $Value.Replace("`n", '\n')
    $Value = $Value.Replace("`t", '\t')
    $Value = $Value.Replace('$', '\u0024')
    $Value = $Value.Replace('`', '\u0060')
    $Value = $Value.Replace('</', '<\/')

    return $Value
}

function Convert-HtmlToJsx {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Html
    )

    # --------------------------------------------------------
    # Remove HTML comments
    # --------------------------------------------------------

    $Html = $Html -replace '(?s)<!--.*?-->', ''


    # --------------------------------------------------------
    # HTML -> JSX
    #
    # Only conversions actually required by this site.
    # --------------------------------------------------------

	$Html = $Html -replace '(?i)onclick="pdf\(this,\s*([0-9]+)\)"', 'onClick={(e) => pdf(e.currentTarget, $1)}'

	$Html = $Html -replace '(?i)onclick="toggleSearchBar\(\);\s*this\.closest\(''details''\)\.open\s*=\s*false;"', 'onClick={(e) => { toggleSearchBar(); e.currentTarget.closest(''details'').open = false; }}'

	$Html = $Html -replace '(?i)onkeyup="filterTable\(\)"', 'onKeyUp={filterTable}'
	$Html = $Html -replace '(?i)onclick="filterTable\(\)"', 'onClick={filterTable}'
	$Html = $Html -replace '(?i)onclick="toggleSearchBar\(\)"', 'onClick={toggleSearchBar}'	

	$Html = $Html -replace '(?i)onclick="toggleView\(''web-grid'',\s*''web-list''\)"', 'onClick={() => toggleView(''web-grid'', ''web-list'')}'

	$Html = $Html -replace '(?i)\bonclick=', 'onClick='
	$Html = $Html -replace '(?i)\bonkeydown=', 'onKeyDown='
	$Html = $Html -replace '(?i)\bonkeyup=', 'onKeyUp='
	$Html = $Html -replace '(?i)\bonchange=', 'onChange='
	$Html = $Html -replace '(?i)\boninput=', 'onInput='
	$Html = $Html -replace '(?i)\bonsubmit=', 'onSubmit='
	$Html = $Html -replace '(?i)\bonload=', 'onLoad='
	$Html = $Html -replace '(?i)\bonerror=', 'onError='

	$Html = $Html -replace '(?i)\bclass=', 'className='

	$Html = $Html -replace '(?i)\sopen=""', ' open'

    $Html = $Html -replace '(?i)\bclass=', 'className='

	$Html = $Html -replace '(?i)padding-left\b', 'paddingLeft'
	$Html = $Html -replace '(?i)padding-right\b', 'paddingRight'
	$Html = $Html -replace '(?i)margin-left\b', 'marginLeft'
	$Html = $Html -replace '(?i)margin-right\b', 'marginRight'
	

	$Html = [regex]::Replace($Html, '(?i)style="([^"]*)"', {
		param($match)

		$styles = $match.Groups[1].Value

		$converted = $styles -split ';' |
			Where-Object { $_.Trim() } |
			ForEach-Object {
				$parts = $_ -split ':', 2

				if ($parts.Count -eq 2) {
					$property = $parts[0].Trim()
					$value = $parts[1].Trim()

					# kebab-case -> camelCase
					$property = $property -replace '-([a-z])', {
						param($m)
						$m.Groups[1].Value.ToUpper()
					}

					"$property`: '$value'"
				}
			}

		"style={{ $($converted -join ', ') }}"
	})



	$Html = $Html -replace '(?m)^\s*$', ''



    return $Html.Trim()
}


# ============================================================
# Generate safe JavaScript component name
# ============================================================

function Get-ComponentName {
    param(
        [string]$RelativePath,
        [int]$Index
    )

    $Name = [System.IO.Path]::GetFileNameWithoutExtension(
        $RelativePath
    )

    $Directory = [System.IO.Path]::GetDirectoryName(
        $RelativePath
    )

    if ($Directory) {
        $Name = $Directory + "_" + $Name
    }

    # Convert anything invalid in a JS identifier to _
    $Name = $Name -replace '[^a-zA-Z0-9_$]', '_'

    # Collapse repeated underscores
    $Name = $Name -replace '_+', '_'

    # JS identifiers cannot begin with a number
    if ($Name -match '^[0-9]') {
        $Name = "_" + $Name
    }

    # Make the first character uppercase
    if ($Name.Length -gt 0) {
        $Name = $Name.Substring(0, 1).ToUpper() + $Name.Substring(1)
    }

    # Guarantee uniqueness
    return "${Name}_Page$Index"
}


# ============================================================
# Filesystem path -> React route
# ============================================================

function Get-RoutePath {
    param(
        [string]$RelativePath
    )

    $Route = $RelativePath -replace '\\', '/'

    if ($Route -eq "index.html") {
        return "/s/"
    }

    if ($Route -match '/index\.html$') {
        $Route = $Route -replace '/index\.html$', '/'
        return "/s/$Route"
    }

    return "/s/$Route.html"
}



# ============================================================
# Find all HTML files
# ============================================================

$HtmlFiles = @(
    Get-ChildItem `
        -Path $SourceDirectory `
        -Filter "*.html" `
        -File `
        -Recurse |
    Where-Object {
        $_.Directory.FullName -ne $SourceDirectory -and
        $_.FullName -notlike "*upload*"
    } |
    Sort-Object FullName
)


Write-Host "Found $($HtmlFiles.Count) HTML files." -ForegroundColor Green
Write-Host ""


# ============================================================
# Route collection
# ============================================================

$Routes = @()

$Index = 0


# ============================================================
# Process HTML files
# ============================================================

foreach ($SourceFile in $HtmlFiles) {

    $Index++

    # Relative path from source root
    $RelativePath = $SourceFile.FullName.Substring(
        $SourceDirectory.Length
    ).TrimStart('\', '/')

    Write-Host "[$Index/$($HtmlFiles.Count)] $RelativePath"


    # --------------------------------------------------------
    # Read ORIGINAL HTML
    #
    # Do NOT serialize through AngleSharp here.
    # This preserves capitalization, backslashes, etc.
    # --------------------------------------------------------

    $Html = Get-Content `
        -Path $SourceFile.FullName `
        -Raw `
        -Encoding UTF8


    # ========================================================
    # Extract <title>
    # ========================================================

    $TitleMatch = [regex]::Match(
        $Html,
        '(?is)<title\b[^>]*>(.*?)</title\s*>'
    )

    if ($TitleMatch.Success) {
        $Title = $TitleMatch.Groups[1].Value.Trim()
    }
    else {
        $Title = ""

        Write-Warning "No <title> found: $RelativePath"
    }

	# ========================================================
	# Extract SEO canonical URL
	# ========================================================

	$CanonicalMatch = [regex]::Match(
		$Html,
		'(?is)<link\b(?=[^>]*\brel\s*=\s*["'']canonical["''])(?=[^>]*\bhref\s*=\s*["'']([^"'']*)["''])[^>]*>'
	)

	if ($CanonicalMatch.Success) {
		$Canonical = [System.Net.WebUtility]::HtmlDecode(
			$CanonicalMatch.Groups[1].Value.Trim()
		)
	}
	else {
		$Canonical = ""
	}


    # ========================================================
    # Extract <body>
    #
    # Everything in <head> is discarded.
    # ========================================================

	$BodyMatch = [regex]::Match(
		$Html,
		'(?is)<body\b[^>]*>\s*<h1>\s*thsconline\s*</h1>\s*<div\s+id=["'']page-wrapper["'']\s*>(.*)</div>\s*</body\s*>'
	)



    if (-not $BodyMatch.Success) {
        Write-Warning "No <body> found: $RelativePath"
        continue
    }

    $Body = $BodyMatch.Groups[1].Value


    # ========================================================
    # Convert body HTML -> JSX
    # ========================================================

    $Body = Convert-HtmlToJsx $Body


    # ========================================================
    # Escape title for JavaScript
    # ========================================================
	$TitleJs = ConvertTo-JsString $Title
	$CanonicalJs = ConvertTo-JsString $Canonical


    # ========================================================
    # .html -> .jsx beside original
    # ========================================================

    $JsxFile = [System.IO.Path]::ChangeExtension(
        $SourceFile.FullName,
        ".jsx"
    )


    # ========================================================
    # Generate JSX
    # ========================================================

    $Jsx = @"
// AUTO-GENERATED OUTPUT
// Source: $RelativePath

export const title = "$TitleJs";
export const canonical = "$CanonicalJs";

export default function Page() {
    return (
        <>
$Body
        </>
    );
}
"@


    # ========================================================
    # Write JSX
    # ========================================================

    Set-Content `
        -Path $JsxFile `
        -Value $Jsx `
        -Encoding UTF8


    # ========================================================
    # Generate route metadata
    # ========================================================

    $ComponentName = Get-ComponentName `
        -RelativePath $RelativePath `
        -Index $Index


    # Import path from routes.jsx
    $ImportPath = $RelativePath `
        -replace '\\', '/' `
        -replace '\.html$', '.jsx'

    $ImportPath = "./$ImportPath"


    # URL route
    $RoutePath = Get-RoutePath `
        -RelativePath $RelativePath


    $Routes += [PSCustomObject]@{
		Component  = $ComponentName
		ImportPath = $ImportPath
		Path       = $RoutePath
		Title      = $Title
		Canonical  = $Canonical
	}


    Write-Host "    -> $JsxFile" -ForegroundColor DarkGreen
}


# ============================================================
# Generate routes.jsx
# ============================================================

$RoutesFile = Join-Path `
    $SourceDirectory `
    "routes.jsx"


# ------------------------------------------------------------
# Imports
# ------------------------------------------------------------

$Imports = foreach ($Route in $Routes) {
    @"
import $($Route.Component), {
    title as $($Route.Component)Title,
    canonical as $($Route.Component)Canonical
} from "$($Route.ImportPath)";
"@
}


# ------------------------------------------------------------
# Route entries
# ------------------------------------------------------------

$RouteEntries = foreach ($Route in $Routes) {
    @"
    {
        path: "$((ConvertTo-JsString $Route.Path))",
        component: $($Route.Component),
        title: $($Route.Component)Title,
        canonical: $($Route.Component)Canonical
    }
"@
}


# ------------------------------------------------------------
# Complete routes.jsx
# ------------------------------------------------------------

$RoutesJsx = @"
// AUTO-GENERATED BY sync.ps1
// DO NOT EDIT

$($Imports -join "`r`n")

export const routes = [
$($RouteEntries -join ",`r`n")
];
"@


# ------------------------------------------------------------
# Write routes.jsx
# ------------------------------------------------------------

Set-Content `
    -Path $RoutesFile `
    -Value $RoutesJsx `
    -Encoding UTF8


# ============================================================
# Done
# ============================================================

Write-Host ""
Write-Host "Generated: $RoutesFile" -ForegroundColor Green
Write-Host "Routes:    $($Routes.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "Sync complete." -ForegroundColor Cyan
