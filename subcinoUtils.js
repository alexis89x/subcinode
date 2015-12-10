
module.exports.log = function( message, debug ) {
	debug = debug || false;
	if ( debug ) {
		console.log( message );
	}
};

module.exports.test = function() {
	console.log('Robberto!');
};

module.exports.traverseFileTree = function (item, path, cbk) {
	var self = this;
	path = path || "";
	if (item.isFile) {
		// Get file
		item.file(cbk);
	} else if (item.isDirectory) {
		// Get folder contents
		var dirReader = item.createReader();
		dirReader.readEntries(function (entries) {
			for (var i = 0; i < entries.length; i++) {
				self.traverseFileTree(entries[i], path + item.name + "/", cbk);
			}
		});
	}
};

module.exports.listFiles = function(dir, extensions) {
	var fs = require('fs');
	var files = fs.readdirSync( dir );
	if (!extensions) {
		return files;
	}

	var goodFiles = [];
	for (var i in files) {
		var extension = files[i].substr( files[i].lastIndexOf('.') );
		if (extensions.indexOf( extension.replace('.', '') ) > -1) {
			goodFiles.push(files[i]);
		}
	}
	return goodFiles;
};

// List all files in a directory in Node.js recursively in a synchronous fashion
module.exports.walkSync = function(dir, filelist, extensions, recursive) {
	recursive = typeof recursive === 'undefined' ? true: recursive;
	if (!recursive) {
		return this.listFiles( dir, extensions );
	};
	var self = this;
	var fs = fs || require('fs'),
		files = fs.readdirSync(dir);
	filelist = filelist || [];
	files.forEach(function(file) {
		if (fs.statSync(dir + '/' + file).isDirectory()) {
			filelist = self.walkSync(dir + '/' + file, filelist, extensions, recursive);
		}
		else {
			if ( extensions ) {
				var extension = file.substr( file.lastIndexOf('.') );
				if (extensions.indexOf( extension.replace('.', '') ) > -1) {
					filelist.push({ fileName: file, path: dir, fullName: (dir ? dir + '/' : '') + file });
				}
			} else {
				filelist.push({ fileName: file, path: dir, fullName: (dir ? dir + '/' : '') + file });
			}
		}
	});
	return filelist;
};

module.exports.subtitleLogin = function( settings, callbackSettings ) {
	this.OS = this.OS || require('opensubtitles-api');
	this.OpenSubtitles = this.OpenSubtitles || new this.OS( 'Subcino v1.0' || 'OSTestUserAgent');

	var promise = this.OpenSubtitles.login();
	promise.then(function (res) {
		if ( callbackSettings && callbackSettings.success ) {
			callbackSettings.success( res );
		}
	}).catch(function (err) {
		if ( callbackSettings && callbackSettings.err ) {
			callbackSettings.error( err );
		}
	});
};

module.exports.getHash = function( fileName ) {
	this.OS = this.OS || require('opensubtitles-api');
	this.OpenSubtitles = this.OpenSubtitles || new this.OS( 'Subcino v1.0' || 'OSTestUserAgent');
	return this.OpenSubtitles.extractInfo( fileName ); // Path must be included.
};

module.exports.search = function( settings, fileInfo, callbackSettings ) {
	this.OS = this.OS || require('opensubtitles-api');
	this.OpenSubtitles = this.OpenSubtitles || new this.OS( 'Subcino v1.0' || 'OSTestUserAgent');

	settings = settings || {};
	settings.langs = settings.langs || 'all';

	this.log( settings, true );
	this.log( fileInfo, true );

	if (!fileInfo) {
		throw 'Missing file information';
	}

	return this.OpenSubtitles.search({
		sublanguageid: settings.langs.join(','),        // Can be an array.join with comma, 'all', or be omitted.
		hash: fileInfo.moviehash,   // Size + 64bit checksum of the first and last 64k
		filesize: fileInfo.moviebytesize      // Total size, in bytes.
	});
};

