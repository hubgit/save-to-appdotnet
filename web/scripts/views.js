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
			var file = item.get("file");
			var article = item.get("article");

			if (file.url && article.title) {
				var view = new Views.Article({ model: item });
				this.$el.append(view.render().el);

				Files.getFileURL(file, function(url) {
					console.log(url);
					item.set("blob", url);
				});
			}
		},

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

			//var url = this.model.get("blob") || this.model.get("file").url;
			var url = this.model.get("file").url;
			console.log(url);

			$("#viewer").attr({ 
				src: "viewer.html?" + $.param({ file: url }), 
			});
		}
	}),

	Viewer: Backbone.View.extend({
		id: "viewer",
		tagName: "iframe",
		attributes: { 
			"seamless": "seamless",
		},

		initialize: function() {
			this.$el.appendTo("body");
		},
	}),
}
