#!/usr/bin/env node

var subUtils = require("./subcinoUtils.js");

// Process the shell arguments.
var args = subUtils.parseArgs();

subUtils.setDebugLevel( args );

subUtils
    .log( '[Shell arguments]', subUtils.logLevels.DEBUG )
    .log( args, subUtils.logLevels.DEBUG );

subUtils.log('[Navigating path...]', subUtils.logLevels.ALL );
var files = subUtils.walkSync( args.path, null, args.extensions, args.recursive );
subUtils
    .log('[Found ' + files.length + ' ' + (files.length != 1 ? 'files' : 'file') + ']', subUtils.logLevels.ALL )
    .log('[File list]', subUtils.logLevels.DEBUG);

files.forEach(function( file ) {
    subUtils.log( 'Found: ' + file.fullName.replace(args.path + '/', ''), subUtils.logLevels.DEBUG );
});

var elements = [];
subUtils
    .log('[Login...]')
    .subtitleLogin().then(function (res) {
        subUtils
            .log('[Login successful]', subUtils.logLevels.ALL)
            .log(arguments, subUtils.logLevels.DEBUG)
            .log('[Obtaining hash information...]', subUtils.logLevels.ALL);

        subUtils.getHashInfo( files, function( hashes ) {
            subUtils
                .log('[Hash information obtained for all files]', subUtils.logLevels.ALL);

            subUtils.getSubtitles( hashes, args, function( subtitles ) {

                // Prepares subtitles list.
                var dwnList = [];
                for ( var j = 0, ln = subtitles.length; j<ln; j++ ) {
                    var subObj = subtitles[j];
                    var fileExt = subObj.fileName.substr( subObj.fileName.lastIndexOf('.') );
                    subObj.subfolder = args.useSubs ? '/subs/' : '/';
                    for ( var k in subObj.downloadList ) {
                        subObj.downloadList[k].saveAs =
                            subObj.fileName.substr( 0, subObj.fileName.lastIndexOf('.') ) +
                            '.' +
                            subObj.downloadList[k].lang + '.srt';

                        subObj.downloadList[k].path = subObj.path + subObj.subfolder;
                    }
                    dwnList = dwnList.concat( subtitles[j].downloadList );
                }

                subUtils
                    .log(   '[Subtitles search completed. Found ' +
                    dwnList.length + ' ' +
                    ((dwnList.length === 1) ? 'subtitle' : 'subtitles') +
                    '.]', subUtils.logLevels.ALL);

                return;

                subUtils.download( dwnList, {
                    complete: function() {
                        console.log('HELLO');
                    },
                    progress: function() {
                        console.log('FROM THE OTHER SIDE');
                    }
                }, args.log);

            }, null, args.debug);



        }, null, args.debug);
    }).catch(function (err) {
        subUtils
            .log('[FATAL: Login error. Could not login to the Subtitle Services]', subUtils.logLevels.FATAL)
            .log(arguments, subUtils.logLevels.DEBUG);
    });