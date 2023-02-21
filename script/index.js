"use strict";
exports.__esModule = true;
var util_1 = require("util");
var fs_1 = require("fs");
var path_1 = require("path");
var readline_1 = require("readline");
var parseDungeon_1 = require("./parseDungeon");
var jsonDirectory = "./dungeons";
var readJsonFilesDirectory = function () {
    return new Promise(function (resolve, reject) {
        return (0, fs_1.readdir)(jsonDirectory, function (err, files) {
            if (err) {
                reject("Error reading directory: ".concat(err));
            }
            else {
                var jsonFiles = files.filter(function (file) { return (0, path_1.extname)(file) === ".json"; });
                resolve(jsonFiles);
            }
        });
    });
};
var promptUser = function (jsonFiles) {
    return new Promise(function (resolve, reject) {
        console.log("Choose a JSON file to load:");
        jsonFiles.forEach(function (file, index) { return console.log("".concat(index + 1, ". ").concat(file)); });
        var rl = (0, readline_1.createInterface)({
            input: process.stdin,
            output: process.stdout
        });
        rl.question("Enter the index number of the file you want to load: ", function (answer) {
            rl.close();
            var index = parseInt(answer) - 1;
            if (isNaN(index) || index < 0 || index >= jsonFiles.length) {
                reject("Invalid selection");
            }
            else {
                resolve(jsonFiles[index]);
            }
        });
    });
};
var loadJsonFile = function (fileName) {
    return new Promise(function (resolve, reject) {
        var filePath = (0, path_1.join)(jsonDirectory, fileName);
        (0, fs_1.readFile)(filePath, function (err, data) {
            if (err) {
                reject("Error reading file: ".concat(err));
            }
            else {
                try {
                    var jsonData = JSON.parse(data.toString());
                    resolve(jsonData);
                }
                catch (e) {
                    reject("Error parsing JSON: ".concat(e));
                }
            }
        });
    });
};
var gameLoop = function (dungeon, gameState) {
    var _a;
    if (gameState === void 0) { gameState = { currentRoom: 0 }; }
    var currentRoom = (_a = dungeon.rooms) === null || _a === void 0 ? void 0 : _a.find(function (room) { return room.id === gameState.currentRoom; });
};
var app = function () {
    return readJsonFilesDirectory()
        .then(promptUser)
        .then(loadJsonFile)
        .then(function (x) { return (0, parseDungeon_1.parseDungeon)(x); })
        .then(function (dungeon) {
        console.log((0, util_1.inspect)(dungeon, { depth: 5, colors: true }));
        return dungeon;
    }).then(gameLoop)["catch"](function (err) {
        console.error(err);
    });
};
app();
