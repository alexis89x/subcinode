var isoLangs = require("langs");

/* No comment needed */
module.exports.logLevels = {
    DEBUG: 60,
    INFO: 50,
    WARNING: 40,
    ERROR: 30,
    FATAL: 20,
    ALL: 10
};

module.exports.SETTINGS_FILE = 'settings.json';

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
    var self = this;
    var argv = process.argv;
    var args = this.defaultSettings;

    var saveFile = false; // If true, save settings into a file

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
        } else if (arg === "-save") {
            // We will save the settings into a file.
            saveFile = true;
        } else if (arg === "-settings") {
            // Show more log
            args.onlySettings = true;
        }
    }

    var isDefaultPath = args.path === "CWD";

    if ( saveFile ) {
        self.log( '[Saving settings]', self.logLevels.ALL );
        if ( isDefaultPath ) { args.path = "CWD"; } else {
            // Fix path backslash
            if ( args.path.lastIndexOf('/') === (args.path.length-1) ) {
                args.path = args.path.substr( 0, args.path.length - 1 );
            }
        }

        this.writeJSONFile( this.SETTINGS_FILE, args, function( err ) {
            if ( err ) {
                self.log( '[Error while saving settings]', self.logLevels.ALL );
            } else {
                self.log( '[Settings saved successfully]', self.logLevels.ALL );
            }
        });
    }

    // If path is the default, use it
    args.path = isDefaultPath ? process.cwd() : args.path;

    // Fix path backslash
    if ( args.path.lastIndexOf('/') === (args.path.length-1) ) {
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
 * @requires opensubtitles-api
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
 * @requires fs
 * @param dir
 * @param extensions - the valid extensions.
 * @param langs - the langs to download subtitles for
 * @returns {Array}
 */
module.exports.listFiles = function( dir, extensions, langs ) {
    var goodFiles = [];
    var fs = require('fs');
    var files = fs.readdirSync( dir );

    if (!extensions) {
        return files;
    }

    for (var i in files) {
        var extension = files[i].substr( files[i].lastIndexOf('.') );
        if (extensions.indexOf( extension.replace('.', '') ) > -1 && this.shouldDownload(dir, files[i], langs, 0)) {
            goodFiles.push({ fileName: files[i], path: dir, fullName: (dir ? dir + '/' : '') + files[i] });
        }
    }
    return goodFiles;
};

/**
 * List all files in a directory in Node.js recursively in a synchronous fashion
 * @requires fs
 * @param dir
 * @param filelist
 * @param extensions - the valid extensions.
 * @param langs - the langs to download subtitles for
 * @param recursive
 * @returns {Array}
 */
//
module.exports.walkSync = function(dir, filelist, extensions, langs, recursive) {
    var self = this;
    recursive = typeof recursive === 'undefined' ? true: recursive;
    filelist = filelist || [];

    if (!recursive) {
        return this.listFiles( dir, extensions, langs );
    };

    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);

    files.forEach(function(file) {
        if ( fs.statSync(dir + '/' + file).isDirectory() ) {
            filelist = self.walkSync(dir + '/' + file, filelist, extensions, langs, recursive);
        }
        else {
            if ( extensions ) {
                var extension = file.substr( file.lastIndexOf('.') );
                if (extensions.indexOf( extension.replace('.', '') ) > -1 && self.shouldDownload(dir, file, langs, 0)) {
                    filelist.push({ fileName: file, path: dir, fullName: (dir ? dir + '/' : '') + file });
                }
            } else {
                filelist.push({ fileName: file, path: dir, fullName: (dir ? dir + '/' : '') + file });
            }
        }
    });
    return filelist;
};

module.exports.shouldDownload = function(dir, file, langs, index) {
    var fs = fs || require('fs'),
        lang = isoLangs.where("2", langs[index])["1"];

    var completeSubName = dir + '/' + this.saveAs(file, lang);
    try {
        fs.accessSync(completeSubName, fs.F_OK);
        index++;
        if (index < langs.length) {
            return this.shouldDownload(dir, file, langs, index)
        } else {
            return false;
        }
    } catch (e) {
        return true;
    }
}

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
                    if ( settings.langs.join('') === 'all' || settings.langs.indexOf(j) ) {
                        downloadList.push( { url: infos[j].url, lang: j } );
                    }
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

/**
 * Get the name for the final download subtitle file, based on name of the video file
 * and subtitle language
 *
 * @param name
 * @param lang
 * @returns {string}
 */
module.exports.saveAs = function (name, lang) {
    return name.substr( 0, name.lastIndexOf('.') ) +
    '.' +
    lang + '.srt';
}

/**
 * Download a list of files.
 * @requires http
 * @requires fs
 * @param list
 * @param callbacks - the are two callbacks. Progress and Complete.
 * * @param result - internal for recursion
 * @returns {boolean}
 */
