var Models = {
	Article: Backbone.Model.extend({})
};

var Collections = {
	Articles: Backbone.Collection.extend({
		url: function() {
			var params = {
				include_annotations: 1,
				include_post_annotations: 1,
				include_machine: 1,
				count: 50
			};

			return "https://alpha-api.app.net/stream/0/users/me/posts?" + $.param(params);
		},
		parse: function(response) {
			return response.data.map(function(item) {
				var data = {
					article: {},
					file: {}
				};

				var annotations = item.annotations.filter(function(annotation) {
					switch (annotation.type) {
						case "edu.stanford.highwire.article":
							data.article = annotation.value;

							if (typeof data.article.author !== "object"
								&& typeof data.article.authors === "string") {
								data.article.author = data.article.authors.split(/\s*;\s*/);
							}

							if (data.article.date) {
								data.article.date = (new Date(data.article.date)).getUTCFullYear();
							}
							break;

						case "net.app.core.attachments":
							data.file = annotation.value["net.app.core.file_list"][0];
							break;
					}
				});

				return data;
			});
		},
	})
};
