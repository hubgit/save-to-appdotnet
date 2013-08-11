var config = {
	client_id: "8rpu34tDFqbAmkmJhPYkSCkDFg2vc7XT",
	redirect_uri: "https://bitly.com/robots.txt",
	//state: "", // TODO
	token: null
};

/* execute extract.js in the current tab and handle the result */
var execute = function() {
	chrome.tabs.executeScript(null, { file: "extract.js" }, handleExtractedData);
};

/* load the oauth access token and handle the extracted data */
var handleExtractedData = function(result) {
	var itemData = result[0];
	console.log(itemData);

	showNotification({
		title: "Extracting metadata", 
		text: itemData.title, 
		lifespan: 1000
	});

	getToken(function() {
		if (itemData.doi) { // TODO: always try Google Scholar first?
			fetchCrossrefMetadata(itemData);
		} else {
			fetchScholarItem(itemData);
		}
	});
};

/* decide whether to fetch the file */
var handleData = function(itemData) {
	if (itemData.pdf_url) {
		fetchFile(itemData);
	} else {
		createPost(itemData, null);
	}
};

/* fetch metadata for this URL from Google Scholar */
var fetchScholarItem = function(itemData) {
	var params = { 
		cluster: itemData.url,
		output: "cite"
	};

	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://scholar.google.co.uk/scholar?" + buildQueryString(params));
	xhr.onload = function() {
		if (this.readyState == 4) {
			if (this.status == 200) {
				var dom = (new DOMParser()).parseFromHTMLString(this.response);
				xhr.abort();

				var nodes = dom.querySelectorAll("a.gs_citi[href^='/scholar.ris']");

				if (!nodes.length) {
					handleData(itemData);
					return;
				}

				var href = nodes.item(0).getAttribute("href");

				xhr.open("GET", "http://scholar.google.co.uk" + href);
				xhr.onload = function() {
					if (this.readyState == 4 && this.status == 200) {
						addDataFromRIS(this.response, itemData);
					}
				};
				xhr.send();
			} else {
				handleData(itemData);
			}
		}
	};
	xhr.onerror = function() {
		handleData(itemData);
	};
	xhr.send();
};

/* parse the RIS file and add missing data */
var addDataFromRIS = function(ris, itemData) {
	var keymap = {
		"T1": "title",
		"A1": "author",
		"VL": "volume",
		"IS": "issue",
		"Y1": "year",
		"JO": "journal_title"
	};

	var lines = ris.split(/\n/);

	var data = {};

	lines.forEach(function(line) {
		var parts = line.split(/ {2}- /);
		var key = parts[0];
		var value = parts[1];

		if (data[key]) {
			if (typeof data[key] == "string") {
				data[key] = [data[key]];
			}
			data[key].push(value);
		} else {
			data[key] = value;
		}
	});

	for (var key in data) {
		if (data.hasOwnProperty(key)) {
			var field = keymap[key];
			var value = data[key];

			if (field && value && !itemData[field]) {
				itemData[field] = value;
			}

		}
	}

	handleData(itemData);
};

/* fetch metadata for this DOI from CrossRef */
var fetchCrossrefMetadata = function(itemData) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://data.crossref.org/" + itemData.doi + "?_=" + Math.random());
	xhr.setRequestHeader("Accept", "application/json");
	xhr.onload = function() {
		var bib, metadata, field;

		var keymap = {
			"dc:title": "title",
			"dc:creator": "author",
			"prism:publicationDate": "date"
		};

		if (this.readyState == 4) {
			if (this.status == 200) {
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
			}
			
			handleData(itemData);
		}
	};
	xhr.onerror = function() {
		handleData(itemData);
	};
	xhr.send();
};

/* fetch the file */
var fetchFile = function(itemData) {
	console.log("Fetching PDF: " + itemData.pdf_url);

	var notification = showNotification({
		title: "Fetching PDF file",
		text: ""
	});

	var xhr = new XMLHttpRequest();
	xhr.open("GET", itemData.pdf_url);
	xhr.responseType = "arraybuffer";
	xhr.onload = function() {
		if (this.readyState == 4) {
			notification.cancel();

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

/* create the File object in App.net */
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

	var notification = showNotification({
		title: "Saving file to App.net", 
		text: ""
	});

	var formData = new FormData();

	var dataView = new DataView(xhr.response);
	var blob = new Blob([dataView], { type: contentType });
	formData.append("content", blob, "article.pdf");

	blob = new Blob([JSON.stringify({ type: "com.adobe.pdf" })], { type: "application/json" });
	formData.append("metadata", blob, "metadata.json");

	xhr = new XMLHttpRequest();
	xhr.open("POST", "https://alpha-api.app.net/stream/0/files");
	xhr.setRequestHeader("Authorization", "Bearer " + config.token);
	xhr.onload = function() {
		if (this.readyState == 4) {
			if (this.status == 200) {
				var response = JSON.parse(this.response);

				createPost(itemData, {
					id: response.data.id,
					token: response.data.file_token
				});
			}
		}
	};
	xhr.onerror = handleXHRError;
	xhr.send(formData);
};

/* create the Post object in App.net */
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
				]
			}
		});
	}

	console.log(data);
	
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "https://alpha-api.app.net/stream/0/posts?include_post_annotations=1");
	xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
	xhr.setRequestHeader("Authorization", "Bearer " + config.token);
	xhr.onload = function() {
		if (this.readyState == 4) {
			if (this.status == 200) {
				var response = JSON.parse(this.response);
				postCreated(response.data);
			}
		}
	};
	xhr.onerror = handleXHRError;
	xhr.send(JSON.stringify(data));
};

/* notify when the post has been successfully created */
var postCreated = function(data) {
	console.log(data);
	console.log("Created post: " + data.canonical_url);
	//window.open(data.canonical_url);

	var notification = showNotification({
		title: "Saved to App.net", 
		text: "Click to view the post", 
		lifespan: 10000
	});

	notification.addEventListener("click", function() {
		chrome.tabs.create({ url: data.canonical_url });
	});
};

/* show a desktop notification */
var showNotification = function(options) {
	var notification = webkitNotifications.createNotification(
		"img/icon48.png",
		options.title,
		options.text
	);

	notification.show();

	if (options.lifespan) {
		window.setTimeout(function() {
			notification.cancel();
		}, options.lifespan);
	}

	return notification;
};

/* handle XHR errors */
var handleXHRError = function(event){
	console.log(["error", event]);
	// TODO: authenticate if error code is 401
};

/* parse HTML to a DOM Document */
DOMParser.prototype.parseFromHTMLString = function(html, type) {  
	var doc = document.implementation.createHTMLDocument("");
	
	var docElement = doc.documentElement;
	docElement.innerHTML = html;
	
	var firstChild = docElement.firstElementChild;

	if (docElement.childElementCount === 1 && firstChild.localName.toLowerCase() === "html") {  
		doc.replaceChild(firstChild, docElement);  
	}  

	return doc; 
}; 

/* convert an object into a URL-encoded query string */
var buildQueryString = function(items) {
	var parts = [];

	var add = function(key, value) {
		parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
	};

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

/* load the access token from storage */
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

/* ask the user to authenticate */
var authenticate = function() {
	var state = Math.random().toString();

	chrome.storage.local.set({ state: state }, function() {
		var data = {
			client_id: config.client_id,
			response_type: "token",
			redirect_uri: config.redirect_uri,
			scope: "write_post",
			state: state
		};

		chrome.tabs.create({ url: "https://account.app.net/oauth/authenticate?" + buildQueryString(data) });
	});
};

/* when the toolbar button is clicked */
chrome.browserAction.onClicked.addListener(execute);
