
   var dictionary = {
	"Solutions": ["w. sol", "solutions"],       
	"BHHS": ["Baulkham Hills", "BHHS"],	   
	"FSHS": ["Fort St", "FSHS"],	   
	"HAHS": ["Hurlstone", "HAHS"],	 
	"JR": ["James Ruse", "JR"],	 
	"NSB": ["North Sydney Boys", "NSB"],
	"NSG": ["North Sydney Girls", "NSG"],
	"PLC": ["Pymble", "Presbyterian", "PLC"],
	"SGGHS": ["St George Girls", "SGGHS"],
	"SBHS": ["Sydney Boys", "SBHS"],
	"SGS": ["Sydney Grammar", "SGS"],
	"SGHS": ["Sydney Girls", "SGHS"],
	"STHS": ["Sydney Tech", "STHS"]
	   
       
        // Add more mappings as needed
    };
	
	
	
	
	

function toggleSearchBar() {
  var searchRow = document.getElementById("search-row");
  if (searchRow.style.display === "none") {
    searchRow.style.display = "table-row";  // Show the search bar
  } else {
    searchRow.style.display = "none";  // Hide the search bar
	
	document.querySelectorAll("details").forEach(function(detail) {
		detail.removeAttribute("open");
	})
  }
}

// Helper function to check if the filter contains numeric data
function isNumericMatch(filter) {
    var isNumeric = /^[\d-]+$/.test(filter);  // Only numbers and dashes are allowed for numeric
    return isNumeric;
}

// Helper function to match a numeric range or a number
function matchNumericRange(value, filter) {
    // If filter is a date range like "2022-2024"
    var yearRangeMatch = filter.match(/^(\d{4})-(\d{2}|\d{4})$/);
    if (yearRangeMatch) {
        var startYear = parseInt(yearRangeMatch[1]);
        var endYear = parseInt(yearRangeMatch[2]);

        // Handle conversion of 2-digit years into full years based on current year
        if (endYear < 100) {
            var currentYearLastTwoDigits = new Date().getFullYear() % 100;
            endYear += (endYear < currentYearLastTwoDigits) ? 2000 : 1900;
        }

        return (parseInt(value) >= startYear && parseInt(value) <= endYear);
    }

    // Check if the filter is just a number (not a range)
    return parseInt(value) === parseInt(filter);
}

