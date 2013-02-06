var Views = {
	Articles: Backbone.View.extend({
		id: "articles",

		initialize: function() {
			this.$el.appendTo("body");
			this.collection.on("reset", this.reset, this);
			this.collection.on("add", this.add, this);
			this.collection.fetch();
		},

		reset: function() {
			this.$el.empty();
			this.collection.each(this.add, this);
		},

		add: function(item) {
			if (item.get("file").url && item.get("article").title) {
				var view = new Views.Article({ model: item });
				this.$el.append(view.render().el);
			}
		}
	}),

	Article: Backbone.View.extend({
		tagName: "article",
		className: "article",

		initialize: function() {
			this.model.on("change", this.render, this);
		},

		render: function() {
			var data = this.model.toJSON();
			this.$el.html(Templates.Article(data));
			
			return this;
		},

		events: {
			"click": "showFile"
		},

		showFile: function() {
			this.$el.addClass("active").siblings(".active").removeClass("active");

			var file = this.model.get("file");
			console.log(file.url);

			// Note: PDF wouldn't show up in Chrome PDF viewer as object element - possibly due to HTTPS?
			// Note: Couldn't use iframe, as PDF files just download.
			// TODO: Load into PDF.js, if CORS headers get added to files.

			//$("#viewer").attr({ 
				//src: "http://docs.google.com/gview?" + $.param({ embedded: "true", url: file.url }), 
				//type: file.mime_type
			//});

			var viewer = $("#viewer");
			var loading = $("<div/>", { html: "Loading PDF&hellip;" }).css({ textAlign: "center", margin: "20px" });
			viewer.html(loading);

			var pages = [];

			PDFJS.getDocument(file.url).then(function(pdf) {
				loading.remove();

				for (var i = 0; i < pdf.numPages; i++) {
					pages[i] = $("<div/>").addClass("pageContainer").appendTo(viewer);

					try {
						pdf.getPage(i + 1).then(function(page) {
							var viewport = page.getViewport(1.5);

							var canvas = document.createElement("canvas");
							canvas.mozOpaque = true;
							canvas.width = viewport.width;
							canvas.height = viewport.height;

							var pageContainer = pages[page.pageNumber - 1];
							pageContainer.css({ width: viewport.width, height: viewport.height });
							pageContainer.append(canvas);

							var context = canvas.getContext("2d");
							context.save();
							context.fillStyle = "rgb(255, 255, 255)";
							context.fillRect(0, 0, canvas.width, canvas.height);
							context.restore();

							var params = {
								canvasContext: context,
								viewport: viewport,
							};

							page.render(params);
						});
					}
					catch (e) {}
				}
			});
		}
	}),

	Viewer: Backbone.View.extend({
		id: "viewer",
		//tagName: "iframe",
		tagName: "div",
		attributes: { 
			//"seamless": "seamless"
		},

		initialize: function() {
			this.$el.appendTo("body");
		},
	}),
}
