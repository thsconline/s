param(
    [Parameter(Mandatory = $true)]
    [string]$PDFTemplateCode
)
$host.ui.RawUI.WindowTitle = "thsconline admin script $PDFTemplateCode"
chdir $PSScriptRoot # change to current directory
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

#E.G. # https://script.google.com/macros/s/AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-/exec?base=2014&field=R1&export=encode

# https://script.google.com/macros/s/AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-/exec?base=2014&field=R1&export=encode
#

#$Destinations = 
#@(#
#	"r2_1f3d2925c3eff6cef4a2dc2d306685f68b1ab0e5029ffbe7a0c8232ad5f47eb1", 
#	"r2_7f10d8d2ca52665f062f1f77696e02e927ede529b59c74ea3d531efbb768ef6b"
#)
$OutputDirectory = "..\"

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

$host.UI.RawUI.WindowTitle = "thsconline admin script $PDFTemplateCode"

Set-Location $PSScriptRoot
chdir $PSScriptRoot
write-host $PSScriptRoot

$GASUrl = "https://script.google.com/macros/s/AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-/exec"

$ChunkSize = 4MB

# ------------------------------------------------------------
# Load template configuration
# ------------------------------------------------------------
get-location
$Params = gc "config_files\$PDFTemplateCode.json" |
    ConvertFrom-Json

$DrivePath = $Params.DrivePath
$WithSolutionsSuffix    = $Params.WithSolutionsSuffix
$WithoutSolutionsSuffix = $Params.WithoutSolutionsSuffix
$OutputDirectory = Resolve-Path $OutputDirectory
Write-Host $OutputDirectory
# ------------------------------------------------------------
# Get schools
# ------------------------------------------------------------

$Schools = (
    Get-ChildItem $DrivePath -Directory |
    Sort-Object Name
).Name

# ------------------------------------------------------------
# Get papers
# ------------------------------------------------------------

$Papers = $Schools | ForEach-Object {

    Get-ChildItem "$DrivePath\$_" |
        Where-Object {
            $_.Name -match "[A-z ]{3,} (19|20)[0-9]{2} ($WithoutSolutionsSuffix|$WithSolutionsSuffix)"
        } |
        Sort-Object Name
} 

# ------------------------------------------------------------
# Process every PDF
# ------------------------------------------------------------

foreach ($Paper in $Papers) {

    $OriginalFileName = $Paper.Name
    $FullPath = $Paper.FullName

    Write-Host ""
    Write-Host "Processing: $OriginalFileName"

    # --------------------------------------------------------
    # Create the formatted name used by your existing JS
    # --------------------------------------------------------

    $PapersFormatted = (
        $OriginalFileName `
            -replace [regex]::Escape($WithSolutionsSuffix), "w. sol" `
            -replace [regex]::Escape($WithoutSolutionsSuffix), ""
    ).Trim()

    # --------------------------------------------------------
    # Ask GAS for the hash
    #
    # base  = PDFTemplateCode
    # field = PapersFormatted
    # export = encode
    # --------------------------------------------------------

    $EncodedBase = [uri]::EscapeDataString($PDFTemplateCode)
    $EncodedField = [uri]::EscapeDataString($PapersFormatted)

    $HashUrl = "$GasUrl" +
        "?base=$EncodedBase" +
        "&field=$EncodedField" +
        "&export=encode"

	write-host $HashUrl
    try {
        $Hash = (
            Invoke-RestMethod `
                -Uri $HashUrl `
                -Method Get `
                -ErrorAction Stop
        ).ToString().Trim()
    }
    catch {
        Write-Error "GAS hash request failed for '$OriginalFileName': $_"
        continue
    }

    if ([string]::IsNullOrWhiteSpace($Hash)) {
        Write-Error "GAS returned an empty hash for '$OriginalFileName'"
        continue
    }

    Write-Host "Hash: $Hash"

   # --------------------------------------------------------
	# Temporary gzip file
	# --------------------------------------------------------

	$TempGzip = Join-Path $env:TEMP "$Hash.gz"

	Remove-Item $TempGzip -Force -ErrorAction SilentlyContinue

	# --------------------------------------------------------
	# Gzip the entire PDF
	# --------------------------------------------------------

	$InputStream = [System.IO.File]::OpenRead($FullPath)
	$GzipFileStream = [System.IO.File]::Create($TempGzip)

	try {

		$GzipStream = [System.IO.Compression.GZipStream]::new(
			$GzipFileStream,
			[System.IO.Compression.CompressionMode]::Compress
		)

		try {
			$InputStream.CopyTo($GzipStream)
		}
		finally {
			$GzipStream.Dispose()
		}

	}
	finally {
		$InputStream.Dispose()
		$GzipFileStream.Dispose()
	}

	# --------------------------------------------------------
	# Split gzip into 4 MiB fragments
	# --------------------------------------------------------

	$GzipInput = [System.IO.File]::OpenRead($TempGzip)

	$Buffer = New-Object byte[] $ChunkSize

	$FragmentIndex = 0

	try {

		while (($BytesRead = $GzipInput.Read(
			$Buffer,
			0,
			$Buffer.Length
		)) -gt 0) {

			# hash.0, hash.1, hash.2, etc.
			$FragmentName = "${Hash}.${FragmentIndex}"

			$FragmentPath = Join-Path `
				$OutputDirectory `
				$FragmentName

			$FragmentStream = [System.IO.File]::Create($FragmentPath)

			try {
				$FragmentStream.Write(
					$Buffer,
					0,
					$BytesRead
				)
			}
			finally {
				$FragmentStream.Dispose()
			}

			Write-Host "  Fragment: $FragmentName ($BytesRead bytes)"

			$FragmentIndex++
		}

	}
	finally {
		$GzipInput.Dispose()
	}

	Remove-Item $TempGzip -Force

	# --------------------------------------------------------
	# Build metadata
	# --------------------------------------------------------

	$LastUpdated = (
		Get-Item $FullPath
	).LastWriteTimeUtc.ToString("o")

	$FragmentPath = "/"

	$MetadataText =
		"thsc|" +
		$Hash +
		"|" +
		$OriginalFileName +
		"|" +
		$LastUpdated +
		"|" +
		$FragmentCount +
		"|" +
		$ChunkSize +
		"|" +
		$FragmentPath

	$MetadataBytes =
		[System.Text.Encoding]::UTF8.GetBytes(
			$MetadataText
		)

	$Rc4Key =
		[System.Text.Encoding]::UTF8.GetBytes(
			$Rc4KeyText
		)

	$EncryptedMetadata =
		Invoke-RC4 `
			-Data $MetadataBytes `
			-Key $Rc4Key

	$DataPath =
		Join-Path `
			$OutputDirectory `
			"$Hash.m"

	[System.IO.File]::WriteAllBytes(
		$DataPath,
		$EncryptedMetadata
	)

	Write-Host "  Metadata: $Hash.m"
	Write-Host "  Fragments: $FragmentCount"

}
