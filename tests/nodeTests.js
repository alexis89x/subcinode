/**
 * Created by alessandro.piana on 14/12/15.
 */

subUtils.test();
console.log("Hello World!");

var fs = require("fs");
fs.readFile("errors.txt", "utf8", function (error, data) {
    if (error) {
        throw error;
    }
    console.log(data);
});
console.log("Reading file...");


var fs = require('fs');
fs.readdir( process.argv[1].substr(0, process.argv[1].lastIndexOf('/')), function (err, files) {
    if (!err)
        console.log(files);
    else
        throw err;
});
console.log("Fired callback.");

console.log( subUtils.walkSync(process.argv[1].substr(0, process.argv[1].lastIndexOf('/')) ));



/*
 var fs = require("fs");
 var fileName = "errors.txt";
 fs.exists(fileName, function (exists) {
 if (exists) {
 fs.stat(fileName, function (error, stats) {
 if (error) {
 throw error;
 }

 if (stats.isFile()) {
 fs.readFile(fileName, "utf8", function (error, data) {
 if (error) {
 throw error;
 }
 console.log(data);
 });
 }
 });
 }
 });
 */


/*var async = require("async");
 async.series([
 function (callback) {
 setTimeout(function () {
 console.log("Task 1");
 callback(null, 1);
 }, 300);
 },
 function (callback) {
 setTimeout(function () {
 console.log("Task 2");
 callback(null, 2);
 }, 200);
 },
 function (callback) {
 setTimeout(function () {
 console.log("Task 3");
 callback(null, 3);
 }, 100);
 }
 ], function (error, results) {
 console.log(results);
 });*/

/*var async = require("async");
 async.series([
 function (callback) {
 setTimeout(function () {
 console.log("Task 1");
 callback(new Error("Problem in Task 1"), 1);
 }, 200);
 },
 function (callback) {
 setTimeout(function () {
 console.log("Task 2");
 callback(null, 2);
 }, 100);
 }], function (error, results) {
 if (error) {
 console.log(error.toString());
 } else {
 console.log(results);
 }
 });*/

var async = require("async");
async.waterfall([
    function (callback) {
        callback(null, Math.random(), Math.random());
    },
    function (a, b, callback) {
        callback(null, a * a + b * b);
    },
    function (cc, callback) {
        callback(null, Math.sqrt(cc));
    }
], function (error, c) {
    console.log(c);
});


process.argv.forEach(function(arg, index) {
    console.log("argv[" + index + "] = " + arg);
});



