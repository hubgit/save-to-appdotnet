var config = {
	client_id: "8rpu34tDFqbAmkmJhPYkSCkDFg2vc7XT",
	redirect_uri: "http://metatato.com/appdotnet/oauth", // TODO: actual chrome:extension/ URI
	state: "", // TODO
	token: null,
	data: {},
};

// TODO: don't hard-code the access token
window.localStorage.setItem("token", "");

var getAccessToken = function() {
	var data = {
		client_id: config.client_id,
		response_type: "token",
		redirect_uri: config.redirect_uri,
		scope: "write_post,files,stream",
		state: config.state
	};

	window.open("https://account.app.net/oauth/authenticate?" + buildQueryString(data));

	// TODO: capture the access token from the redirect_uri
};

var execute = function() {
	config.token = window.localStorage.getItem("token");

	if (config.token) {
		chrome.tabs.executeScript(null, { file: "extract.js" }, function(result) {
			config.data = result[0];
			console.log(config.data);

			if (config.data.pdf_url) {
				fetchFile();
			} else {
				createPost(null);
			}
		});
	} else {
		getAccessToken();
	}
};

var fetchFile = function() {
	console.log("Fetching PDF: " + config.data.pdf_url);

	var xhr = new XMLHttpRequest;
	xhr.open("GET", config.data.pdf_url, true);
	xhr.responseType = "arraybuffer";
	xhr.onload = createFile;
	xhr.onerror = handleXHRError;
	xhr.send();
};

var createFile = function(event) {
	if (this.readyState == 4 && this.status == 200) {
		console.log("Received PDF");
		console.log("Byte length: " + this.response.byteLength);
		console.log("Content-Type: " + this.getResponseHeader("Content-Type"));
		console.log("Content-Length: " + this.getResponseHeader("Content-Length"));

		if (this.getResponseHeader("Content-Type") !== "application/pdf") {
			return;
		}

		var formData = new FormData;

		var dataView = new DataView(this.response);
		var blob = new Blob([dataView], { type: "application/pdf" });
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
	var title = config.data.title;
	console.log("Creating post: " + title);

	var data = {
		text: [title, config.data.url].join(" "),
		annotations: [
			{
				type: "com.example.article",
				value: config.data
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

/* when the toolbar button is clicked */
chrome.browserAction.onClicked.addListener(execute);

/* when the keyboard shortcut is pressed */
chrome.commands.onCommand.addListener(function(command) {
  if (command == "save") execute();
});