function filterTable() {
    var input, filter, table, rows, cells, links, i, j, k, link, br, matchFound, resultCount, isExactMatch, debounceTimeout;

    // Predefined dictionary for keyword mapping (STHS -> ["Sydney Tech", "STHS"])
 

    input = document.getElementById("search-bar");
    filter = input.value.toUpperCase();  // Convert search term to uppercase
    isExactMatch = document.getElementById("search-exact").checked;  // Get the checkbox state (checked or unchecked)

    // Check if the filter is numeric and set isExactMatch to false if true
    if (isNumericMatch(filter)) {
        isExactMatch = false;  // Treat numeric filters as non-exact matches
    }

    // Strip all special characters except *, ?, |, and - (for wildcards and ranges)
    filter = filter.replace(/[^A-Za-z0-9\*\?\|,.\-\s]/g, '');  // Remove everything except letters, numbers, *, ?, |, commas, and dashes

    // Remove | characters from the beginning and end of the filter string
    filter = filter.replace(/^(\|)+|(\|)+$/g, '');

    // Handle ranges (e.g., 2022-2024 becomes 2022|2023|2024 and 2023-24 becomes 2023|2024)
    if (filter.includes("-")) {
        var parts = filter.split("-");

        // Check if it's a date range (e.g., 2022-2024 or 2023-24)
        if (parts.length === 2 && isNumericMatch(parts[0]) && isNumericMatch(parts[1])) {
            var start = parseInt(parts[0]);
            var end = parseInt(parts[1]);

      
            if (parts[0].length === 4 && parts[1].length === 2) {
                // Handle case like "2022-24", convert it into "2022|2023|2024"
                end = parseInt(parts[0].slice(0, 2) + parts[1]);  // Convert "2022-24" into 2022|2023|2024
            }


            // Expand the range into a list of years
            var range = [];
            for (var year = start; year <= end; year++) {
                range.push(year);
            }

            filter = range.join("|");  // Convert the range into a string like "2022|2023|2024"
        }
    }

    // Replace commas with | for OR matching
    filter = filter.replace(/,/g, '|');  // Replace commas with | for OR functionality

    // If exact match is checked, treat * and ? as regular characters (remove them for exact match)
    if (isExactMatch) {
        filter = filter.replace(/[\*\?]/g, '');  // Remove * and ? for exact match
    }

    // If exact match is not checked, treat * as a wildcard (convert it to .*) and ? as a single character wildcard (convert it to .)
    if (!isExactMatch) {
        filter = filter.replace(/\*/g, '.*');  // Convert * to a regex pattern that matches any part of the string
        filter = filter.replace(/\?/g, '.');   // Convert ? to a regex pattern that matches exactly one character
    }

    // Replace any dictionary keyword with its corresponding set of possible matches
    for (var key in dictionary) {
        if (dictionary.hasOwnProperty(key)) {
            // Check if the filter matches the key
            if (filter.includes(key)) {
                // Replace the keyword with its corresponding options from the dictionary
                var replacement = dictionary[key].join("|");  // Use regex OR to allow multiple matches
                filter = filter.replace(key, "(" + replacement + ")");
            }
        }
    }

    // Create the regex pattern with case-insensitive matching
    var regex;
    if (isExactMatch) {
        // If exact match, use simple indexOf-like behavior (no regex, just substring search)
        regex = new RegExp('^' + filter, 'i');  // match from the start of the string
    } else {
        // If not exact match, use regex to match anywhere with wildcard
        regex = new RegExp(filter, 'i');  // 'i' for case-insensitive
    }

    table = document.querySelector("table.listing"); // Assuming the links are in a <table>
    rows = table.getElementsByTagName("tr");

    resultCount = 0;  // Variable to keep track of matching links

    // If the search input is empty, show all rows and links and reset result message
    if (filter === "" || input.value === "") {
        for (i = 0; i < rows.length; i++) {
            if (rows[i].classList.contains("search")) {
				continue; // Ignore the searchbar
			}
			if (rows[i].classList.contains("content")) {
                rows[i].style.display = "";  // Show rows with class "content"
            } else {
                rows[i].style.display = "";  // Show all other rows
            }

            cells = rows[i].getElementsByTagName("td");
            for (j = 0; j < cells.length; j++) {
                links = cells[j].getElementsByTagName("a");
                for (k = 0; k < links.length; k++) {
                    links[k].style.display = "";  // Show each link
                    br = links[k].nextElementSibling;
                    if (br && br.tagName === "BR") {
                        br.style.display = "";  // Show <br> if it follows a link
                    }
                }
            }
        }

        // Clear the result message when search is empty
        var resultMessage = document.getElementById("search-message");
        resultMessage.innerHTML = "";
		
		clearTimeout(debounceTimeout);  // Clear any previous timeout to avoid multiple triggers

    // Set a new timeout to wait 2 seconds after the input is cleared
    debounceTimeout = setTimeout(function() {
      if (document.getElementById("search-bar").value == "") {
		 // Hide the search bar row and clear the search input
		var searchRow = document.getElementById("search-row");
		searchRow.style.display = "none";  // Hide the search bar row

		// Clear the search input
		document.getElementById("search-bar").value = "";  // Empty the search input field

		// Uncheck the exact match checkbox (if applicable)
		document.getElementById("search-exact").checked = false;
      }
    }, 3000);  // Wait 3 seconds before hiding the search bar
	
	return;  // Exit the function early since no filtering is needed
  } /*else {
	var searchRow = document.getElementById("search-row");
    searchRow.style.display = "table-row";  // Show the search bar if there is any input
		
    }*/

	var showWithSolution = document.getElementById("search-wsol-only").checked;
	
    // Loop through all rows and apply the search filter
    for (i = 0; i < rows.length; i++) {
		if (rows[i].classList.contains("search")) {
			// no change
			continue;
		}
		
        if (rows[i].classList.contains("content")) {
            rows[i].style.display = "none";  // Always hide rows with class "content"
            continue;
        }

        // If the row has any other class, always show it
        if (rows[i].classList.length > 0) {
            rows[i].style.display = "";  
            continue;
        }

        cells = rows[i].getElementsByTagName("td");
        matchFound = false;

        // Loop through all cells in the row
        for (j = 0; j < cells.length; j++) {
            links = cells[j].getElementsByTagName("a");

            // Loop through all links in the current cell
            for (k = 0; k < links.length; k++) {
                link = links[k];
                br = link.nextElementSibling;

                // If the link matches the regex (either exact match or wildcard search)
                if (regex.test(link.innerText.toUpperCase()) || matchNumericRange(link.innerText, filter)) {
				
					// Hide rows that don't have "w. sol"
					if (showWithSolution && !link.innerText.includes("w. sol")) {
						link.style.display = "none";  // Hide non-matching link

						if (br && br.tagName === "BR") {
							br.style.display = "none";  // Hide <br> tag if the link is hidden
						} 
					} else {
						matchFound = true;
						resultCount++;  // Increment the result count after the match is found
						link.style.display = "";  // Show the matching link

						if (br && br.tagName === "BR") {
							br.style.display = "";  // Show <br> tag if it exists
						}
					}
                    
                } else {
                    link.style.display = "none";  // Hide non-matching link

                    if (br && br.tagName === "BR") {
                        br.style.display = "none";  // Hide <br> tag if the link is hidden
                    }
                }
            }
        }

        // Show or hide the row based on the matches found in the links
        if (matchFound) {
            rows[i].style.display = "";  // Show the row if at least one link matches
        } else {
            rows[i].style.display = "none";  // Hide the row if no links match
        }
    }

    // Display the result count message
    var resultMessage = document.getElementById("search-message");
    if (resultCount === 1) {
        resultMessage.innerHTML = resultCount + " result found.";
    } else if (resultCount > 1) {
        resultMessage.innerHTML = resultCount + " results found.";
    } else {
        resultMessage.innerHTML = "No results found.";  // In case no results match
    }
	
	resultMessage.toggleAttribute(
    "data-active",
    resultCount > 0);
	
	var hasSearch = input.value.trim() !== "";
	var shouldExpand = hasSearch && resultCount > 0;

	document.querySelectorAll("#search-row ~ tr details").forEach(function(detail) {
		detail.open = false;
		detail.open = shouldExpand;
	});
}

function getUrlParameter(name) {
    var url = window.location.search.substring(1);  // Get query string without the '?' character
    var urlParams = new URLSearchParams(url);
    return urlParams.get(name);  // Get value of the parameter 'name'
}

window.onload = function() {
    // Check if the 'search' parameter exists in the URL
    var searchQuery = getUrlParameter('filter');
    if (searchQuery) {
        var searchInput = document.getElementById("search-bar");
		
		var exactMatchCheckbox = document.getElementById("search-exact");
        
        
		if(searchQuery=="new-syllabus"){searchQuery = "2019-24"}
        searchInput.value = searchQuery;  // Set the input value to the search query from the URL
		exactMatchCheckbox.checked = true;
        filterTable();  // Trigger the table filtering function
    }
}