module.exports.download = function (list, callbacks, result) {
    var http = require('http');
    var fs = require('fs');
    var self = this;
    var DOWNLOAD_DELAY = 400;
    //var parser = require('subtitles-parser');

    result = result || { errors: [], files: [] };

    // Moves to the following iteration
    function moveNext( objInfo ) {
        if ( objInfo.error ) {
            objInfo.errorType = 'DOWNLOAD_ERROR';
            result.errors.push( objInfo );
        } else {
            result.files.push( objInfo );
        }

        list.shift();
        callbacks.progress( objInfo );

        setTimeout(function(){
            // Download next.
            self.download(list, callbacks, result);
        }, DOWNLOAD_DELAY);
    }

    // Prepares callbacks.
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
        callbacks.complete( result );
        return true;
    }

    var objInfo = list[0];

    this.log('[Downloading ' + objInfo.url + '...]', this.logLevels.DEBUG);

    try {
        var destinationPath = objInfo.path;
        var destinationName = objInfo.saveAs;

        if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath);
        }

        var targetFilePath = destinationPath + destinationName;
        targetFilePath = targetFilePath.replace('//', '/');

        var file = fs.createWriteStream(targetFilePath);

        objInfo.targetFilePath = targetFilePath;

        var request = http.get( objInfo.url, function (response) {
            response.pipe(file);
            //TODO parser.fromSrt parse srt to array, add Subcino advertising, rewrite to file
            moveNext( objInfo );
        });
    } catch (ex) {
        self
            .log('[Download error for ' + destinationName + ']', self.logLevels.ERROR)
            .log(ex, self.logLevels.DEBUG);
        objInfo.error = true;
        moveNext( objInfo );
    }
};

/**
 * Reads a JSON file.
 * @param file
 * @param callback
 */
module.exports.readJSONFile = function( file, callback ) {
    var jsonfile = require('jsonfile');
    if (!file) {
        return;
    }
    if (!callback) {
        return jsonfile.readFileSync(file);
    } else {
        return jsonfile.readFile(file, function(err, obj) {
            callback( obj || {}, err );
        })
    }
};

module.exports.writeJSONFile = function( file, obj, callback ) {
    var jsonfile = require('jsonfile');
    if (!file || !obj) {
        return;
    }
    if (!callback) {
        return jsonfile.writeFileSync(file, obj);
    } else {
        return jsonfile.writeFile(file, obj, {spaces: 2}, function(err) {
            if ( callback ) {
                callback( err );
            }
        });
    }
};

module.exports.insertPromoSub = function(fileStr) {
    var parser = require('subtitles-parser');
    var srt = parser.fromSrt(fileStr, true);
    var startPos = Math.floor(srt.length/4); //Math.floor(srt.length/2);

    var found = 0;

    for (var i = startPos; i < srt.length ; i++) {
        if (i != (srt.length - 1)) {
            var availableInterval = parseInt(srt[i + 1].startTime, 10) - parseInt(srt[i].endTime, 10);
            //if we have more than 3 seconds between a caption and the next one
            if (availableInterval > 3000) {
                var matchedIndex = i + 1;

                var id = matchedIndex + 1;

                var startTime = parseInt(srt[matchedIndex - 1].endTime, 10) + 500;
                var endTime = parseInt(srt[matchedIndex].startTime, 10) - 500;
                if ( endTime - startTime > 5000 ) {
                    endTime = startTime + 5000;
                    // It can last 5000 milliseconds maximum.
                }

                var promoSub = {
                    id : id.toString(),
                    startTime : startTime,
                    endTime : endTime,
                    text : "Downloaded with Subcino [www.subcino.com]"
                };

                srt.splice(matchedIndex, 0, promoSub);

                for (var j = matchedIndex + 1; j < srt.length ; j++) {
                    srt[j].id = (parseInt(srt[j].id) + 1).toString();
                }

                found++;
                /*if ( found == 2 ) {
                    return parser.toSrt(srt);
                }*/
            }
        }
    }
    return parser.toSrt(srt);
};

// TODO ARGS TO RETRIVE JUST THE DEFAULT SETTINGS.


module.exports.getDefaultSettings = function( callback ) {
    var self = this;

    self.defaultSettings = {
        recursive: true,
        extensions: ['mp4', 'mkv', 'avi'],
        langs: [ 'all' ],
        path: "CWD", // By default, uses the current working directory.
        useSubs: false,
        debug: false
    };

    try {

        this.readJSONFile( this.SETTINGS_FILE, function( data, error ) {
            if ( error ) {
                // We ignore "File not found" error.
                if ( error.code !== 'ENOENT' ) {
                    self.log('[Error while getting saved settings]', self.logLevels.ERROR);
                    self.log( error, self.logLevels.DEBUG );
                }
                callback( self.defaultSettings );
            } else {
                self.extendObj( self.defaultSettings, data || {} );
                callback( self.defaultSettings );
            }
        });
    } catch( ex ) {
        self.log('[Error while getting saved settings]', self.logLevels.ERROR);
        self.log( ex, self.logLevels.DEBUG );
        callback( self.defaultSettings );
    }

};