/*
 validExtensions: ['mp4', 'mkv', 'avi'],

 var extension = file.name.substr(file.name.lastIndexOf('.'));

 if (window.subcino.settings.validExtensions.indexOf(extension.replace('.', '')) == -1) {
 return;
 }

 subcino.log.log({
 type: 'info',
 message: 'Added new file: ' + file.name
 });

 window.subcino.status.files.push({
 name: file.name,
 path: file.path.replace(file.name, '')
 });

 window.subcino.status.files = _.uniq( window.subcino.status.files, function (file) {
 return file.path + file.name;
 });

 processAllFiles: function() {
 var self = this;
 // Obtain the settings ( language and destination folder ).
 var whereTo = $('input[name=quality]:checked').val();
 var lang = $('input[name=langCheck]:checked').val();

 if (!subcino.status.files.length) {
 return;
 }

 self.nav.moveNext();

 var settings = {
 langs: lang === 'all' ? 'all' : ($('#lang').val().join(',') || 'all'),
 subfolder: whereTo === 'same' ? '' : 'subs/'
 };

 // Removes duplicates files, and copies the array.
 subcino.status.files = _.uniq( subcino.status.files, function (file) {
 return file.path + file.name;
 });

 var _items = subcino.status.files.slice(0);

 var lists = [],
 processed = 0;

 process( _items, function() {
 finish( lists );
 });

 function process( list, callback ) {
 if (!list || !list.length) {
 callback();
 return;
 }

 try {
 // Process each file.
 self.processFile( list[0], settings, {
 success: function (downloadList) {
 lists = lists.concat(downloadList);
 processed++;

 self.addPercentage( (40/_items.length) );

 subcino.log.log({
 type: 'success',
 message: 'Processed ' + processed + ' out of ' + _items.length
 });
 subcino.log.log({
 type: 'info',
 message: 'Added ' + downloadList.length + ( downloadList.length === 1 ? ' file' : ' files') + ' to download.'
 });

 list.shift();
 process( list, callback );
 },
 error: function( err ) {
 subcino.log.log( err );
 // Application error. Close application.
 swal({
 title: "Aw, snap!",
 text: "An error occurred during the process. Please contact Subcino.com with the following information: " + err.message || err,
 type: "error",
 confirmButtonColor: "#538FD4",
 confirmButtonText: "Ok"
 }, function () {
 appWindow.close();
 });
 }
 });
 } catch (ex) {
 processed++;
 subcino.log.log({
 type: 'error',
 message: 'Processed ' + processed + ' out of ' + _items.length + ' with errors.'
 });

 if (processed === _items.length) {
 finish( lists );
 }
 }
 }


 function finish( lists ) {
 var showSubLimitEnded = false;
 lists = lists || [];

 // HERE WE SHOULD MAKE THE CALL TO THE SERVICE.

 subcino.lastDownloadedSubCount = lists.length;

 // We save the previous number of subtitles.
 var previousCount = subcino.currentUser.subtitle_count;

 subcino.services.AuthService.updateSubtitleCount({
 token: self.getStoredLoginInfo().token,
 loginType: self.getStoredLoginInfo().loginType,
 count: lists.length
 }, {
 success: function() {
 // Everything ok with the update.
 downloadFiles( lists );
 },
 error: function( error ) {
 var errorType = error && error.type || '';
 switch ( errorType ) {
 case 'OUT_OF_LIMIT_SUBS': // User had no more subtitles available.
 self.showFinishedSubMessage();
 break;
 case 'LESS_THAN_ALL_SUBS': // User had a few slots available, sorry.
 lists = lists.splice( 0, error.availableSubs );
 showSubLimitEnded = true;
 downloadFiles( lists );
 break;
 default:
 // Application error. Close application.
 swal({
 title: "Aw, snap!",
 text: "An error occurred during the process. Please contact Subcino.com with the following information: " + error.message || error,
 type: "error",
 confirmButtonColor: "#538FD4",
 confirmButtonText: "Ok"
 }, function () {
 appWindow.close();
 });
 return false;
 }
 }
 });


 function downloadFiles( lists ) {
 var len = lists.length;
 var downloaded = 0;
 subcino.log.log({
 type: 'success',
 message: 'Finished processing. Starting download...'
 });

 subcino.services.Utils.download(lists, {
 complete: function () {
 var $resultArea = $('.result-area');
 subcino.log.log({
 type: 'success',
 message: 'Process completed.'
 });

 if ( previousCount < 150 && subcino.currentUser.subtitle_count >= 150 ) {
 // It's time for the user to now why the name is subcino.
 self.showCinoMeaning();
 }

 self.fillProfileModal();
 if ( subcino.hasError ) {
 $resultArea.addClass('warning');
 $resultArea.find('.label-result-completed').html('Operation completed, with errors');
 $resultArea.find('i').attr('class', '').addClass('fa fa-warning');
 $resultArea.find('.label-result').html((len - subcino.hasError) + ' subtitles downloaded and ' + subcino.hasError + ' errors' );
 } else {
 $resultArea.find('.label-result-completed').html('Operation completed');
 $resultArea.find('i').attr('class', '').addClass('icon-ok');
 $resultArea.find('.label-result').html( (len) + ' subtitles downloaded' );
 }

 $('.actions-area.result').show();

 // Only if we are logged with Facebook we should do it.
 if ( subcino.currentUser.fb_id && self.getStoredLoginInfo().loginType == subcino.constants.LOGIN_TYPE_FB ) {
 $('#share-result').show().prop('disabled', false);
 }



 $resultArea.animate({ opacity: 1 }, 500);

 if ( showSubLimitEnded ) {
 self.showFinishedSubMessage();
 }

 },
 progress: function(  ) {
 downloaded++;
 subcino.currentUser.subtitle_count++;
 self.setLabelSubs();
 self.addPercentage( (60/len) );
 }
 });
 }
 };

 },

 processFile: function (file, settings, callback) {
 var self = this;

 if (!callback && $.isFunction(settings)) {
 // No settings, only callback has been provided
 callback = settings;
 settings = {};
 }

 settings.langs = settings.langs || 'all';

 var filePath = file.path;
 var fileName = file.name;
 var fileExt = fileName.substr(fileName.lastIndexOf('.'));

 subcino.log.log({
 type: 'info',
 message: 'Processing file { name: ' + fileName + ', path: ' + filePath + '}'
 });

 try {
 SubService.getHash(filePath + fileName)
 .then(function (infos) {
 var downloadList = [];
 subcino.log.log({
 type: 'info',
 message: 'Information extracted. Searching subtitles...',
 info: infos
 });

 if (!infos.moviehash) {
 // Some error occurred
 if (callback && callback.error ) {
 callback.error({
 type: 'error',
 message: 'Could not retrieve hash information for file: ' + fileName
 });
 return;
 }
 }

 SubService.search({
 sublanguageid: settings.langs || 'all'
 }, infos).then(function (subtitles) {
 var numSub = Object.keys(subtitles).length;
 subcino.log.log({
 type: 'info',
 message: 'Found ' + numSub + ' subtitles.',
 info: subtitles
 });

 var langs = (settings.langs || 'all').split(',');

 if (settings.langs !== 'all') {
 for (var j = 0; j < langs.length; j++) {
 if (subtitles && subtitles[langs[j]]) {
 var subName = fileName.replace(fileExt, '.' + langs[j] + '.srt');
 downloadList.push({
 path: subtitles[langs[j]].url,
 language: langs[j],
 saveAs: subName,
 targetPath: filePath,
 subfolder: settings.subfolder || ''
 });
 }
 }
 } else {
 for (var j in subtitles) {
 var subName = fileName.replace(fileExt, '.' + j + '.srt');
 downloadList.push({
 path: subtitles[j].url,
 language: j,
 saveAs: subName,
 targetPath: filePath,
 subfolder: settings.subfolder || ''
 });
 }
 }
 if ( callback && callback.success ) {
 callback.success(downloadList);
 }
 }).catch(function (err) {
 if (callback && callback.error ) {
 callback.error({
 type: 'error',
 message: err.message || err,
 info: err
 });
 }
 });

 }).catch(function (err) {
 if (callback && callback.error ) {
 callback.error({
 type: 'error',
 message: err.message || err,
 info: err
 });
 }
 });
 } catch ( err ) {
 if (callback && callback.error ) {
 callback.error({
 type: 'error',
 message: err.message || err,
 info: err
 });
 }

 }
 }

 */



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