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
exports.__esModule = true
exports.parseDungeon = exports.facingDirection = void 0
var facingDirection = function (door) {
  if (door.dir.x === -1) return "west"
  if (door.dir.y === 1) return "south"
  if (door.dir.x === 1) return "east"
  if (door.dir.y === -1) return "north"
  return "UNKNOWN"
}
exports.facingDirection = facingDirection
var describeDoor = function (door, direction, destination) {
  var isFacing = (0, exports.facingDirection)(door) === direction
  switch (door.type) {
    case 0:
      // These are open entrances where the area beyond is clearly visible
      var roomBeyond = getRoomNoun(destination, [])
      return roomBeyond
    case 1:
      return "door"
    case 2:
      return "narrow entrance to a " + getRoomNoun(destination, [])
    case 3:
      return "way out of the dungeon"
    case 4:
      return isFacing ? "portcullis" : "portcullis with a lever on the wall next to it"
    case 5:
      return "double doors"
    case 6: {
      return isFacing ? "secret door" : "door"
    }
    case 7:
      return "steel door"
    case 8:
      return "broad staircase down"
    case 9: {
      return "stairwell ".concat(isFacing ? "down" : "up")
    }
    default:
      console.warn("Unknown door type ".concat(door.type))
      return "portal"
  }
}
var describeRoom = function (room, exits, columns, water) {
  var noun = getRoomNoun(room, exits)
  var columnDesc =
    columns && columns.length > 0
      ? room.rotunda
        ? "\n".concat(columns.length, " columns ring the center of the room.")
        : "\ntwo rows of ".concat(Math.floor(columns.length / 2), " columns support the ceiling.")
      : ""
  var waterDesc =
    water && water.length > 0
      ? water.length === room.h * room.w
        ? "\nWater entirely covers the floor."
        : "\nWater covers part of the floor (".concat(Math.floor(100 * (water.length / (room.h * room.w))), "%).")
      : ""
  var description = "".concat(noun, " ").concat(columnDesc).concat(waterDesc).trim()
  return description
}
var random = function (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
var areOpposite = function (dir1, dir2) {
  return (
    (dir1 === "north" && dir2 === "south") ||
    (dir1 === "south" && dir2 === "north") ||
    (dir1 === "east" && dir2 === "west") ||
    (dir1 === "west" && dir2 === "east")
  )
}
var getRoomNoun = function (room, exits) {
  if (room === "outside") return room
  var exitsLength = exits.filter(function (exit) {
    return exit.description !== "secret door"
  }).length
  if (is1x1(room)) {
    switch (exitsLength) {
      case 1:
        return "alcove"
      case 2:
        var _a = exits.map(function (exit) {
            return exit.towards
          }),
          dir1 = _a[0],
          dir2 = _a[1]
        if (areOpposite(dir1, dir2)) {
          return random(["entranceway", "archway"])
        } else {
          return "bend"
        }
      case 3:
        return "three-way intersection"
      case 4:
        return "four-way intersection"
      default:
        return "dim passage"
    }
  }
  if (room.h === 1 || room.w === 1) {
    if (room.w === 2 || room.h === 2) return "short hallway"
    if (room.w > 5 || room.h > 5) return "long hallway"
    return "hallway"
  }
  if (room.rotunda) return "round room"
  if (room.w === room.h) return "square room"
  return "room"
}
/** 1 x 1 rooms are connectors between different rooms */
var is1x1 = function (a) {
  return a.w === 1 && a.h === 1
}
var isAdjacent = function (a, b) {
  if (!is1x1(a) && !is1x1(b)) return false // in this format, if rects are adjacent, one of them must by 1 x 1
  if (!is1x1(b)) return isAdjacent(b, a) // makes things easier if the 2nd is always the 1 x 1
  var left = a.x
  var top = a.y
  var right = a.x + a.w
  var bottom = a.y + a.h
  var isTop = b.y === top - 1
  var isRight = b.x === right
  var isBottom = b.y === bottom
  var isLeft = b.x === left - 1
  if (isTop || isBottom) return b.x >= a.x && b.x < right
  if (isRight || isLeft) return b.y >= a.y && b.y < bottom
  return false
}
var isInside = function (pos, rect) {
  return pos.x >= rect.x && pos.x < rect.x + rect.w && pos.y >= rect.y && pos.y < rect.y + rect.h
}
var getDir = function (from, to) {
  if (!from) return "UNKNOWN"
  // to is expected to be a 1x1
  if (!is1x1(to)) {
    console.warn("Unexpected argument to getDir ".concat(to))
    return "UNKNOWN"
  }
  if (!isAdjacent(to, from)) {
    console.warn("Arguments to getDir are not adjacent: ".concat({ from: to, to: from }))
    return "UNKNOWN"
  }
  if (to.x === from.x - 1) return "west"
  if (to.x === from.x + from.w) return "east"
  if (to.y === from.y - 1) return "north"
  if (to.y === from.y + from.h) return "south"
  return "UNKNOWN"
}
var doorFunc = function (doors) {
  return function (a) {
    return doors.find(function (door) {
      return door.x === a.x && door.y === a.y
    })
  }
}
var getAdjacent = function (a, rects) {
  return rects.filter(function (rect) {
    return isAdjacent(rect, a)
  })
}
var parseDungeon = function (dungeon) {
  var rects = dungeon.rects,
    notes = dungeon.notes,
    doors = dungeon.doors
  var rectsWithId = rects.map(function (r, id) {
    return __assign({ id: id }, r)
  })
  var isDoor = function (rect) {
    return (
      rect.h === 1 &&
      rect.w === 1 &&
      doors.some(function (door) {
        return door.x === rect.x && door.y === rect.y
      })
    )
  }
  var doorsWithId = rectsWithId
    .filter(function (rect) {
      return isDoor(rect)
    })
    .map(function (rect) {
      return __assign(
        { id: rect.id },
        doors.find(function (door) {
          return door.x === rect.x && door.y === rect.y
        })
      )
    })
  var getDoor = doorFunc(doorsWithId)
  var rooms = rectsWithId
    .filter(function (r) {
      return !getDoor(r)
    })
    .map(function (fullRoom) {
      var _a, _b
      var exits = getAdjacent(fullRoom, rectsWithId).map(function (exit) {
        var _a
        var door = getDoor(exit)
        var direction = getDir(fullRoom, exit)
        if (door) {
          // If the exit is a door, include the to
          var destination = rectsWithId.find(function (x) {
            return isAdjacent(x, exit) && x.id !== fullRoom.id
          })
          var to =
            (_a = destination === null || destination === void 0 ? void 0 : destination.id) !== null && _a !== void 0
              ? _a
              : "outside"
          var isFacing = (0, exports.facingDirection)(door) === direction
          return {
            towards: direction,
            isFacing: isFacing,
            to: to,
            type: door.type,
            door: door,
            description: destination ? describeDoor(door, direction, destination) : "way out of the dungeon",
          }
        } else return { towards: direction, to: exit.id }
      })
      var door = getDoor(fullRoom)
      var contains =
        (_b =
          (_a = notes.filter(function (note) {
            return isInside(note.pos, fullRoom)
          })) === null || _a === void 0
            ? void 0
            : _a[0]) === null || _b === void 0
          ? void 0
          : _b.text
      var columns = dungeon.columns.filter(function (column) {
        return isInside(column, fullRoom)
      })
      var water = dungeon.water.filter(function (column) {
        return isInside(column, fullRoom)
      })
      var description = describeRoom(fullRoom, exits, columns, water)
      var room = __assign(
        __assign(
          __assign(
            __assign(
              {
                id: fullRoom.id,
                description: description,
                area: fullRoom.rotunda
                  ? "".concat(fullRoom.h, "m across")
                  : "".concat(fullRoom.w, "m x ").concat(fullRoom.h, "m"),
              },
              contains ? { contains: contains } : {}
            ),
            fullRoom.ending ? { ending: true } : {}
          ),
          door ? { door: door } : {}
        ),
        { exits: exits, x: fullRoom.x, y: fullRoom.y, w: fullRoom.w, h: fullRoom.h }
      )
      return room
    })
  return __assign(__assign({}, dungeon), { rooms: rooms, doors: doorsWithId, rects: rectsWithId })
}
exports.parseDungeon = parseDungeon
