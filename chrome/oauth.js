var matches = location.hash.match(/^#access_token=([^&]+)/);

if (matches) {
	chrome.storage.sync.set({ token: matches[1] });
	alert("Authenticated! Now try saving the item again.");
	window.close();
}