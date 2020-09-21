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


function passwordentry(e) {
  var key = document.getElementById("dkey").value;
  var seed = 17
  var date = new Date();
  var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
  var pkey = (Math.floor(date.getTime()/MILLIS_PER_DAY)+25569)*seed
  if(key == pkey)
  {
    a="<img src=\"https://thsconline.github.io/s/images/icon_link.png\">&nbsp;&nbsp;<a class=\"no x\" href=\"https://thsconline.github.io/s/fz/"+key+"/home/\">Click to continue</a>";
  }
  else
  {
    a = "<b><span style=\"color:red;\">Incorrect passkey entered!</span></b>"
  }
  document.getElementById("mycollection").innerHTML = a
}


function jumpToCollection(e) {
    var searchidx = document.getElementById("serve").value;
    var qx = document.getElementById("selector");
  var key = document.getElementById("dkey");
   var a = " "
   
   try
   {
  

  
if(qx == 0)
  
{
if(searchidx=="thsconline"){var searchidx="1-thsc!t_Y_t_lJOR_t_J2U0_t_WWGExR_q_"};
// if(searchidx=="conquerHSC"){var searchidx="_mw_XNhRUt_mw!t_DI4REtqWm11_mw_0dj_t_G9z_t_Utfa_t_pH_c4_kp_2_O_c4_hI"};
if(searchidx=="spiralflex"){var searchidx="_mw_EI0SGRRN_c4!2_wO_t_Fo_c4_FpISk1PRlF6UjJaU1lWaw"};  
// if(searchidx=="shaddy_hanna"){var searchidx="_mw_EI4N_c4_J_t_cW_2_uSk9i_mw_W_t_IRmpORGRG_2_E_t_kcGFYYw"}
if(searchidx=="UOWmaths"){var searchidx="_mw_UFraXpDcm_t_P_80_Dlh_c4_F_2_v_q!t_BHWjJCd3BR_2_0_t_kdmk1azlk"};
if (searchidx=="stage5"){var searchidx="2-thsc_RURkhUbG_q_2_2!t_RBdGRq_2_w"}; if (searchidx=="stage6"){var searchidx="2-thsc!t_tNWxNSE_2_Y_c4_mtGU_t_JuYw"}; if (searchidx=="competitions"){var searchidx="1-thsc_pIcE9j_mw_0Y0U_t_U1_t_FNUQ_q_"}; if (searchidx=="thsconline"){var searchid="0ByEFYhkkDQBKUXVRNERvSEVXa1E"} 

  var searchidy=searchidx.replace(/!/g, "__").replace(/2-thsc_/, "thsc_2").replace(/1-thsc_/, "thsc_1").replace(/0-thsc_/, "thsc_0").replace("thsc_", "MEJ5RUZZaGtrRFFCS").replace(/_t_/g, "V").replace(/_mw_/g, "M").replace(/_q_/g, "Q").replace(/_c4_/g, "T").replace(/_80_/g, "b").replace(/_2_/g, "Z")
  var searchid = decryptM(searchidy+"==")  

  try {var title =DriveApp.getFolderById(searchid).getName();} catch (err){return ""}   

  
  a="<img src=\"https://thsconline.github.io/s/images/icon_folder.png\">&nbsp;&nbsp;<a class=\"no x\" href=\"https://script.google.com/macros/s/AKfycbx1Kjw1qniJW7HXsNSMeyJeQ45BzdCFlcEXouvlvb6he15FPHg/exec?serve="+searchidx+"&dkey="+key+"\">"+ title + "</a>";
}
if(qx == 1)
  
{
    try {var title =DriveApp.getFolderById(searchidx).getName();} catch (err){return ""}   
   a="<img src=\"https://thsconline.github.io/s/images/icon_folder.png\">&nbsp;&nbsp;<a class=\"no x\" href=\"https://script.google.com/macros/s/AKfycbx1Kjw1qniJW7HXsNSMeyJeQ45BzdCFlcEXouvlvb6he15FPHg/exec?serve=drive&id="+searchidx+"&dkey="+key+"\">"+ title + "</a>"
}
  
  document.getElementById("mycollection").innerHTML = a
} 
catch(err)
{
 document.getElementById("mycollection").innerHTML = "";
}
}













