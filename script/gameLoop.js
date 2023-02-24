"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.game = void 0;
var initState = {
    id: 0,
    turn: 0,
    message: "",
    end: false,
    discovered: []
};
var inputFunc = function (dungeon) { return function (oldGameState) {
    var _a;
    var gameState = __assign(__assign({}, oldGameState), { error: undefined });
    var currentRoom = (_a = dungeon.rooms) === null || _a === void 0 ? void 0 : _a.find(function (room) { return room.id === gameState.id; });
    switch (gameState.action) {
        case "east":
        case "west":
        case "north":
        case "south":
            var isVisible = isVisibleExitFunc(gameState);
            var exit = currentRoom.exits.filter(isVisible).find(function (e) { return e.towards === gameState.action; });
            if (!exit)
                return __assign(__assign({}, gameState), { message: "You cannot go that way" });
            if (exit.to === "outside")
                return __assign(__assign({}, gameState), { message: "You leave the dungeon", end: true });
            return __assign(__assign({}, gameState), { id: exit.to, message: "You go ".concat(gameState.action) });
        case "search": {
            var secret = currentRoom.exits.find(function (e) { return e.description === 'secret door'; });
            if (secret) {
                var discovered = __spreadArray(__spreadArray([], gameState.discovered, true), [{ id: currentRoom.id, towards: secret.towards }], false);
                return __assign(__assign({}, gameState), { discovered: discovered, message: "You discover a secret door to the ".concat(secret.towards, "!") });
            }
            else
                return __assign(__assign({}, gameState), { message: "You find nothing of interest." });
        }
        case "quit":
            return __assign(__assign({}, gameState), { message: "You quit.", end: true });
        default:
            return __assign(__assign({}, gameState), { message: "Not understood.", error: "syntax" });
    }
}; };
var isVisibleExitFunc = function (gameState) { return function (exit) {
    if (exit.type !== 6 || !exit.isFacing)
        return true;
    var roomDiscovered = gameState.discovered.filter(function (d) { return d.id === gameState.id; });
    return roomDiscovered.some(function (d) { return d.towards === exit.towards; });
}; };
var parseInput = function (input) {
    switch (input) {
        case "e": return "east";
        case "w": return "west";
        case "n": return "north";
        case "s": return "south";
        case "q": return "quit";
        case "x": return "search";
        default: return "unknown";
    }
};
var getCurrentRoomFunc = function (dungeon) { return function (id) {
    var _a;
    var room = (_a = dungeon.rooms) === null || _a === void 0 ? void 0 : _a.find(function (room) { return room.id === id; });
    if (!room)
        throw Error("Bad data: room ".concat(id, " not found"));
    return room;
}; };
var describeRoomFunc = function (getCurrentRoom) { return function (gameState) {
    var _a;
    var room = getCurrentRoom(gameState.id);
    var isVisible = isVisibleExitFunc(gameState);
    var exits = room.exits.filter(isVisible);
    var exitsDescription = exits.reduce(function (description, exit) { return description + "To the ".concat(exit.towards, " is a ").concat(exit.description) + "\n"; }, "");
    var description = "A ".concat(room.area, " ").concat(room.description) + "\n" + "".concat((_a = room.contains) !== null && _a !== void 0 ? _a : '', " ") + "\n" + exitsDescription;
    return { description: description, exits: exits };
}; };
var game = function (dungeon) {
    var interpretInput = inputFunc(dungeon);
    var gameState = initState;
    var getCurrentRoom = getCurrentRoomFunc(dungeon);
    var describeRoom = describeRoomFunc(getCurrentRoom);
    var initMessage = __assign(__assign({ message: dungeon.title + "\n" + dungeon.story, room: gameState.id }, describeRoom(gameState)), { end: false });
    var gameInterface = function (input) {
        if (gameState.turn > 0) {
            var action = parseInput(input);
            gameState = interpretInput(__assign(__assign({}, gameState), { action: action, turn: gameState.turn + 1 }));
            return __assign(__assign({ message: gameState.message, room: gameState.id }, describeRoom(gameState)), { end: gameState.end, error: gameState.error });
        }
        else {
            if (input !== "INIT")
                throw new Error("The first call to the game must be 'INIT");
            gameState = __assign(__assign({}, gameState), { turn: 1 });
            return initMessage;
        }
    };
    return gameInterface;
};
exports.game = game;
