cd "E:\"


$folderPairs = @(
    @{ X = 'E:\'; Y = 'T:\My Drive\thsconline collection\Year 9 & 10' },
    @{ X = 'E:\'; Y = 'T:\My Drive\thsconline collection\Year 11 & 12 - Internal Examinations' }
	@{ X = 'C:\Users\dprit\OneDrive\TRANSFER'; Y = 'T:\My Drive\thsconline collection\Year 9 & 10' },
    @{ X = 'C:\Users\dprit\OneDrive\TRANSFER'; Y = 'T:\My Drive\thsconline collection\Year 11 & 12 - Internal Examinations' }
	
	@{ X = 'C:\users\dprit\Downloads'; Y = 'T:\My Drive\thsconline collection\Year 9 & 10' },
    @{ X = 'C:\users\dprit\Downloads'; Y = 'T:\My Drive\thsconline collection\Year 11 & 12 - Internal Examinations' }
	@{ X = 'C:\Users\dprit\OneDrive\thsc'; Y = 'T:\My Drive\thsconline collection\Year 9 & 10' },
    @{ X = 'C:\Users\dprit\OneDrive\thsc'; Y = 'T:\My Drive\thsconline collection\Year 11 & 12 - Internal Examinations' }
    @{ X = 'E:\'; Y = 'U:\My Drive\Additional Papers\Year 11 & 12 - Unlisted Collection' }
	@{ X = 'C:\Users\dprit\OneDrive\TRANSFER'; Y = 'U:\My Drive\Additional Papers\Year 11 & 12 - Unlisted Collection' }
	
    @{ X = 'C:\users\dprit\Downloads'; Y = 'U:\My Drive\Additional Papers\Year 11 & 12 - Unlisted Collection' }
    @{ X = 'C:\Users\dprit\OneDrive\thsc'; Y = 'U:\My Drive\Additional Papers\Year 11 & 12 - Unlisted Collection' }
	@{ X = 'E:\'; Y = 'E:\' }	
)

foreach ($pair in $folderPairs) {

write-host "Running cleanup... on folder $($pair.x) against $($pair.y)"

# Find all directories starting with __MACOSX
$macDirs = Get-ChildItem -Path $pair.X -Directory -Recurse | Where-Object { $_.Name -eq "__MACOSX" }

# Remove them
foreach ($dir in $macDirs) {
    Write-Host "Removing folder: $($dir.FullName)" -ForegroundColor Yellow
    Remove-Item -Path $dir.FullName -Recurse -Force
}


$x = Get-ChildItem $pair.X -Filter '*.pdf' -Recurse |
        Select-Object Name,
            @{Name='SizeKB';Expression={[math]::Round($_.Length / 1KB, 2)}},
            @{Name='SizeMB';Expression={[math]::Round($_.Length / 1MB, 2)}},
            FullName |
        Sort-Object Name

$y = Get-ChildItem $pair.Y -Filter '*.pdf' -Recurse |
	Select-Object Name,
		@{Name='SizeKB';Expression={[math]::Round($_.Length / 1KB, 2)}},
		@{Name='SizeMB';Expression={[math]::Round($_.Length / 1MB, 2)}},
		FullName |
	Sort-Object Name

# --- Normalize filenames to ignore " (1)" style copies ---
$x | ForEach-Object { $_ | Add-Member -NotePropertyName NormalizedName -NotePropertyValue ($_.Name -replace '\s\(\d+\)(?=\.)','') }
$y | ForEach-Object { $_ | Add-Member -NotePropertyName NormalizedName -NotePropertyValue ($_.Name -replace '\s\(\d+\)(?=\.)','') }
		


# Build lookup from $y (Name -> object)
$yLookup = $y | Group-Object NormalizedName -AsHashTable -AsString

# --- Compare Source vs Target ---
$result = foreach ($f in $x) {
    if ($yLookup.ContainsKey($f.NormalizedName)) {
        foreach ($yFile in $yLookup[$f.NormalizedName]) {

            [PSCustomObject]@{
                LogicalName = $f.NormalizedName
                Name_X      = $f.Name
                Name_Y      = $yFile.Name
                FullName_X  = $f.FullName
                FullName_Y  = $yFile.FullName
                SizeKB_X    = $f.SizeKB
                SizeKB_Y    = $yFile.SizeKB
                SizeMatch   = ($f.SizeKB -eq $yFile.SizeKB)
                IsCopy_X    = ($f.Name -match '\(\d+\)\.pdf$')
                IsCopy_Y    = ($yFile.Name -match '\(\d+\)\.pdf$')
            }
        }
    }
}

$result

$result | ForEach-Object {
     if ($pair.X -eq $pair.Y) {
        # Same folder: only delete copies
        if ($_.IsCopy_X) {
            Write-Host -ForegroundColor Yellow "Removing file copy: $($_.FullName_X)"
            Remove-Item -Path $_.FullName_X -WhatIf
        }
    } else {
        # Different folders: delete everything from Source
        Write-Host -ForegroundColor Yellow "Removing file copy: $($_.FullName_X)"
        Remove-Item -Path $_.FullName_X -Force
    }
}

Get-ChildItem $pair.X -Directory -Recurse |
    Where-Object {
        [System.IO.Directory]::GetFileSystemEntries($_.FullName).Count -eq 0
    } |
    Remove-Item

Get-ChildItem $pair.X -Directory -Recurse |
    Where-Object {
        [System.IO.Directory]::GetFileSystemEntries($_.FullName).Count -eq 0
    } |
    Remove-Item

Get-ChildItem $pair.X -Directory -Recurse |
    Where-Object {
        [System.IO.Directory]::GetFileSystemEntries($_.FullName).Count -eq 0
    } |
    Remove-Item
}