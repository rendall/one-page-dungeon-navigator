"use strict";
/** This node app will run a random walk through a random dungeon */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var dungeon_1 = require("../lib/dungeon");
var util_1 = require("util");
var fs_1 = require("fs");
var path_1 = require("path");
var parseDungeon_1 = require("../lib/parseDungeon");
var gameLoop_1 = require("../lib/gameLoop");
var jsonDirectory = "./static/dungeons";
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
var chooseRandom = function (jsonFiles) {
    return new Promise(function (resolve, reject) {
        var index = Math.floor(Math.random() * jsonFiles.length);
        console.log("Selected: ".concat(jsonFiles[index]));
        resolve(jsonFiles[index]);
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
var gameLoop = function (dungeon) { return __awaiter(void 0, void 0, void 0, function () {
    var inputToGame, out, welcome, possibleActions, action;
    return __generator(this, function (_a) {
        inputToGame = (0, gameLoop_1.game)(dungeon);
        out = {
            action: "init",
            message: "",
            room: 0,
            description: "",
            exits: [],
            end: false,
            turn: 0
        };
        welcome = inputToGame("init");
        console.log(welcome.message);
        console.log(welcome.description);
        welcome.exits.forEach(function (exit) { return console.log(exit.description); });
        while (!out.end) {
            possibleActions = __spreadArray(__spreadArray([], dungeon_1.exitDirections, true), gameLoop_1.actions, true).filter(function (action) { return !["quit", "UNKNOWN"].includes(action); });
            action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
            console.log(action);
            out = inputToGame(action);
            console.log(out.message);
            if (!out.end) {
                console.log("#".concat(out.turn, ": ").concat(out.description));
                out.exits.forEach(function (exit) { return console.log(exit.description); });
            }
        }
        return [2 /*return*/];
    });
}); };
var printDungeon = function (dungeon) {
    console.log((0, util_1.inspect)(dungeon, { depth: 6, colors: true }));
    return dungeon;
};
var app = function () {
    return readJsonFilesDirectory()
        .then(chooseRandom)
        .then(loadJsonFile)
        .then(function (x) { return (0, parseDungeon_1.parseDungeon)(x); })
        .then(printDungeon)
        .then(gameLoop)["catch"](function (err) {
        console.error(err);
    });
};
app();
