#### Powershell Script Copyright 2024-12-28 thsconline. Not covered under MIT license.
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

## Add Dependencies, requires .NET 4.6.1

Add-Type -Path .\AngleSharp.dll -ErrorAction 'SilentlyContinue'
Add-Type -Path .\System.Text.Encoding.CodePages.dll  -ErrorAction 'SilentlyContinue'
Add-Type -Path .\System.Buffers.dll  -ErrorAction 'SilentlyContinue'
Add-Type -Path .\System.Runtime.CompilerServices.Unsafe.dll -ErrorAction 'SilentlyContinue'

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
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index2.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index3.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index4.html" }
	@{ year = 2006; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2006exams/index5.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index2.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index3.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index4.html" }
	@{ year = 2007; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/exam-papers-2007/index5.html" }	
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index2.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index3.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index4.html" }
	@{ year = 2008; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2008exams/index5.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index2.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index3.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index4.html" }
	@{ year = 2009; url = "https://web.archive.org/web/20171230134701/http://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2009exams/index5.html" }
    @{ year = 2010; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2010exams/index.html" }
    @{ year = 2011; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2011exams/index.html" }
    @{ year = 2012; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/hsc2012exams/index.html" }
    @{ year = 2013; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/2013/index.html" }
    @{ year = 2014; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/2014/index.html" }
    @{ year = 2015; url = "https://www.boardofstudies.nsw.edu.au/hsc_exams/2015/index.html" }
)

# HTML parser
$HTMLParser = New-Object AngleSharp.Html.Parser.HtmlParser

# Output array
$results = @()

foreach ($item in $x) {

    $response = Invoke-WebRequest $item.url -MaximumRedirection 10 -UseBasicParsing
    $doc = $HTMLParser.ParseDocument($response.RawContent)

    # Older pages have different table structure
    if ($item.year -lt 2013) {

        $rows = $doc.GetElementsByTagName("tr")

        foreach ($row in $rows) {

            $text = $row.TextContent.Trim()

            if ($text -match "$($Subject)") {

                $links = $row.GetElementsByTagName("a") |
                    Where-Object { $_.PathName -match "\.pdf$" }

                foreach ($link in $links) {

                    $results += [PSCustomObject]@{
                        Year  = $item.year
                        Title = $link.TextContent.Trim()
                        Url   = $link.href.replace("about:///", "https://www.boardofstudies.nsw.edu.au/")
                    }
                }
            }
        }
    }
    else {

        # Newer layout
        $links = $doc.GetElementsByTagName("a") |
            Where-Object {
                $_.InnerHtml -match "$($Subject)" -and
                $_.PathName -match "\.pdf$"
            }

        foreach ($link in $links) {

            $results += [PSCustomObject]@{
                Year  = $item.year
                Title = $link.TextContent.Trim()
                Url   = $link.href.replace("about:///", "https://www.boardofstudies.nsw.edu.au/")
            }
        }
    }
}
# View results
$results | Format-Table