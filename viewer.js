function writeshell(http)
{
	document.title = http.title;
	document.write(http.htmlcontent); 
	location.href = window.location.hash;  
	

 var tags = document.getElementById('gs');
 for (var i = tags.length; i >= 0; i--){ //search backwards within nodelist for matching elements to remove
   tags[i].parentNode.removeChild(tags[i]); //remove element by calling parentNode.removeChild()
 }

}



function loadshell()
{
	var url = window.location.pathname;
	var url = url.replace("&", "_");
	var queryx = url.split("/s/")[1].split("/")[0]
		
	switch(queryx)
	{
	case "download":
	try
	{
		var rest = url.split("/s/download/")[1]
		window.location = "https://thsconline.github.io/s/d/"+rest
	}

	catch(err)
	{
		window.location = "/s/"
	}			
	break;		
	case "app":
	case "cmdtool":
	case "cli":
	window.location = "/cli/"
	break;
	
	case "d":
		//try
		//{
			var viewno = url.split("/s/d/")[1].split("/")[0]
			var titlex = url.split("/s/d/")[1].split("/")[1]
			var hashvalue = SHA256(viewno)
			document.write("<html><body><br><script src=\"\/s\/download.js\" type=\"text\/javascript\"></script><script id=\"gs\" type=\"application/javascript\" src=\"https:\/\/script.google.com\/macros\/s\/AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-\/exec?export=data&field="+titlex+"&base="+viewno+"&hash="+hashvalue+"\"></script></body></html>");
			document.title = unescape(titlex);
		/*}
		catch(err)
		{
			window.location = "/s/"
		}*/
		
		break;
	case "frenzy":
	try
	{
		var rest = url.split("/s/frenzy/")[1]
		window.location = "https://thsconline.github.io/s/fz/"+rest
	}
			
	catch(err)
	{
		window.location = "/s/fz/"
	}
	break;			
	case "fz":	
		try
		{
			var dkey = url.split("/s/fz/")[1].split("/")[0]
			var serve = url.split("/s/fz/")[1].split("/")[1]
			if(dkey == "add" || dkey == "legacycode")
			{
				if(dkey == "add")
				{
					window.location = "https://script.google.com/macros/s/AKfycbwC-lfayYHGsDeJKj-qdhiEUFbJS8GnCJg40R9SNhwXkypkIObK/exec"
				}
				if(dkey == "legacycode")
				{
					window.location = "https://script.google.com/macros/s/AKfycbwXHIZV9nurettlm_BvEqowP1Ky2cNlzQ4glcAENH_XdQ2L_YuDbCULFJgbM9RQbIPQ/exec?rtype=LEGACYCODE&serve="+serve
				}
			}
			else
			{
				document.write("<head><title>thsconline (loading...)</title><meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\" />")
				document.write("<meta name=\"viewport\" content=\"initial-scale=1, minimum-scale=1, width=device-width\" \/>")
				document.write("<meta http-equiv=\"content-type\" content=\"text\/html; charset=utf-8\" />")
				document.write("<link href=\"\/s\/styles.css\" rel=\"stylesheet\" type=\"text\/css\" />")
				document.write("<script src=\"https:\/\/ajax.googleapis.com\/ajax\/libs\/jquery\/1.6.4\/jquery.min.js\" type=\"text\/javascript\"><\/script>");
				document.write("<script src=\"/s/viewer.js\" type=\"text\/javascript\"><\/script>");
				document.write("<script id=\"gs\" type=\"application\/javascript\" src=\"https:\/\/script.google.com\/macros\/s\/AKfycbwXHIZV9nurettlm_BvEqowP1Ky2cNlzQ4glcAENH_XdQ2L_YuDbCULFJgbM9RQbIPQ\/exec?rtype=JSONP&serve="+ serve +"&dkey="+dkey+"\"><\/script><\/head>");
			}
		}
		catch(err)
		{
			window.location = "/s/"
		}	
		break;
	
	case "images":
		document.write("")
	break;
	case "pkey":
		var date = new Date()
  		var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

		var checkv = url.split("/s/pkey/")[1].split("/")[0]
		if(checkv == "yesterday")
			{
				checkv = -1;
			}
			if(checkv == "today")
			{
				checkv = 0;
			}
			if(checkv == "tomorrow")
			{
				checkv = 1
			}
		var checkw = url.split("/s/pkey/")[1].split("/")[1]
		var checkx = url.split("/s/pkey/")[1].split("/")[2]
		var key = (Math.floor(date.getTime()/MILLIS_PER_DAY)+25569+-(1-checkv)+1)*17
		if(checkw == "print" && checkx == "key")
		{			
			document.write(key)	
		}
	break;
	case "upload":
		window.location = "/s/upload/"
	break;
	case "view":
	try
	{
		var rest = url.split("/s/view/")[1]
		window.location = "https://thsconline.github.io/s/v/"+rest
	}
	catch(err)
	{
		window.location = "/s/"
	}
	break;
	case "v_standalone":
	var viewno = url.split("/s/v_standalone/")[1].split("/")[0]
	var titlex = url.split("/s/v_standalone/")[1].split("/")[1]		
	if(window.self !== window.top)
			{
				//win=window.open("about:blank","_blank");
				//if (window.focus) {win.focus()}
			}
			else
			{
				win=window.open("about:blank","_self");
				if (window.focus) {win.focus()}		
			}
			win.document.write("<html><head><title>"+titlex+"</title><meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\">");
			win.document.write("<meta http-equiv=\"content-type\" content=\"text\/html; charset=utf-8\"><link rel=\"shortcut icon\" type=\"image\/x-icon\" href=\"https:\/\/thsconline.github.io\/s\/images\/icon_pdf2.png\">");
			win.document.write("<link href=\"\/s\/styles.css\" rel=\"stylesheet\" type=\"text\/css\">");
			win.document.write("<style>html, body {height:100% !important;}</style>");
			win.document.write("<script src=\"https:\/\/ajax.googleapis.com\/ajax\/libs\/jquery\/1.6.4\/jquery.min.js\" type=\"text\/javascript\"><\/script>");
			win.document.write("<\/head><body>");
			win.document.write("<iframe style=\"width:100%; height:96%;\" height=\"96%\" sandbox=\"allow-scripts allow-popups allow-pointer-lock allow-presentation allow-same-origin allow-modals allow-top-navigation allow-downloads\" allowscripts=\"1\" allowdownloads=\"1\" allowfullscreen=\"1\" frameborder=\"0\" id=\"viewer\" src=\"https:\/\/script.google.com\/macros\/s\/AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-\/exec?&export=view&field="+titlex+"&base="+viewno+"\"><noscript>&nbsp;Enable Javascript to Load File<\/noscript><\/iframe>");
			win.document.write("</body></html>"); 	 
			win.document.title = unescape(titlex);			
	break;
	case "v":
		try
		{
			var viewno = url.split("/s/v/")[1].split("/")[0]
			var titlex = url.split("/s/v/")[1].split("/")[1]	
			var redirecturl = "https://thsconline.github.io/s/v/" + url.split("/s/v/")[1]
			if(window.self !== window.top)
			{
				win=window.open("about:blank","_blank");
				if (window.focus) {win.focus()}
			}
			else
			{
				win=window.open("about:blank","_self");
				if (window.focus) {win.focus()}		
			}
			win.document.write("<html><head><title>"+titlex+"</title><meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\">");
			win.document.write("<meta http-equiv=\"content-type\" content=\"text\/html; charset=utf-8\"><link rel=\"shortcut icon\" type=\"image\/x-icon\" href=\"https:\/\/thsconline.github.io\/s\/images\/icon_pdf2.png\">");
			win.document.write("<link href=\"\/s\/styles.css\" rel=\"stylesheet\" type=\"text\/css\">");
			win.document.write("<style>html, body {height:100% !important;}</style>");
			win.document.write("<script src=\"https:\/\/ajax.googleapis.com\/ajax\/libs\/jquery\/1.6.4\/jquery.min.js\" type=\"text\/javascript\"><\/script>");
			win.document.write("<\/head><body>");			
			win.document.write("<div id=\"overlaybar\" style=\"z-index:1000\; width:100%;\">"+ unescape(titlex) +"<span id=\"overlayinsert\" style=\"float:right !Important\"><!--<a target=\"blank\" href=\"https://thsconline.github.io/s/d/"+viewno+"/"+titlex+"\" class=\"border\">Download File<\/a>&nbsp;&nbsp;--><a class=\"border\" href=\"#v\" onclick=\"window.close()\">Close &#215;</span></div><br>")
			win.document.write("<iframe style=\"width:100%; height:96%;\" height=\"96%\" sandbox=\"allow-scripts allow-popups allow-pointer-lock allow-presentation allow-same-origin allow-modals allow-top-navigation allow-downloads\" allowscripts=\"1\" allowdownloads=\"1\" allowfullscreen=\"1\" frameborder=\"0\" id=\"viewer\" src=\"https:\/\/script.google.com\/macros\/s\/AKfycbx69GPoJtf9sSevsUbWtPr46vpa01u4oNkHjFmkkWxmj62AZ0q-\/exec?&export=view&field="+titlex+"&base="+viewno+"\"><noscript>&nbsp;Enable Javascript to Load File<\/noscript><\/iframe>");
			win.document.write("</body></html>"); 	 
			win.document.title = unescape(titlex);
		}
		catch(err)
		{
			window.location = "/s/"
		}
	break;
	case "yr9":
	try
	{
		var rest = url.split("/s/yr9/")[1]
		window.location = "https://thsconline.github.io/s/files/yr9/"+rest
	}
	catch(err)
	{
		window.location = "/s/"
	}
	break;
	case "yr10":
	try
	{
		var rest = url.split("/s/yr10/")[1]
		window.location = "https://thsconline.github.io/s/files/yr10/"+rest
	}
	catch(err)
	{
		window.location = "/s/"
	}
	break;
	case "yr11":
	try
	{
		var rest = url.split("/s/yr11/")[1]
		window.location = "https://thsconline.github.io/s/files/yr11/"+rest
	}
	catch(err)
	{
		window.location = "/s/"
	}
	break;
	case "yr12":
	try
	{
		var rest = url.split("/s/yr12/")[1]
		window.location = "https://thsconline.github.io/s/files/yr12/"+rest
	}
	catch(err)
	{
		window.location = "/s/"
	}
	break;
	default:
		window.location = "/s/"
	break;
	}
}

