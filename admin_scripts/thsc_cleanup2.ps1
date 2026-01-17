cd "E:\"

$folderPairs = @(
    @{ X = 'E:\'; Y = 'T:\My Drive\thsconline collection\Year 11 & 12 - Internal Examinations' }
)

foreach ($pair in $folderPairs) {

# --- Folders ---
$SourceFolder = $pair.X
$TargetFolder = $pair.Y
$JsonFolder   = "C:\Users\dprit\OneDrive\Documents\GitHub\s2\admin_scripts\config_files"


$y = Get-ChildItem $pair.Y -Filter '*.pdf' -Recurse |
	Select-Object Name,
		@{Name='SizeKB';Expression={[math]::Round($_.Length / 1KB, 2)}},
		@{Name='SizeMB';Expression={[math]::Round($_.Length / 1MB, 2)}},
		FullName |
	Sort-Object Name

# --- Normalize filenames to ignore " (1)" style copies ---

$y | ForEach-Object { $_ | Add-Member -NotePropertyName NormalizedName -NotePropertyValue ($_.Name -replace '\s\(\d+\)(?=\.)','') }

# Build lookup from $y (Name -> object)
$yLookup = $y | Group-Object NormalizedName -AsHashTable -AsString	

# --- Get Source files ---
$x = Get-ChildItem $pair.X -Filter '*.pdf' -Recurse |
        Select-Object Name,
            @{Name='SizeKB';Expression={[math]::Round($_.Length / 1KB, 2)}},
            @{Name='SizeMB';Expression={[math]::Round($_.Length / 1MB, 2)}},
            FullName |
        Sort-Object Name

# --- Add NormalizedName property for comparisons ---
$x | ForEach-Object { 

# --- Loop through each file ---
foreach ($file in $x) {

    Write-Host "`nOriginal file: $($file.Name) - $($file.sizeKB) KB $($file.fullname)" -ForegroundColor Cyan

	# --- Prepare PromptForChoice arguments ---
    $Title = "Choose Action"
    $Prompt = "Select what to do with this file:"
    $Choices = [System.Management.Automation.Host.ChoiceDescription[]] @(
        "&1. With Solutions",
        "&2. Without Solutions",
        "&3. Skip / Keep original filename"
		"&4. Delete file"
    )
    $Default = 2  # Skip by default

    # --- Prompt for choice ---
    $Choice = $host.UI.PromptForChoice($Title, $Prompt, $Choices, $Default)

    switch ($choice) {

        0 {
            # Ask for paper code
            do {
                $paperCode = Read-Host "Enter 4-digit paper code"
            } while ($paperCode -notmatch '^\d{4}$')

            # Load JSON
            $jsonPath = Join-Path $JsonFolder "$paperCode.json"
            if (-Not (Test-Path $jsonPath)) {
                Write-Host "JSON file $jsonPath not found! Skipping." -ForegroundColor Red
                continue
            }
            $json = Get-Content $jsonPath | ConvertFrom-Json

            # Ask for Source and Year
            $sourceInput = Read-Host "Enter Source string"
            do {
                $yearInput = Read-Host "Enter 4-digit year"
            } while ($yearInput -notmatch '^\d{4}$')

            # Build new filename
            $prefix = $json.WithSolutionsSuffix
            $newName = "${sourceInput} ${yearInput} ${prefix}.pdf"
        }

        1 {
            # Ask for paper code
            do {
                $paperCode = Read-Host "Enter 4-digit paper code"
            } while ($paperCode -notmatch '^\d{4}$')

            # Load JSON
            $jsonPath = Join-Path $JsonFolder "$paperCode.json"
            if (-Not (Test-Path $jsonPath)) {
                Write-Host "JSON file $jsonPath not found! Skipping." -ForegroundColor Red
                continue
            }
            $json = Get-Content $jsonPath | ConvertFrom-Json

            # Ask for Source and Year
            $sourceInput = Read-Host "Enter Source string"
            do {
                $yearInput = Read-Host "Enter 4-digit year"
            } while ($yearInput -notmatch '^\d{4}$')

            # Build new filename
            $prefix = $json.WithoutSolutionsSuffix
            $newName = "${sourceInput} ${yearInput} ${prefix}.pdf"
			
			write-host $newName = 
        }

        2 {
            # Skip: keep original name
            $newName = $file.Name
        }
		
		3 {
			Remove-Item -Path $File.FullName -Force
		}

        default {
            Write-Host "Invalid choice. Skipping file." -ForegroundColor Yellow
            continue
        }
    }

	if ($yLookup.ContainsKey($newName)) {
		$result = foreach ($yFile in $yLookup[$newName]) {

            [PSCustomObject]@{
                LogicalName = $newName
                Name_X      = $file.Name
                Name_Y      = $yFile.Name
                FullName_X  = $file.FullName
                FullName_Y  = $yFile.FullName
                SizeKB_X    = $file.SizeKB
                SizeKB_Y    = $yFile.SizeKB
                SizeMatch   = ($file.SizeKB -eq $yFile.SizeKB)
                IsCopy_X    = ($file.Name -match '\(\d+\)\.pdf$')
                IsCopy_Y    = ($yFile.Name -match '\(\d+\)\.pdf$')
            }
        }
		
		$result

		$result | ForEach-Object {
				if($_.SizeMatch)
				{
				# Different folders: delete everything from Source
				Write-Host -ForegroundColor Yellow "Removing file copy: $($_.FullName_X)"
				Remove-Item -Path $_.FullName_X -WhatIf
				}
		}
		
		
    }
   
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