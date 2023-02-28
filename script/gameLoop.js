"use strict"
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i]
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
        }
        return t
      }
    return __assign.apply(this, arguments)
  }
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i)
          ar[i] = from[i]
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from))
  }
exports.__esModule = true
exports.game = void 0
var dungeon_1 = require("./dungeon")
var initState = {
  id: 0,
  message: "",
  turn: 0,
  end: false,
  doors: [],
}
/** Returns a function that accepts old game state and returns new game state.
 * @param dungeon
 * @returns (gameState) => gameState
 */
var inputFunc = function (dungeon) {
  return function (oldGameState) {
    var _a, _b, _c
    var gameState = __assign(__assign({}, oldGameState), {
      error: undefined,
      end: undefined,
    })
    var currentRoom =
      (_a = dungeon.rooms) === null || _a === void 0
        ? void 0
        : _a.find(function (room) {
            return room.id === gameState.id
          })
    switch (gameState.action) {
      case "east":
      case "west":
      case "north":
      case "south":
        var isVisible = isVisibleExitFunc(gameState)
        var exit_1 = currentRoom.exits.filter(isVisible).find(function (e) {
          return e.towards === gameState.action
        })
        if (!exit_1)
          return __assign(__assign({}, gameState), {
            message: "You cannot go that way",
          })
        if (exit_1.to === "outside")
          return __assign(__assign({}, gameState), {
            message: "You leave the dungeon",
            end: true,
          })
        // portcullis special handling...
        if (exit_1.door.type === dungeon_1.DoorType.portcullis) {
          var exitDoor =
            (_b = gameState.doors) === null || _b === void 0
              ? void 0
              : _b.find(function (door) {
                  return door.id === exit_1.door.id
                })
          var isOpen =
            (_c = exitDoor === null || exitDoor === void 0 ? void 0 : exitDoor.status) === null || _c === void 0
              ? void 0
              : _c.find(function (s) {
                  return s === "unlocked"
                })
          if (exit_1.isFacing) {
            if (!isOpen)
              return __assign(__assign({}, gameState), {
                message: "The portcullis bars your way.",
              })
          } else {
            if (!isOpen) {
              var exitDoor_1 = dungeon.doors.find(function (door) {
                return door.id === exit_1.door.id
              })
              var openDoor = __assign(__assign({}, exitDoor_1), {
                status: ["unlocked"],
              })
              var newGameState = __assign(__assign({}, gameState), {
                doors: __spreadArray(__spreadArray([], gameState.doors, true), [openDoor], false),
                message: "You pull the lever. The portcullis opens.",
              })
              return newGameState
            }
          }
        }
        return __assign(__assign({}, gameState), {
          id: exit_1.to,
          message: "You go ".concat(gameState.action, "."),
        })
      case "search": {
        var secret = currentRoom.exits.find(function (e) {
          return e.door.type === 6
        })
        if (secret) {
          var doors = __spreadArray(
            __spreadArray([], gameState.doors, true),
            [__assign(__assign({}, secret.door), { status: ["discovered"] })],
            false
          )
          return __assign(__assign({}, gameState), {
            doors: doors,
            message: "You discover a secret door to the ".concat(secret.towards, "!"),
          })
        } else
          return __assign(__assign({}, gameState), {
            message: "You find nothing of interest.",
          })
      }
      case "quit":
        return __assign(__assign({}, gameState), {
          message: "You quit.",
          end: true,
        })
      default:
        if (/\d/.test(gameState.action)) {
          var isVisible_1 = isVisibleExitFunc(gameState)
          var exit_2 = currentRoom.exits
            .filter(isVisible_1)
            .slice(0)
            .sort(function (a, b) {
              return b.door.id - a.door.id
            })[parseInt(gameState.action) - 1]
          if (!exit_2)
            return __assign(__assign({}, gameState), {
              message: "You cannot go that way",
            })
          if (exit_2.to === "outside")
            return __assign(__assign({}, gameState), {
              message: "You leave the dungeon",
              end: true,
            })
          return __assign(__assign({}, gameState), {
            id: exit_2.to,
            message: "You go ".concat(gameState.action),
          })
        } else
          return __assign(__assign({}, gameState), {
            message: "Not understood.",
            error: "syntax",
          })
    }
  }
}
var isVisibleExitFunc = function (gameState) {
  return function (exit) {
    switch (exit.type) {
      case 6:
        var exitDoor = gameState.doors.find(function (door) {
          return door.id === exit.door.id
        })
        if (
          exitDoor &&
          exitDoor.status.some(function (s) {
            return s === "discovered"
          })
        )
          return true
        return !exit.isFacing
      default:
        return true
    }
  }
}
var parseInput = function (input) {
  switch (input) {
    case "e":
      return "east"
    case "w":
      return "west"
    case "n":
      return "north"
    case "s":
      return "south"
    case "q":
      return "quit"
    case "x":
      return "search"
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      return input
    default:
      return "unknown"
  }
}
var getCurrentRoomFunc = function (dungeon) {
  return function (id) {
    var _a
    var room =
      (_a = dungeon.rooms) === null || _a === void 0
        ? void 0
        : _a.find(function (room) {
            return room.id === id
          })
    if (!room) throw Error("Bad data: room ".concat(id, " not found"))
    return room
  }
}
var describeRoomFunc = function (getCurrentRoom) {
  return function (gameState) {
    var _a
    var room = getCurrentRoom(gameState.id)
    var isVisible = isVisibleExitFunc(gameState)
    var exits = room.exits
      .filter(isVisible)
      .slice(0)
      .sort(function (a, b) {
        return b.door.id - a.door.id
      })
    // areExitsSame is true if there are 2 or more exits with the same direction
    var areExitsSame = exits.some(function (exit, i, all) {
      return __spreadArray(__spreadArray([], all.slice(0, i), true), all.slice(i + 1), true).find(function (e) {
        return e.towards === exit.towards
      })
    })
    var exitNumber = function (doShow, index) {
      return doShow ? " #(".concat(index + 1, ")") : ""
    }
    var exitsDescription = exits.reduce(function (description, exit, i) {
      return (
        description +
        "To the ".concat(exit.towards, " is a ").concat(exit.description).concat(exitNumber(areExitsSame, i)) +
        "\n"
      )
    }, "")
    var description =
      "A ".concat(room.area, " ").concat(room.description) +
      "\n" +
      "".concat((_a = room.contains) !== null && _a !== void 0 ? _a : "", " ") +
      "\n" +
      exitsDescription
    return { description: description, exits: exits }
  }
}
var game = function (dungeon) {
  var interpretInput = inputFunc(dungeon)
  var gameState = initState
  var getCurrentRoom = getCurrentRoomFunc(dungeon)
  var describeRoom = describeRoomFunc(getCurrentRoom)
  var initMessage = __assign(
    __assign({ message: dungeon.title + "\n" + dungeon.story, room: gameState.id }, describeRoom(gameState)),
    { action: "init", end: false }
  )
  var gameInterface = function (input) {
    if (gameState.turn > 0) {
      var action = parseInput(input)
      gameState = interpretInput(
        __assign(__assign({}, gameState), {
          action: action,
          turn: gameState.turn + 1,
        })
      )
      return __assign(__assign({ message: gameState.message, room: gameState.id }, describeRoom(gameState)), {
        end: gameState.end,
        error: gameState.error,
        action: action,
      })
    } else {
      if (input !== "INIT") throw new Error("The first call to the game must be 'INIT")
      gameState = __assign(__assign({}, gameState), { turn: 1 })
      return initMessage
    }
  }
  return gameInterface
}
exports.game = game
