function closeoverlaybar() {
	try {
		var elems = document.querySelectorAll(".selected");

		[].forEach.call(elems, function (el) {
			el.classList.remove("selected");
		});
	} catch (err) {

	}

	try {
		document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"))
	} catch (err) {

	}
}

function overlaybar(input) {
	try {
		var elems = document.querySelectorAll(".selected");

		[].forEach.call(elems, function (el) {
			el.classList.remove("selected");
		});
	} catch (err) {

	}
	input.className = "selected"

	try {
		document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"))
	} catch (err) {

	}

	var i = document.createElement('div');
	document.body.appendChild(i);


	i.innerHTML = "<div id=\"overlaybar\" style=\"position: fixed !important; z-index:2000; font-size:16px; bottom: 82px !important; left: 0px; height:28px;width:100%\"><span id=\"overlaylabel\"></span><span id=\"overlayinsert\" style=\"float:right !Important\"><a href=\"#\" class=\"border\" onclick=\"viewEditPanel('copy')\">Copy <i class=\"material-icons\">content_copy</i></a>&nbsp;&nbsp;<a href=\"#\" class=\"border\" onclick=\"viewEditPanel('edit')\">Edit <i class=\"material-icons\">edit</i></a>&nbsp;&nbsp;<a class=\"border\" href=\"#v\" onclick=\"closeoverlaybar();\">Close ×</a></span></div>"
	document.getElementById('page-wrapper').appendChild(i);
}

function viewEditPanel(switchvalue) {
	try {
		document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"))
	} catch (err) {

	}


	document.getElementById("mainPanel").style.display = "none";
	document.getElementById("editPanel").style.display = "inline-block";

	if (switchvalue == "new") {
		document.getElementById("editPanel-heading").innerHTML = "<i class=\"material-icons\">edit</i>&nbsp;&nbsp;New Project"
	} else {
		document.getElementById("editPanel-heading").innerHTML = "<i class=\"material-icons\">edit</i>&nbsp;&nbsp;Edit Project"
	}

	var config = {
		'.chosen-select': {},
		'.chosen-select-deselect': {
			allow_single_deselect: true
		},
		'.chosen-select-no-single': {
			disable_search_threshold: 26
		},
		'.chosen-select-no-results': {
			no_results_text: 'Not found!'
		},
		'.chosen-select-width': {
			width: "100%"
		}
	}
	for (var selector in config) {
		$(selector).chosen(config[selector]);
	}



}

function viewMainPanel() {
	try {
		var elems = document.querySelectorAll(".selected");

		[].forEach.call(elems, function (el) {
			el.classList.remove("selected");
		});
	} catch (err) {

	}

	try {
		document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"))
	} catch (err) {

	}
	document.getElementById("mainPanel").style.display = "inline-block";
	document.getElementById("editPanel").style.display = "none";

}