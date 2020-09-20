function loadshell()
{	
	// var folder = document.getElementsByClassName("shell")[0].getAttribute("data-hash");
	// var fname = document.getElementsByClassName("shell")[0].getAttribute("data-filename");
	var url = window.location.pathname;
	var url = url.replace("&", "_");
	// var fname = url.substring(url.lastIndexOf('/')+1);z
	
	var dkey = url.split("/s/fz/")[1].split("/")[0]
	var serve = url.split("/s/fz/")[1].split("/")[1]
	

// <title>THSC Online - HSC Resources</title>
	document.write("<head><title>thsconline (loading...)</title><meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\" />")
	document.write("<meta name=\"viewport\" content=\"initial-scale=1, minimum-scale=1, width=device-width\" \/>")
	document.write("<meta http-equiv=\"content-type\" content=\"text\/html; charset=utf-8\" />")
	document.write("<link href=\"\/s\/styles.css\" rel=\"stylesheet\" type=\"text\/css\" />")
	document.write("<script src=\"https:\/\/ajax.googleapis.com\/ajax\/libs\/jquery\/1.6.4\/jquery.min.js\" type=\"text\/javascript\"><\/script>");

	document.write("<script type=\"application\/javascript\" src=\"https:\/\/script.google.com\/macros\/s\/AKfycbx1Kjw1qniJW7HXsNSMeyJeQ45BzdCFlcEXouvlvb6he15FPHg\/exec?rtype=JSONP&serve="+ serve +"&dkey="+dkey+"\"><\/script><\/head>");
	
}

function writeshell(http)
{
	document.title = http.title;
	document.write(http.htmlcontent); 
	location.href = window.location.hash;  
}

String.prototype.capitalize = function(){
       return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
      }