module.exports.extendObj = function(dest, from) {
	var self = this;
	var props = Object.getOwnPropertyNames(from), destination;

	props.forEach(function (name) {
		if (typeof from[name] === 'object') {
			if (typeof dest[name] !== 'object') {
				dest[name] = {}
			}
			self.extendObj(dest[name],from[name]);
		} else {
			destination = Object.getOwnPropertyDescriptor(from, name);
			Object.defineProperty(dest, name, destination);
		}
	});
};

module.exports.getHashes = function( list, callback, result, log )  {
	var self = this;
	result = result || [];

	if (!list || !(list.length)) {
		callback( result );
		return;
	}
    this.log( 'Getting hash for file: ' + list[0].fullName, log );

    this.getHash( list[0].fullName )
		.then(function( infos ){
            self.log( 'Hash got', log );
            self.log( infos, log );
			self.extendObj( list[0], infos );
			result.push( list[0] );
			list.shift();
			self.getHashes( list, callback, result, log );
		}).catch(function (err) {
            self.log( 'Hash error' );
            self.log( err, log );
			list[0].error = true;
			list[0].errorType = 'HASH_ERROR';
			result.push( list[0] );
			list.shift();
			self.getHashes( list, callback, result, log );
		});
};

module.exports.getSubtitles  = function( list, settings, callback, result, log )  {
	var self = this;
	result = result || [];

	if (!list || !(list.length)) {
		callback( result );
		return;
	}
	this.log( 'Getting subtitles for file: ' + list[0].fullName, log );
	this.search( settings, list[0] )
		.then(function( infos ){
			self.log( 'Subtitles got', log );

			var numSub = Object.keys(infos).length;
			self.log({
				type: 'info',
				message: 'Found ' + numSub + ' subtitles.',
				info: infos
			}, log);

			var downloadList = [];
			for ( var j in infos ) {
				if ( infos[j].url ) {
					downloadList.push( { url: infos[j].url, lang: j } );
				}
			}

			self.extendObj( list[0], { subtitles: infos } );
            list[0].downloadList = downloadList;
			result.push( list[0] );
			list.shift();
			self.getSubtitles( list, settings, callback, result, log );
		}).catch(function (err) {
			self.log( 'Hash error' );
			self.log( err, log );
			list[0].error = true;
			list[0].errorType = 'SUBTITLE_ERROR';
			result.push( list[0] );
			list.shift();
			self.getSubtitles( list, settings, callback, result, log );
		});

};

module.exports.download = function (list, callbacks, log) {
    var http = require('http');
    var fs = require('fs');
    var self = this;
    //var parser = require('subtitles-parser');

    function isFunction(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    callbacks = isFunction( callbacks ) ? {
        complete: callbacks,
        progress: function(){}
    } : (callbacks || {});

    callbacks.complete = callbacks.complete || function(){};
    callbacks.progress = callbacks.progress || function(){};

    if (!Array.isArray(list)) {
        list = [list];
    }
    // Termination condition. Function is recursive
    if (!list.length) {
        callbacks.complete();
        return true;
    }

    this.log('Downloading ' + list[0].url + '...', log);
    try {
        var destinationPath = list[0].path;
        var destinationName = list[0].saveAs;


        // TODO CHECK BEFORE THAT EVERY PATH UP TO THAT, EXISTS

        if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath);
        }

        var targetFilePath = destinationPath + destinationName;
        targetFilePath = targetFilePath.replace('//', '/');

        var file = fs.createWriteStream(targetFilePath);

        var request = http.get(list[0].url, function (response) {
            response.pipe(file);
            self.log('Downloaded ' + destinationName, log);
            //TODO parser.fromSrt parse srt to array, add Subcino advertising, rewrite to file
            list.shift();
            callbacks.progress();
            setTimeout(function(){
                // Download next.
                self.download(list, callbacks);
            }, 200);

        });
    } catch (ex) {
        console.log(ex);
        self.log('ERROR!' + ex.message + 'NOT Downloaded ' + fileName + ' as ' + destinationName, log);
        list.shift();
        callbacks.progress();
        setTimeout(function(){
            // Download next.
            self.download(list, callbacks);
        }, 200);
    }
};