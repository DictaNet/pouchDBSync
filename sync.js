$(function(){     
	
	window.attachments = new Array();	
	// local database, that lives in the browser's IndexedDB store
	var localDB = new PouchDB('contacts');
	// remote CouchDB 
	var remoteDB = new PouchDB('https://5e9daaed.ngrok.io/contacts');	
	var attachment_name = "";
	var attachment_content_base64 = "";
		
	/*********************************************************
		Display Contacts
	**********************************************************/
	// when the site loads in the browser, load all contacts
  	loadContacts();
	
	function populateContactsData(_id){		
		
		remoteDB.get(_id, function(err, contact) {
		    if (err) {
				return console.log(err);
		    }
			else {			
			  //console.log(contact);			   
			   var newContact = '<tr><td>' + contact._id + '|' + contact._rev + '</td><td>' + contact.Name + '</td><td>' + contact.Mobile + '</td><td>' + contact.Email + '</td><td>' +
				   					'<button type="button" class="btn btn-default attachment"><input type="hidden" id="'+ contact.Attachment.split('|')[0] +'" value="'+ contact.Attachment.split('|')[1]+
				   						'" class="form-control attachment_B64_data" readonly><span class="glyphicon glyphicon-file"></span>' + contact.Attachment.split('|')[0] +' </button>' + '</td></tr>'			   
			   var newContactWithoutAttachment = '<tr><td>' + contact._id + '|' + contact._rev + '</td><td>' + contact.Name + '</td><td>' + contact.Mobile + '</td><td>' + contact.Email + '</td><td>' +'</td></tr>';			  
				
			   if(contact.Attachment.split('|')[0]){				
				   $("#contactList tbody").append(newContact);	
				   attachments.push(contact.Attachment);			   	     
			   }else{
				  $("#contactList tbody").append(newContactWithoutAttachment);  
			   }				
		   }
		});		
	}
		
	/*********************************************************
	//Reading the contents of a Document from Remote CouchDB
	**********************************************************/	
    function loadContacts() {		
		clearContactList();
		remoteDB.allDocs({startkey: "rmo_", endkey: "rmo_\ufff0"},function(err, docs) {			
		   if (err) {
			  return console.log(err);
		   } else {			  
				var i=0;
				for (i; i < docs.rows.length; i++) { 
					populateContactsData(docs.rows[i].id);
				}
				i=0;
		   }		
		});	
  	}
			
	function clearContactList(){
		$("#contactList_body").empty();		
	}	
	
	/********************************************************************************
		Insert Data to local PouchDB (which inturn will be synced to remote CouchDB )
	*********************************************************************************/
	
	$('#contactForm').submit(function(event) {
    	event.preventDefault();
		var uniqueId = Math.random().toString(36).substring(2) + (new Date()).getTime().toString(36);
		var name = $('#name').val();
		var email = $('#email').val();
		var mobile = $('#mobile').val();
		var doc = {
			"_id" : "rmo_" + uniqueId,
			"Name" : name,
			"Email" : email,
			"Mobile" : mobile,
			"Attachment" : attachment_name + "|" +attachment_content_base64 
			/*"_attachments":
				{
				  attachment_name:
				  {
					"content_type": "application/pdf",
					"data": attachment_content_base64
				  }
				}
			*/
		}
	
		localDB.put(doc).then(function (response) {
			console.log("Document created Successfully", response)
		  }).then(function (err) {
			console.log("Error", err)
		  });	
		
    	$('#contactForm')[0].reset();
		//location.reload();	
    });
		
	/********************************************************************************
		Remove Data from local PouchDB (which inturn will be synced to remote CouchDB )
	*********************************************************************************/
	function deleteDoc(_id, _rev){			
		
		localDB.remove(_id, _rev, function(err) {
		   if (err) {
			  return console.log(err);
		   } else {
			  console.log("Document deleted successfully");
		   }
		});				
	}
	
	/***********************************************************
		PouchDB Sync Events 
	************************************************************/	
	// keeps syncing changes as they occur		
	var sync = PouchDB.sync(localDB, remoteDB, {
	  live: true,
	  retry: true
	}).on('change', function (info) {
	  // handle change			
		 loadContacts();
	}).on('paused', function (err) {
	  // replication paused (e.g. replication up to date, user went offline)
	}).on('active', function () {
	  // replicate resumed (e.g. new changes replicating, user went back online)
	}).on('denied', function (err) {
	  // a document failed to replicate (e.g. due to permissions)
	}).on('complete', function (info) {
	  // handle complete
	}).on('error', function (err) {
	  // handle error
	});
		
	/***********************************************************
		Processing attachment before uploading to Database
	************************************************************/	  	
	
	$(document).on('change', ':file', function() {
    	var input = $(this),
        	numFiles = input.get(0).files ? input.get(0).files.length : 1,
        	label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    	input.trigger('fileselect', [numFiles, label]);
  	});
	
  	$(document).ready( function() {
		$(':file').on('fileselect', function(event, numFiles, label) {

			var input = $(this).parents('.input-group').find(':text'),
				log = numFiles > 1 ? numFiles + ' files selected' : label;

		  	if( input.length ) {
				input.val(log);
			  	handleFileSelect(event);
		  	} else {
				if( log ) alert(log);
		  	}

	  	});
  	});
	
	function handleFileSelect(evt) {		
	  var f = evt.target.files[0]; // FileList object
	  var reader = new FileReader();
	  // Closure to capture the file information.
	  reader.onload = (function(theFile) {
		return function(e) {
		  var binaryData = e.target.result;
		  //Converting Binary Data to base 64
		  attachment_content_base64 = window.btoa(binaryData);
		  attachment_name = theFile.name;
		  console.log(attachment_content_base64);				
		};
	  })(f);	  
	  // Read in the image file as a data URL.
	  reader.readAsBinaryString(f);					
	}
		
	/***********************************************************
				Displaying Attachments
	************************************************************/
	
	function Viewer(base64data){
				
		if(base64data){			
			var decodedContent = atob(base64data.split('|')[1]);
			var byteArray = new Uint8Array(decodedContent.length)
			for(var i=0; i<decodedContent.length; i++){
				byteArray[i] = decodedContent.charCodeAt(i);
			}
			var extension = base64data.split('|')[0].trim().split('.').pop();
			var applicationType = "application/" + extension;   			
			var img_exts = ["png","jpg", "PNG","JPG"];
			var doc_exts = ["pdf","txt","docx"];													
			
			var blob = new Blob([byteArray.buffer], { type: applicationType });
			var _url = URL.createObjectURL(blob);
            
			if ( $.inArray(extension.trim(), doc_exts) > -1 ) {				
				var win = window.open(_url, base64data.split('|')[0], "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=800,top="+(screen.height-950)+",left="+(screen.width-840));
			}
			
			if ( $.inArray(extension.trim(), img_exts) > -1 ) {
				applicationType = "data:image/png;base64,";
				var d = window.open('','',"toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=500,height=500,top="+(screen.height-650)+",left="+(screen.width-840)).document;
					d.write(''); d.close();
					d.body.appendChild(document.createElement('img')).src = applicationType + base64data.split('|')[1];				
			}			
		}		
	}		
	
	$('#contactList').on('click','.attachment', function(){		
		var fname = $(this).text();					
		var i=0;		
		for (i; i < attachments.length; i++) 
		{ 							
			if( fname.trim() == attachments[i].split('|')[0].trim()){				
				Viewer(attachments[i]);	
			}			
		}				
	});		
	
	/***********************************************************
		 ContextMenu to delete document from localDB
	************************************************************/
	$(function () {
		var $contextMenu = $("#contextMenu");
		var $rowClicked;

		$("body").on("contextmenu", "table tr", function (e) {
			$rowClicked = $(this)

			var pageWidth = $(window).width();
			var menuWidth = $contextMenu.width();
			var leftPosition = e.pageX + menuWidth > pageWidth ? e.pageX - menuWidth : e.pageX;

			$contextMenu.css({
				display: "block",
				left: leftPosition,
				top: e.pageY
			});
			return false;
		});

    	$contextMenu.on("click", "a", function () {
		
			if($(this).text().trim() == "Delete"){
				var td_val =$rowClicked.children("*")[0].innerHTML;
				deleteDoc(td_val.split('|')[0].trim(), td_val.split('|')[1].trim());        	
			}
			$contextMenu.hide();		
		});

		$(document).click(function () {
			$contextMenu.hide();
		});				

	});	
	
});

