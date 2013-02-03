$(document).ajaxSend(function(event, xhr) {
    xhr.setRequestHeader("Authorization", "Bearer " + config.access_token);
});

$(document).ajaxError(function(event, xhr) {
	switch (xhr.status) {
		case 401:
			if (!confirm("Authenticate via app.net?")) {
				return;
			}

			var state = Math.random();
			window.localStorage.setItem("appdotnet_state", state);

			var data = {
				client_id: config.client_id,
				redirect_uri: window.location.href,
				response_type: "token",
				scope: "stream",
				state: state,
			};

			window.location = "https://account.app.net/oauth/authenticate?" + $.param(data);
			break;
	}
});

var token_matches = window.location.hash.match(/access_token=([^&]+)/);
var state_matches = window.location.hash.match(/state=([^&]+)/);
var stored_state = window.localStorage.getItem("appdotnet_state");

if (token_matches && state_matches && state_matches[1] === stored_state) {
	window.localStorage.removeItem("appdotnet_state");
	window.localStorage.setItem("appdotnet_access_token", token_matches[1]);
	window.location = window.location.href.replace(/#.+/, "");
}

var config = {
	client_id: "8rpu34tDFqbAmkmJhPYkSCkDFg2vc7XT",
	access_token: window.localStorage.getItem("appdotnet_access_token"),
};
