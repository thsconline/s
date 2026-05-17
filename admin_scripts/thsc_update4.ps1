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

$folder = Select-Folder "Select folder to clean"

if (-not $folder) {
    Write-Host "No folder selected."
    pause
    exit
}

Write-Host ""
Write-Host "Cleaning: $folder"
Write-Host ""

# Delete 0 KB files
Get-ChildItem $folder -File -Recurse |
Where-Object { $_.Length -eq 0 } |
ForEach-Object {
    Write-Host "Deleting file: $($_.FullName)"
    Remove-Item $_.FullName -Force
}

# Delete empty folders
Get-ChildItem $folder -Directory -Recurse |
Sort-Object FullName -Descending |
Where-Object {
    @(Get-ChildItem $_.FullName -Force).Count -eq 0
} |
ForEach-Object {
    Write-Host "Deleting folder: $($_.FullName)"
    Remove-Item $_.FullName -Force
}

Write-Host ""
Write-Host "Done."
pause