var absoluteURL = function(url) {
	if (!url) {
		return;
	}

	var a = document.createElement("a");
	a.setAttribute("href", url);

	return a.href;
};

var detectPDF = function() {
	var nodes, node, href;

	nodes = document.querySelectorAll("link[rel='alternate'][type='application/pdf'][href]");

	if (nodes.length) {
		return nodes[0].getAttribute("href");
	}

	nodes = document.querySelectorAll("meta[name='citation_pdf_url'][content]");

	if (nodes.length) {
		return nodes[0].getAttribute("content");
	}

	var nodes = document.querySelectorAll("a[href]");

	[/\.pdf$/i, /\.pdf/i, /pdf/i].forEach(function(re) {
		for (var i = 0; i < nodes.length; i++) {
			href = nodes[i].getAttribute("href");

			if (href.match(re)) {
				return href;
			}
		}
	});

	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i].textContent.match(/pdf/i)) {
			return href;
		}
	}
};

var detectMeta = function() {
	var data = {};

	nodes = document.querySelectorAll("meta[name^=citation_][content]");

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var name = node.getAttribute("name").replace(/^citation_/, "");
		var content = node.getAttribute("content");

		if (typeof data[name] == "undefined") {
			data[name] = content;
		} else if (typeof data[name] == "string") {
			data[name] = [data[name], content];
		} else {
			data[name].push(content);
		}
	}

	delete data.reference; // too large

	return data;
};

var data = detectMeta();

if (!data.title) {
	data.title = document.title;
}

data.url = document.location.href;
data.pdf_url = absoluteURL(detectPDF());

if (data.doi) {
	data.doi = data.doi.replace(/^doi:/, "");
}

var selection = document.getSelection().toString();
//data.quote = selection ? '"' + selection + '"' : "";
if (selection.length) {
	data.quote = selection;
}

//data.tags = prompt("tags", "bookmark");

data;
