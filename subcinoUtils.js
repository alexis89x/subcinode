/* No comment needed */
module.exports.logLevels = {
    DEBUG: 60,
    INFO: 50,
    WARNING: 40,
    ERROR: 30,
    FATAL: 20,
    ALL: 10
};

/* No comment needed */
module.exports.currentLogLevel = 60; // DEBUG

/**
 * Simple log function. Checks the currentLog level to prevent unnecessary logging.
 * @param message
 * @param logLevel - the logLevel constant.
 */
module.exports.log = function( message, logLevel ) {
    logLevel = logLevel || this.logLevels.DEBUG;
    if ( this.currentLogLevel >= logLevel ) {
        console.log( message );
    }
    return this;
};

/**
 * Sets the current log level according to the arguments.
 * @param settings
 */
module.exports.setDebugLevel = function( settings ) {
    if ( settings.debug ) {
        this.currentLogLevel = this.logLevels.DEBUG;
    } else {
        this.currentLogLevel = this.logLevels.INFO;
    }
    return this;
};

/**
 * Parses the shell arguments.
 * @name parseArgs
 */
module.exports.parseArgs = function() {
    var argv = process.argv;
    var args = {
        recursive: true,
        extensions: ['mp4', 'mkv', 'avi'],
        langs: [ 'all' ],
        path: process.cwd(), // By default, uses the current working directory.
        useSubs: false,
        debug: false
    };

    for (var i = 0, len = argv.length; i < len; i++) {
        var arg = argv[i];
        var match;
        if ((match = arg.match(/-langs=([\w,]+)/)) || (match = arg.match(/-langs=([\w]+)/))) {
            // Languages to download
            args.langs = (match[1] && match[1].split(',')) || args.langs;
        } else if ((match = arg.match(/-extensions=(\w,+)/)) || (match = arg.match(/-extensions=(\w+)/))) {
            // File extensions
            args.extensions = (match[1] && match[1].split(',')) || args.extensions;
        } else if (arg === "-useSubs") {
            // Use subtitles folder ( subs/ )
            args.useSubs = true;
        } else if (match = arg.match(/-useSubs=(\w+)/)) {
            // Same, but with specified options
            args.useSubs = (match[1] == 'true');
        } else if (arg === "-debug") {
            // Show more log
            args.debug = true;
        } else if (match = arg.match(/-recursive=(\w+)/)) {
            // If true, navigate in the subfolders
            args.recursive = (match[1] == 'true');
        } else if ( (arg.indexOf('-path=') === 0) ) {
            // Specify a different path
            args.path = (arg.replace('-path=', '') || args.path);
        }
    }

    // Fix path backslash
    if ( args.path.endsWith('/') ) {
        args.path = args.path.substr( 0, args.path.length - 1 );
    }
    return args;
};

/**
 * Deep object cloning
 * @name extendObj
 * @param dest
 * @param from
 */
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
    return this;
};

/**
 * Obtains the current open subtitles login.
 * @returns {*|exports|module.exports}
 */
module.exports.getOpenSubtitles = function() {
    this.OS = this.OS || require('opensubtitles-api');
    this.OpenSubtitles = this.OpenSubtitles || new this.OS( 'Subcino v1.0' || 'OSTestUserAgent');
    return this.OpenSubtitles;
};

/**
 * Get the hash info of the current file.
 * @requires opensubtitles-api
 * @param fileName
 * @returns {Promise}
 */
module.exports.getHash = function( fileName ) {
    return this.getOpenSubtitles().extractInfo( fileName ); // Path must be included.
};
/**
 * Logins to OpenSubtitles.
 * @requires opensubtitles-api
 * @returns {Promise}
 */
module.exports.subtitleLogin = function() {
    var promise = this.getOpenSubtitles().login();
    return promise;
    /*.then(function (res) {
        if ( callbackSettings && callbackSettings.success ) {
            callbackSettings.success( res );
        }
    }).catch(function (err) {
        if ( callbackSettings && callbackSettings.err ) {
            callbackSettings.error( err );
        }
    });*/
};

/**
 * Search subtitles.
 * @param settings
 * @param fileInfo
 * @param callbackSettings
 */
module.exports.search = function( settings, fileInfo, callbackSettings ) {
    settings = settings || {};
    settings.langs = settings.langs || [ 'all' ];

    this
        .log( settings, this.logLevels.DEBUG )
        .log( fileInfo, this.logLevels.DEBUG );

    if (!fileInfo) {
        this
            .log( '[Missing file information: ' + fileInfo.fileName + ']', this.logLevels.ERROR );
    }

    return this.getOpenSubtitles().search({
        sublanguageid: settings.langs.join(','),    // Can be an array.join with comma, 'all', or be omitted.
        hash: fileInfo.moviehash,                   // Size + 64bit checksum of the first and last 64k
        filesize: fileInfo.moviebytesize            // Total size, in bytes.
    });
};

