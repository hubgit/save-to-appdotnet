var Files = new function() {
	var storageInfo = window.storageInfo || window.webkitStorageInfo;
	var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
	var URL = window.URL || window.webkitURL;

	var errorHandler = function(e) {
  		console.log(e);
	};

	this.init = function() {
		storageInfo.requestQuota(
			PERSISTENT, 
			1024 * 1024, 
			function(grantedBytes) {
		  		requestFileSystem(
		  			PERSISTENT, 
		  			grantedBytes, 
		  			function(fileSystem) {
		  				console.log(fileSystem);
		  				this.fs = fileSystem;
		  			}, 
	  				errorHandler
		  		);
			}, 
			errorHandler
		);
	};

	this.getFileURL = function(file, successHandler) {
		fs.root.getFile(file.sha1, {}, function(fileEntry) {
			fileEntry.file(function(file) {
				successHandler(URL.createObjectURL(file));
			}, errorHandler);
		}, function() {
			fetchFile(file, successHandler);
		});
	};

	var fetchFile = function(file, successHandler) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", file.url);
		xhr.responseType = "arraybuffer";
		xhr.onload = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					setFile(file, this.response, successHandler);
				} else {
					console.log(this);
				}
			}
		};
		xhr.onerror = errorHandler;
		xhr.send();
	};

	var setFile = function(file, response, successHandler) {
		fs.root.getFile(file.sha1, { create: true }, function(fileEntry) {
			fileEntry.createWriter(function(fileWriter) {
				fileWriter.onwriteend = function() {
					getFileURL(file, successHandler);
				};

				fileWriter.onerror = errorHandler;

				var dataView = new DataView(response);
				var blob = new Blob([dataView], { type: "application/pdf" });
				fileWriter.write(blob);
			}, errorHandler);
		}, errorHandler);
	};
};