function pdf(input, viewno)
{
    var titlex = input.innerHTML;
/*	
	
if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) { */
	 window.open("https://thsconline.github.io/s/v/"+viewno+"/"+titlex);	    
/*  }
    else
    {

    try
    {
	document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"))
    }
    catch(err)
    {
    }
	    
   var i = document.createElement('div');	    
   document.body.appendChild(i);    
   i.innerHTML = "<div id=\"overlaybar\" style=\"position: fixed; z-index:100; bottom: 20px !important; left: 0px; height:20px; width:100%;\">"+ titlex +"<span id=\"overlayinsert\" style=\"float:right !Important\"><a target=\"_blank\" href=\"https://thsconline.github.io/s/v/"+viewno+"/"+titlex+"\" class=\"border\" onclick=\"document.getElementById('overlaybar').parentNode.removeChild(document.getElementById('overlaybar'));\">View File<\/a><!--&nbsp;&nbsp;<a target=\"_blank\" href=\"https://thsconline.github.io/s/d/"+viewno+"/"+titlex+"\" class=\"border\" onclick=\"document.getElementById('overlaybar').parentNode.removeChild(document.getElementById('overlaybar'));\" >Download File<\/a>-->&nbsp;&nbsp;<a class=\"border\" href=\"#v\" onclick=\"document.getElementById('overlaybar').parentNode.removeChild(document.getElementById('overlaybar'));\">Close &#215;</span></div><br>"
   /* var i = document.createElement('iframe');
    i.style.display = 'none';
    i.src = "https://thsconline.github.io/s/v/"+viewno+"/"+titlex;
    document.body.appendChild(i);*/
//	setTimeout(function(){document.getElementById("overlaybar").parentNode.removeChild(document.getElementById("overlaybar"));}, 10000);
    //}
//    return false;
}

