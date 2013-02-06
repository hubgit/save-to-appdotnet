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

			$("#viewer").attr({ 
				src: "http://mozilla.github.com/pdf.js/web/viewer.html?" + $.param({ file: file.url }), 
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
