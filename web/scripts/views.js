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
			var file = this.model.get("file");

			// Note: PDF wouldn't show up in Chrome PDF viewer as object element - possibly due to HTTPS?
			// Note: Couldn't use iframe, as PDF files just download.
			// TODO: Load into PDF.js, if CORS headers get added to files.

			$("#viewer").attr({ 
				src: "http://docs.google.com/gview?" + $.param({ embedded: "true", url: file.url }), 
				//type: file.mime_type
			});

			this.$el.addClass("active").siblings(".active").removeClass("active");
		}
	}),

	Viewer: Backbone.View.extend({
		id: "viewer",
		tagName: "iframe",
		attributes: { 
			"seamless": "seamless"
		},

		initialize: function() {
			this.$el.appendTo("body");
		},
	}),
}
