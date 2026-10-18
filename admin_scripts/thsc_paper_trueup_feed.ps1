$FeedFile = Join-Path (Split-Path $PSScriptRoot -Parent) "feed.atom"

if (!(Test-Path $FeedFile)) {
    throw "feed.atom was not found at $FeedFile"
}

[xml]$FeedXml = Get-Content -Raw -Encoding UTF8 $FeedFile

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Update the feed-level timestamp.
$FeedXml.feed.updated = $Timestamp

# Update every entry's timestamp.
foreach ($Entry in $FeedXml.feed.entry) {
    $Entry.updated = $Timestamp
}

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

Write-Host -ForegroundColor Green "All updated timestamps set to $Timestamp"