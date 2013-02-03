var token_matches = window.location.hash.match(/access_token=([^&]+)/);
var state_matches = window.location.hash.match(/state=([^&]+)/);

chrome.storage.local.get("state", function(result) {
	var stored_state = result.state;

	if (token_matches && state_matches && state_matches[1] === stored_state) {
		chrome.storage.local.remove("state");
		chrome.storage.sync.set({ token: token_matches[1] });
		alert("Authenticated! Now try saving the item again.");
		window.close();
	}
});