String.prototype.capitalize = function(){
       return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
      }

function jumpToCollection() {
    	var searchidx = document.getElementById("serve").value;
    	var qx = document.getElementById("selector").value;
 	var key = document.getElementById("dkey").value;
     	window.location = "https://thsconline.github.io/s/fz/"+key+"/"+searchidx+"/"
}

function passwordentry()
{
	var key = document.getElementById("dkey").value;
	window.location = "https://thsconline.github.io/s/fz/"+key+"/home/"
}

function toggleView(id1, id2)
{
    var x = document.getElementById(id1).style.display;
    var y = document.getElementById(id2).style.display;   
    
    document.getElementById(id2).style.display=x;
    document.getElementById(id1).style.display=y;
}

function getParameterByName(name, defaultx, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return defaultx;
    if (!results[2]) return defaultx;
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**

*

*  Secure Hash Algorithm (SHA256)

*  http://www.webtoolkit.info/

*

*  Original code by Angel Marin, Paul Johnston.

*

**/

 


function SHA256(s){

 


    var chrsz   = 8;


    var hexcase = 0;

 


    function safe_add (x, y) {


        var lsw = (x & 0xFFFF) + (y & 0xFFFF);


        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);


        return (msw << 16) | (lsw & 0xFFFF);


    }

 


    function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }


    function R (X, n) { return ( X >>> n ); }


    function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }


    function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }


    function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }


    function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }


    function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }


    function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }

 


    function core_sha256 (m, l) {


        var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);


        var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);


        var W = new Array(64);


        var a, b, c, d, e, f, g, h, i, j;


        var T1, T2;

 


        m[l >> 5] |= 0x80 << (24 - l % 32);


        m[((l + 64 >> 9) << 4) + 15] = l;

 


        for ( var i = 0; i<m.length; i+=16 ) {


            a = HASH[0];


            b = HASH[1];


            c = HASH[2];


            d = HASH[3];


            e = HASH[4];


            f = HASH[5];


            g = HASH[6];


            h = HASH[7];

 


            for ( var j = 0; j<64; j++) {


                if (j < 16) W[j] = m[j + i];


                else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);

 


                T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);


                T2 = safe_add(Sigma0256(a), Maj(a, b, c));

 


                h = g;


                g = f;


                f = e;


                e = safe_add(d, T1);


                d = c;


                c = b;


                b = a;


                a = safe_add(T1, T2);


            }

 


            HASH[0] = safe_add(a, HASH[0]);


            HASH[1] = safe_add(b, HASH[1]);


            HASH[2] = safe_add(c, HASH[2]);


            HASH[3] = safe_add(d, HASH[3]);


            HASH[4] = safe_add(e, HASH[4]);


            HASH[5] = safe_add(f, HASH[5]);


            HASH[6] = safe_add(g, HASH[6]);


            HASH[7] = safe_add(h, HASH[7]);


        }


        return HASH;


    }

 


    function str2binb (str) {


        var bin = Array();


        var mask = (1 << chrsz) - 1;


        for(var i = 0; i < str.length * chrsz; i += chrsz) {


            bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);


        }


        return bin;


    }

 


    function Utf8Encode(string) {


        string = string.replace(/\r\n/g,"\n");


        var utftext = "";

 


        for (var n = 0; n < string.length; n++) {

 


            var c = string.charCodeAt(n);

 


            if (c < 128) {


                utftext += String.fromCharCode(c);


            }


            else if((c > 127) && (c < 2048)) {


                utftext += String.fromCharCode((c >> 6) | 192);


                utftext += String.fromCharCode((c & 63) | 128);


            }


            else {


                utftext += String.fromCharCode((c >> 12) | 224);


                utftext += String.fromCharCode(((c >> 6) & 63) | 128);


                utftext += String.fromCharCode((c & 63) | 128);


            }

 


        }

 


        return utftext;


    }

 


    function binb2hex (binarray) {


        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";


        var str = "";


        for(var i = 0; i < binarray.length * 4; i++) {


            str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +


            hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);


        }


        return str;


    }

 


    s = Utf8Encode(s);


    return binb2hex(core_sha256(str2binb(s), s.length * chrsz));

 

}