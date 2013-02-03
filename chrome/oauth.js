var token_matches = window.location.hash.match(/access_token=([^&]+)/);
var state_matches = window.location.hash.match(/state=([^&]+)/);
var stored_state = window.localStorage.getItem("appdotnet_state");

if (token_matches && state_matches && state_matches[1] === stored_state) {
	window.localStorage.removeItem("appdotnet_state");
	chrome.storage.sync.set({ token: token_matches[1] });
	alert("Authenticated! Now try saving the item again.");
	window.close();
}