/**
 * List file in a folder, not recursively.
 * @param dir
 * @param extensions - the valid extensions.
 * @returns {Array}
 */
module.exports.listFiles = function( dir, extensions ) {
    var goodFiles = [];
    var fs = require('fs');
    var files = fs.readdirSync( dir );

    if (!extensions) {
        return files;
    }

    for (var i in files) {
        var extension = files[i].substr( files[i].lastIndexOf('.') );
        if (extensions.indexOf( extension.replace('.', '') ) > -1) {
            goodFiles.push({ fileName: files[i], path: dir, fullName: (dir ? dir + '/' : '') + files[i] });
        }
    }
    return goodFiles;
};

/**
 * List all files in a directory in Node.js recursively in a synchronous fashion
 * @param dir
 * @param filelist
 * @param extensions - the valid extensions.
 * @param recursive
 * @returns {Array}
 */
//
module.exports.walkSync = function(dir, filelist, extensions, recursive) {
    var self = this;
    recursive = typeof recursive === 'undefined' ? true: recursive;
    filelist = filelist || [];

    if (!recursive) {
        return this.listFiles( dir, extensions );
    };

    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);

    files.forEach(function(file) {
        if ( fs.statSync(dir + '/' + file).isDirectory() ) {
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

/**
 * Get the hashes out of a list of files.
 * @param list
 * @param callback
 * @param result - internal for recursion
 */
module.exports.getHashInfo = function( list, callback, result )  {
    var self = this;
    result = result || [];
    // The list is finished.
    if (!list || !(list.length)) {
        callback( result );
        return;
    }
    var objInfo = list[0];

    this.log( '[Get hash for: ' + objInfo.fileName, this.logLevels.DEBUG );

    this.getHash( objInfo.fullName )
        .then(function( infos ){
            self
                .log('[Hash obtained]', self.logLevels.DEBUG)
                .log(infos, self.logLevels.DEBUG);
            // Extend current object with new info.
            self.extendObj( objInfo, infos );
            result.push( objInfo );
            list.shift();
            self.getHashInfo( list, callback, result );
        }).catch(function (err) {
            self
                .log('[Hash error for file ' + objInfo.fileName + ']', self.logLevels.ALL)
                .log(err, self.logLevels.DEBUG);

            objInfo.error = true;
            objInfo.errorType = 'HASH_ERROR';
            result.push( objInfo );
            list.shift();
            self.getHashInfo( list, callback, result );
        });
};

/**
 * Search the subtitles for a list of file.
 * @param list
 * @param settings
 * @param callback
 * @param result - internal for recursion
 */
module.exports.getSubtitles  = function( list, settings, callback, result )  {
    var self = this;
    result = result || [];

    // The list is finished.
    if (!list || !(list.length)) {
        callback( result );
        return;
    }

    var objInfo = list[0];

    // Result of an error, so we don't have to look for subs.
    if (objInfo.error) {
        this
            .log('[Subtitles for ' + objInfo.fileName + ' skipped]', self.logLevels.ALL);
        result.push( objInfo );
        list.shift();
        this.getSubtitles( list, settings, callback, result );
        return;
    }

    this.log( '[Get subtitles for: ' + objInfo.fileName, this.logLevels.DEBUG );
    this.search( settings, objInfo )
        .then(function( infos ){
            self
                .log('[Subtitles obtained]', self.logLevels.DEBUG)
                .log(infos, self.logLevels.DEBUG);

            // Convert information in a useful structure.
            var numSub = Object.keys(infos).length;

            self
                .log('[Found ' + numSub + ' ' + (numSub === 1 ? 'subtitle' : 'subtitles') + ']', self.logLevels.DEBUG);

            var downloadList = [];
            for ( var j in infos ) {
                if ( infos[j].url ) {
                    downloadList.push( { url: infos[j].url, lang: j } );
                }
            }

            // Extend current object with subtitles information
            self.extendObj( objInfo, { subtitles: infos } );
            objInfo.downloadList = downloadList;
            result.push( objInfo );
            list.shift();
            self.getSubtitles( list, settings, callback, result );
        }).catch(function (err) {
            self
                .log('[Error in obtaining subtitles for file ' + objInfo.fileName + ']', self.logLevels.ALL)
                .log( err, self.logLevels.DEBUG);

            objInfo.error = true;
            objInfo.errorType = 'SUBTITLE_ERROR';
            result.push( objInfo );
            list.shift();
            self.getSubtitles( list, settings, callback, result );
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