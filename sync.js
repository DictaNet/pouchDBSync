 var data_url;
 var attachments = new Array();	

$(function(){     	
	// local database, that lives in the browser's IndexedDB store
	var localDB = new PouchDB('contacts');
	// remote CouchDB 
	var remoteDB = new PouchDB('https://4ae56e42.ngrok.io/contacts');	
	var attachment_name = "";
	var attachment_content_base64 = "";
	var attachment_blob = "";
	var  attachment_type = "";
	var att_data;
	$("#contextMenu").hide();
	
	/*********************************************************
	//Reading the contents of a Document from Remote CouchDB
	**********************************************************/	
    function loadContacts() {		
		clearContactList();
		remoteDB.allDocs({include_docs: true,attachments : true, attachment_format: 'base64', startkey: "rmo_", endkey: "rmo_\ufff0"},function(err, docs) {			
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
	
	/*********************************************************
		Display Contacts
	**********************************************************/
	// when the site loads in the browser, load all contacts
  	loadContacts();
		
	function populateContactsData(_id){				
		
		var audio_exts = ['wav', 'mp3', 'mp4', 'm4a', 'ogg', 'wma' ];	
		var  blob_url ;
		
		remoteDB.get(_id, {attachments: true}).then(function (contact) { 
			 //console.log(contact);		
			  var newContact = '';
			  var fileExt = contact.FileName.split('.').pop();	
			  var contenttype = JSON.stringify(contact._attachments.attachment_name.content_type);
			 
              var ui_attachment = '<button id="'+ contact._id +'" type="button" class="btn btn-default attachment"'+'"><span class="glyphicon glyphicon-file"></span>' + contact.FileName +'</button>'+'</td></tr>';
			  newContact = '<tr><td>' + contact._id + '|' + contact._rev + '</td><td>' + contact.Name + '</td><td>' + contact.Mobile + '</td><td>' + contact.Email + '</td><td>' + ui_attachment;			
			  
              var newContactWithoutAttachment = '<tr><td>' + contact._id + '|' + contact._rev + '</td><td>' + contact.Name + '</td><td>' + contact.Mobile + '</td><td>' + contact.Email + '</td><td>' +'</td></tr>';			  
				
			   if(contact.FileName){				   
				   $("#contactList tbody").append(newContact);	
				   attachments.push(contact.FileName);	
			   }else{
				  $("#contactList tbody").append(newContactWithoutAttachment);  
			   }
		});		
	}
	
	/********************************************************************************
		Insert Data to local PouchDB (which inturn will be synced to remote CouchDB )
	*********************************************************************************/
	
	$('#contactForm button').click(function(event) {				
    	event.preventDefault();		
		var uniqueId = Math.random().toString(36).substring(2) + (new Date()).getTime().toString(36);
		var _id =  $('#id_rev').val().split('|')[0];
		var _rev = $('#id_rev').val().split('|')[1];
		var name = $('#name').val();
		var email = $('#email').val();
		var mobile = $('#mobile').val();
		var doc = '';
		
		if ($(this).attr("value") == "save") {			
			doc = {
				_id : "rmo_" + uniqueId,
				Name : name,
				Email : email,
				Mobile : mobile,
				FileName : attachment_name,
				_attachments:
				{
					attachment_name:
					{
						type: attachment_type,
						data :attachment_blob
					}
				}
			}
				
			localDB.put(doc).then(function (response) {
				console.log("Document created Successfully", response)
			  }).then(function (err) {
				console.log("Error", err)
			  });				
		}
		
		if ($(this).attr("value") == "update") {				
			doc = {			
				"_rev" : _rev,
				"_id" : _id,
				"Name" : name,
				"Email" : email,
				"Mobile" : mobile,
				"FileName" : attachment_name,
				"_attachments":
				{
					attachment_name:
					{
						type: attachment_type,
						data :attachment_blob
					}
			    }
		   }			
			
			localDB.put(doc).then(function (response) {
				console.log("Document updated Successfully", response)
			  }).then(function (err) {
				console.log("Error", err)
			  });
			
			$('#btn_save').removeClass('invisible').addClass('visible');
			$('#btn_edit').removeClass('visible').addClass('invisible');
	   }
		
       $('#contactForm')[0].reset();
		
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
	}).on('complete', function (info){
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
	  
	  attachment_blob = f;	  
	  attachment_type = f.type;		
	  
	  // Closure to capture the file information.
	  reader.onload = (function(theFile) {
		return function(e) {
		  var binaryData = e.target.result;					
		  //Converting Binary Data to base 64
		  attachment_content_base64 = window.btoa(binaryData);
		  attachment_name = theFile.name;
		  //console.log(attachment_content_base64);			
		};
	  })(f);	  
	  // Read in the image file as a data URL.
	  reader.readAsBinaryString(f);					
	}		
	
	function create_blob(file, callback) {
    	var reader = new FileReader();
    	reader.onload = function() { callback(reader.result) };
    	reader.readAsDataURL(file);
	}
	
	/***********************************************************
		Retrieving an attachment from a document & displaying	
	************************************************************/	
	
	function getAttachment(_id, _attachment_name){			
		
		if(_id){
			att_data = '';
			localDB.getAttachment(_id, "attachment_name", function(err, blob_buffer) { 
			   if (err) { 
				  return console.log(err); 
			   } else { 
				  	
				   var audio_exts = ['wav', 'mp3', 'mp4', 'm4a', 'ogg', 'wma' ];
				   var img_exts = ['png', 'jpg']
				   var doc_exts = ['pdf']
				   var _url  = URL.createObjectURL(blob_buffer);				   
				   var fSize = JSON.stringify(Math.floor(blob_buffer.size/1024));
          		   var b_type = JSON.stringify(blob_buffer.type);				   
				   var fileExt = _attachment_name.split('.').pop();					   
				   
				   if($.inArray(fileExt, doc_exts) >= 0){
					  applicationType = "application/pdf";  
					  var win = window.open(_url, '', "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=800,top="+(screen.height-950)+",left="+(screen.width-840));
				   }
				   
				   if ($.inArray(fileExt, audio_exts) >= 0){					   
					    var src_format = "data:audio/wav";
					    var d = window.open('','',"toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=320,height=200,top="+(screen.height-350)+",left="+(screen.width-540)).document;
						d.write(''); d.close();							   
						var ad = document.createElement('audio');					    
					    ad.setAttribute('controls', 'controls');						   
					    ad.setAttribute('src',  _url);						   
					    ad.autoplay = true;
					   /*
					   	ad.load();
					    ad.addEventListener("load", function() { 
     					ad.play(); 
 						}, true);
					   */
						d.body.appendChild(ad);					   
				   }
				   
				   if ($.inArray(fileExt, img_exts) >= 0){
						applicationType = "data:image/png;base64,";
						var d = window.open('','',"toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=500,height=500,top="+(screen.height-650)+",left="+(screen.width-840)).document;
						d.write(''); d.close();
						d.body.appendChild(document.createElement('img')).src = _url;
				   }
			   } 
			});
		}		
	}	
		
	/***********************************************************
				Displaying Attachments
	************************************************************/
		
	$('#contactList').on('click','.attachment', function(){			
		var fname = $(this).text();		
		var f_id =  $(this).attr('id');						
		getAttachment(f_id, fname);		
	});		
	
	/***********************************************************
		 			ContextMenu 
	************************************************************/
	var td_val;
	var td_contactname;
	
	$(function () {
		var $contextMenu = $("#contextMenu");
		var $rowClicked;

		$("body").on("contextmenu", "table tr", function (e) {
			$("#contextMenu").show();
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
			td_val = "";
			td_contactname ="";
			
			if($(this).text().trim() == "Delete"){
				td_val =$rowClicked.children("*")[0].innerHTML;
				td_contactname = $rowClicked.children("*")[1].innerHTML;								     	
			}
			
			if($(this).text().trim() == "Edit"){		
				
				 var $tds = $(this).closest('tr').find('td');
				_id_rev = $rowClicked.children("*")[0].innerHTML;
				_name = $rowClicked.children("*")[1].innerHTML;
				_mobile = $rowClicked.children("*")[2].innerHTML;
				_email = $rowClicked.children("*")[3].innerHTML;
				_attachment = $rowClicked.children("*")[4].innerHTML.replace(/<.*?>/g," ").replace(/ +/g," ");				
				
				$('#id_rev').val(_id_rev);
				$('#name').val(_name);
				$('#mobile').val(_mobile);
				$('#email').val(_email);
			    $('#in_filename').val(_attachment);
				
				$('#btn_save').removeClass('visible').addClass('invisible');
				$('#btn_edit').removeClass('invisible').addClass('visible');
			}
			$contextMenu.hide();		
		});

		$(document).click(function () {
			$contextMenu.hide();
		});	
	});	
	
	/****************************************************************
		 Confirm and delete document from localDB
	*****************************************************************/
	
	$('#confirm-delete').on('click', '.btn-ok', function(e) {     
		var $modalDiv = $(e.delegateTarget);            		            
		
		deleteDoc(td_val.split('|')[0].trim(), td_val.split('|')[1].trim());
		
		setTimeout(function() {
				$modalDiv.modal('hide').removeClass('loading');
		}, 1000)			
    });
	
	$('#confirm-delete').on('show.bs.modal', function(e) {
		var data = $(e.relatedTarget).data();
		$('.title', this).text(td_contactname);            
    });			
	
	function b64toBlob(b64Data, contentType, sliceSize) {
		
	  contentType = contentType || '';
	  sliceSize = sliceSize || 512;

	  var byteCharacters = atob(b64Data);
	  var byteArrays = [];

	  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		var slice = byteCharacters.slice(offset, offset + sliceSize);

		var byteNumbers = new Array(slice.length);
		for (var i = 0; i < slice.length; i++) {
		  byteNumbers[i] = slice.charCodeAt(i);
		}

		var byteArray = new Uint8Array(byteNumbers);

		byteArrays.push(byteArray);
	  }

	  var blob = new Blob(byteArrays, {type: contentType});
	  return blob;
	}
	
	/****************************************************************
				Deleting database
	*****************************************************************/
	
	/*function DeleteDB(){
		
		localDB.destroy(function (err, response) {
		   if (err) {
			  return console.log(err);
		   } else {
			  console.log ("Database Deleted”);
		   }
		});	
	}
	*/	
		
});

