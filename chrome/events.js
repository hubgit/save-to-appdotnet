var config = {
	client_id: "8rpu34tDFqbAmkmJhPYkSCkDFg2vc7XT",
	redirect_uri: "http://bitly.com/robots.txt",
	//state: "", // TODO
	token: null,
};

var itemData = {};

var execute = function() {
	chrome.tabs.executeScript(null, { file: "extract.js" }, function(result) {
		itemData = result[0];
		console.log(itemData);

		getToken();
	});
};

var fetchFile = function() {
	console.log("Fetching PDF: " + itemData.pdf_url);

	var xhr = new XMLHttpRequest;
	xhr.open("GET", itemData.pdf_url, true);
	xhr.responseType = "arraybuffer";
	xhr.onload = createFile;
	xhr.onerror = function() {
		createPost(null);
	};
	xhr.send();
};

var createFile = function(event) {
	if (this.readyState == 4 && this.status == 200) {
		var contentType = this.getResponseHeader("Content-Type").split(/\s*;\s*/)[0];

		console.log("Received PDF");
		console.log("Byte length: " + this.response.byteLength);
		console.log("Content-Type: " + contentType);
		console.log("Content-Length: " + this.getResponseHeader("Content-Length"));

		if (contentType !== "application/pdf") {
			if (!confirm("The file's type is " + contentType + ". Attach it anyway?")) {
				createPost(null);
				return;
			}
		}

		var formData = new FormData;

		var dataView = new DataView(this.response);
		var blob = new Blob([dataView], { type: contentType });
		formData.append("content", blob, "article.pdf");

		var blob = new Blob([JSON.stringify({ type: "com.adobe.pdf" })], { type: "application/json" });
		formData.append("metadata", blob, "metadata.json");

		var xhr = new XMLHttpRequest;
		xhr.open("POST", "https://alpha-api.app.net/stream/0/files", true);
		xhr.setRequestHeader("Authorization", "Bearer " + config.token);
		xhr.onload = handleFileLoad;
		xhr.onerror = handleXHRError;
		xhr.send(formData);
	}
};

var handleFileLoad = function(event) {
	if (this.readyState == 4 && this.status == 200) {
		var response = JSON.parse(this.response);

		var file = {
			id: response.data.id,
			token: response.data.file_token
		};

		createPost(file);
	}
};

var createPost = function(file) {
	var title = itemData.title;
	console.log("Creating post: " + title);

	var data = {
		text: [title, itemData.url].join(" "),
		annotations: [
			{
				type: "edu.stanford.highwire.article",
				value: itemData
			}
		]
	};

	if (file) {
		data.annotations.push({
		    "type": "net.app.core.attachments",
		    "value": {
		        "+net.app.core.file_list": [
			        {
			        	"file_id": file.id,
		                "file_token": file.token,
		                "format": "metadata" // ?
		            }
	            ],
		    }
		});
	}

	console.log(data);
	
	var xhr = new XMLHttpRequest;
	xhr.open("POST", "https://alpha-api.app.net/stream/0/posts?include_post_annotations=1", true);
	xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
	xhr.setRequestHeader("Authorization", "Bearer " + config.token);
	xhr.onload = handlePostLoad;
	xhr.onerror = handleXHRError;
	xhr.send(JSON.stringify(data));
};

var handlePostLoad = function() {
	console.log(this);
	if (this.readyState == 4 && this.status == 200) {
		var response = JSON.parse(this.response);
		console.log(response);

		console.log("Created post: " + response.data.canonical_url);
		window.open(response.data.canonical_url);
	}
};

var handleXHRError = function(event){
	console.log(["error", event]);

	// TODO: authenticate if error code is 403
};

var buildQueryString = function(items) {
	var parts = [];

	var add = function(key, value) {
		parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
	}

	for (var key in items) {
		if (!items.hasOwnProperty(key)) continue;

   		var obj = items[key];

   		if (Array.isArray(obj)) {
   			obj.forEach(function(value) {
   				add(key, value);
   			});
   		}
   		else {
   			add(key, obj);
   		}
	}

	return parts.length ? parts.join("&").replace(/%20/g, "+") : "";
};

var addEventListeners = function() {
	/* when the toolbar button is clicked */
	chrome.browserAction.onClicked.addListener(execute);

	/* when the keyboard shortcut is pressed */
	chrome.commands.onCommand.addListener(function(command) {
	  if (command == "save") execute();
	});
};

var getToken = function() {
	chrome.storage.sync.get("token", checkToken);
};

var checkToken = function(result) {
	console.log(result);
	if (result.token) {
		config.token = result.token;

		if (itemData) {
			if (itemData.pdf_url) {
				fetchFile();
			} else {
				createPost(null);
			}
		}
	} else {
		authenticate();
	}
};

var authenticate = function() {
	var data = {
		client_id: config.client_id,
		response_type: "token",
		redirect_uri: config.redirect_uri,
		scope: "write_post",
		//state: config.state
	};

	window.open("https://account.app.net/oauth/authenticate?" + buildQueryString(data));
};

addEventListeners();
