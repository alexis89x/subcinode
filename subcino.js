var subUtils = require("./subcinoUtils");

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