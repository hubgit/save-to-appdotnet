PDFJS.workerSrc = "vendor/pdf.js";

$(function() {
	new Views.Articles({
		collection: new Collections.Articles({ model: Models.Article })
	});

	new Views.Viewer({});
});
