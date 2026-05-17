Add-Type -AssemblyName System.Windows.Forms

function Select-Folder($title) {

    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $title
    $dialog.CheckFileExists = $false
    $dialog.ValidateNames = $false
    $dialog.FileName = "Select Folder"

    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return Split-Path $dialog.FileName
    }

    return $null
}

# Pick source folder
$sourceFolder = Select-Folder "Select SOURCE folder"

if (-not $sourceFolder) {
    Write-Host "No source folder selected."
    pause
    exit
}

# Pick comparison folder
$compareFolder = Select-Folder "Select COMPARISON folder"

if (-not $compareFolder) {
    Write-Host "No comparison folder selected."
    pause
    exit
}

Write-Host ""
Write-Host "Source  : $sourceFolder"
Write-Host "Compare : $compareFolder"
Write-Host ""

# Build lookup table from comparison folder (recursive)
$compareFiles = @{}

Get-ChildItem -Path $compareFolder -File -Recurse | ForEach-Object {

    # Key = filename + filesize
    $key = "$($_.Name)|$($_.Length)"

    $compareFiles[$key] = $true
}

# Scan source folder
Get-ChildItem -Path $sourceFolder -File -Recurse | ForEach-Object {

    $sourceFile = $_

    $key = "$($sourceFile.Name)|$($sourceFile.Length)"

    # Match anywhere in comparison folder
    if ($compareFiles.ContainsKey($key)) {

        Write-Host "Deleting: $($sourceFile.FullName)"

        Remove-Item $sourceFile.FullName -Force

        # Preview only:
        # Write-Host "Would delete: $($sourceFile.FullName)"
    }
}

Write-Host ""
Write-Host "Done."
pause