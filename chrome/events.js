var config = {
	client_id: "8rpu34tDFqbAmkmJhPYkSCkDFg2vc7XT",
	redirect_uri: "http://bitly.com/robots.txt",
	//state: "", // TODO
	token: null,
};

var execute = function() {
	chrome.tabs.executeScript(null, { file: "extract.js" }, function(result) {
		var itemData = result[0];
		console.log(["post-extract", itemData]);

		getToken(function() {
			if (itemData.doi) {
				fetchMetadata(itemData);
			} else {
				handleData(itemData);				
			}
		});
	});
};

var handleData = function(itemData) {
	if (itemData.pdf_url) {
		fetchFile(itemData);
	} else {
		createPost(itemData, null);
	}
};

var fetchMetadata = function(itemData) {
	var xhr = new XMLHttpRequest;
	xhr.open("GET", "http://dx.doi.org/" + itemData.doi, true);
	xhr.setRequestHeader("Accept", "application/json");
	xhr.onload = function() {
		var bib, metadata, field;

		var keymap = {
			"dc:title": "title",
			"dc:creator": "author",
			"prism:publicationDate": "date",
		};

		if (this.readyState == 4 && this.status == 200) {
			bib = JSON.parse(this.response);

			try {
				metadata = bib.feed.entry["pam:message"]["pam:article"];

				for (key in keymap) {
					field = keymap[key];
					if (metadata[key] && !itemData[field]) {
						itemData[field] = metadata[key];
					}
				}
			} catch (e) {}

			console.log(["post-crossref", itemData]);

			handleData(itemData);
		}
	};
	xhr.onerror = function() {
		handleData(itemData);
	};
	xhr.send();
}

var fetchFile = function(itemData) {
	console.log("Fetching PDF: " + itemData.pdf_url);

	var xhr = new XMLHttpRequest;
	xhr.open("GET", itemData.pdf_url, true);
	xhr.responseType = "arraybuffer";
	xhr.onload = function() {
		console.log(this);
		if (this.readyState == 4) {
			if (this.status == 200) {
				createFile(this, itemData);
			} else {
				createPost(itemData, null);
			}
		}
	};
	xhr.onerror = function() {
		createPost(itemData, null);
	};
	xhr.send();
};

var createFile = function(xhr, itemData) {
	var contentType = xhr.getResponseHeader("Content-Type").split(/\s*;\s*/)[0];
	var contentLength = xhr.getResponseHeader("Content-Length");

	console.log("Received PDF");
	console.log("Byte length: " + xhr.response.byteLength);
	console.log("Content-Type: " + contentType);
	console.log("Content-Length: " + contentLength);

	if (contentType !== "application/pdf") {
		if (!confirm("The file's type is " + contentType + ". Attach it anyway?")) {
			createPost(itemData, null);
			return;
		}
	}

	var formData = new FormData;

	var dataView = new DataView(xhr.response);
	var blob = new Blob([dataView], { type: contentType });
	formData.append("content", blob, "article.pdf");

	var blob = new Blob([JSON.stringify({ type: "com.adobe.pdf" })], { type: "application/json" });
	formData.append("metadata", blob, "metadata.json");

	var xhr = new XMLHttpRequest;
	xhr.open("POST", "https://alpha-api.app.net/stream/0/files", true);
	xhr.setRequestHeader("Authorization", "Bearer " + config.token);
	xhr.onload = function() {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(this.response);

			createPost(itemData, {
				id: response.data.id,
				token: response.data.file_token
			});
		}
	};
	xhr.onerror = handleXHRError;
	xhr.send(formData);
};

var createPost = function(itemData, file) {
	var title = itemData.title;

	if (!title) {
		title = itemData.document_title;
	}

	delete itemData.document_title;

	if (title > 256) {
		title = title.substr(0, 255 + "…");
	}

	var data = {
		text: title,
		annotations: [
			{
				type: "edu.stanford.highwire.article",
				value: itemData
			}
		],
		entities: {
			links: [
				{
					pos: 0,
					len: title.length,
					url: itemData.url
				}
			]
		}
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
	xhr.onload = function() {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(this.response);
			showPost(response.data);
		}
	};
	xhr.onerror = handleXHRError;
	xhr.send(JSON.stringify(data));
};

var showPost = function(data) {
		console.log(data);
		console.log("Created post: " + data.canonical_url);
		window.open(data.canonical_url);
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

var getToken = function(callback) {
	chrome.storage.sync.get("token", function(result) {
		if (result.token) {
			config.token = result.token;
			callback();
		} else {
			authenticate();
		}
	});
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
