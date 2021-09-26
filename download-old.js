// https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
// https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link
function downloadfile(myobject)
{	
	try
	{
	var fileData = myobject.data;
	var filename = myobject.name;
	var mimetype = myobject.mimetype;	
	document.write("<body><b>Downloading file: </b><br>"+filename+"</body>");
	const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
		const byteCharacters = atob(b64Data);
		const byteArrays = [];

		for (let offset = 0; offset < byteCharacters.length; offset += sliceSize)
		{
			const slice = byteCharacters.slice(offset, offset + sliceSize);
			const byteNumbers = new Array(slice.length);
			for (let i = 0; i < slice.length; i++)
			{
				byteNumbers[i] = slice.charCodeAt(i);
			}

			const byteArray = new Uint8Array(byteNumbers);
			byteArrays.push(byteArray);
		}
		const blob = new Blob(byteArrays, {type: contentType});
		return blob;
	}
	const blob = b64toBlob(fileData, mimetype);
	//const blobUrl = URL.createObjectURL(blob);

	 if (window.navigator.msSaveOrOpenBlob) {
	    window.navigator.msSaveOrOpenBlob(blob, filename);
	  } else {
	    const a = document.createElement('a');
	    document.body.appendChild(a);
	    const url = window.URL.createObjectURL(blob);
	    a.href = url;
	    a.download = filename;
	    a.click();
	    setTimeout(() => {
	      window.URL.revokeObjectURL(url);
	      document.body.removeChild(a);
	    }, 0)
	  }	

     	
	}
	catch(err)
	{
	var filename = url.substring(url.lastIndexOf('/')+1);
	document.write("<body style=\"font-color:red; !important\"><b>Downloading failed for file: </b>"+filename+"</body>");	 
	}
	// setTimeout(function(){redirect(myobject)}, 5000);
	
}
