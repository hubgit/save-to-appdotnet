$(function() {
	new Views.Articles({
		collection: new Collections.Articles({ model: Models.Article })
	});

	new Views.Viewer({});

	Files.init();
});
