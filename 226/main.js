function successbar(message) {
	var i = document.createElement('div');
	document.body.appendChild(i);
	i.innerHTML = "<div id=\"overlaybar\" style=\"background-color:#00833D !important; position: fixed !important; z-index:2000; font-size:16px; bottom: 82px !important; left: 0px; height:28px;width:100%\"><i style=\"font-size:16px; !important; color:white\" class=\"material-icons\">check</i>&nbsp;&nbsp;" + message + "</div>"
	try {
		setTimeout(function () {
			document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"));
		}, 4000);
	} catch (err) {

	}
}