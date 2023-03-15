/** This file takes a One Page Dungeon json file and parses it for navigation.
 * This is the immutable, single source of truth for the adventure.
 */
import {
  Column,
  Direction,
  Door,
  DoorType,
  Dungeon,
  Exit,
  ExitDirection,
  isDoorNote,
  JsonDungeon,
  JsonNote,
  Rect,
  Room,
  Water,
} from "./dungeon"
import { parseNote } from "./parseNote"

export const facingDirection = (door: Door): ExitDirection => {
  if (door.dir.x === -1) return "west"
  if (door.dir.y === 1) return "south"
  if (door.dir.x === 1) return "east"
  if (door.dir.y === -1) return "north"
}

const describeDoor = (door: Door, direction: ExitDirection, destination: Rect | "outside"): string | number => {
  const isFacing = facingDirection(door) === direction
  switch (door.type) {
    case 0: {
      // These are open entrances where the area beyond is clearly visible
      const roomBeyond = getRoomNoun(destination, [])
      return roomBeyond
    }
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
      return "broad stairs down"
    case 9: {
      return `stairs ${isFacing ? "down" : "up"}`
    }

    default:
      console.warn(`Unknown door type ${door.type}`)
      return "portal"
  }
}

const waterDescription = (room: Rect, water?: Water[]) => {
  if (!water?.length) return ""

  const area = room.h * room.w
  const percent = Math.floor(100 * (water.length / area))

  const floodDesc =
    water.length >= 12
      ? random([
          ", flooding it up to ankle level",
          " as a large lake",
          " flowing as a stream",
          ", almost a river",
          ", making it nearly impassable",
          " in a thick muddy layer, making it difficult to walk",
          " turning the space into a shallow pool",
          ", gushing like a river",
        ])
      : ""

  const floorCoverage = (percent: number): string => {
    if (percent < 10) {
      return "a small area"
    }

    if (percent <= 25) {
      return random(["part", "some"])
    }

    if (percent <= 50) {
      return random(["almost half", "some"])
    }

    if (percent <= 75) {
      return random(["more than half", "a good portion"])
    }

    return random(["a large area", "most", "almost all", "almost the entire"])
  }

  const basicDescription =
    percent === 100
      ? area <= 2
        ? "Water covers the floor"
        : "Water covers the entire floor"
      : `Water covers ${floorCoverage(percent)} of the floor`
  const here = Math.random() < 0.3 ? " here" : ""
  return `${basicDescription}${here}${floodDesc}. `
}

const describeRoom = (room: Rect, exits: Exit[], columns?: Column[], water?: Water[]): string => {
  const noun = getRoomNoun(room, exits)
  const columnDesc =
    columns && columns.length > 0
      ? room.rotunda
        ? `${columns.length} columns ring the center of the room. `
        : `There are ${Math.floor(columns.length)} columns arranged in two rows of ${Math.floor(
            columns.length / 2
          )} here. `
      : ""
  const waterDesc = waterDescription(room, water)
  const description = `${noun}. ${columnDesc}${waterDesc}`.trim()
  return description
}

const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const areOpposite = (dir1: string, dir2: string): boolean => {
  return (
    (dir1 === "north" && dir2 === "south") ||
    (dir1 === "south" && dir2 === "north") ||
    (dir1 === "east" && dir2 === "west") ||
    (dir1 === "west" && dir2 === "east")
  )
}

const getRoomNoun = (room: Rect | "outside", exits: Exit[]): string => {
  if (room === "outside") return room
  const exitsLength = exits.filter((exit) => exit.description !== "secret door").length
  if (is1x1(room)) {
    switch (exitsLength) {
      case 1:
        return "alcove"
      case 2: {
        const [dir1, dir2] = exits.map((exit) => exit.towards)
        if (areOpposite(dir1, dir2)) {
          return random(["entranceway", "archway"])
        } else {
          return "bend"
        }
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
const is1x1 = (a: Rect) => a.w === 1 && a.h === 1

/** Return true if a and b share one edge */
const isAdjacent = (a: Rect, b: Rect): boolean => {
  if (!is1x1(a) && !is1x1(b)) return false // in this format, if rects are adjacent, one of them must by 1 x 1
  if (!is1x1(b)) return isAdjacent(b, a) // makes things easier if the 2nd is always the 1 x 1

  const left = a.x
  const top = a.y
  const right = a.x + a.w
  const bottom = a.y + a.h

  const isTop = b.y === top - 1
  const isRight = b.x === right
  const isBottom = b.y === bottom
  const isLeft = b.x === left - 1

  if (isTop || isBottom) return b.x >= a.x && b.x < right
  if (isRight || isLeft) return b.y >= a.y && b.y < bottom

  return false
}

const isInside = (pos: { x: number; y: number }, rect: Rect) =>
  pos.x >= rect.x && pos.x < rect.x + rect.w && pos.y >= rect.y && pos.y < rect.y + rect.h

const getDir = <T extends Rect>(from: T | undefined, to: T): "north" | "south" | "east" | "west" => {
  if (!is1x1(to)) {
    console.error(`Unexpected argument to getDir ${to}`)
  }
  if (!isAdjacent(to, from)) {
    console.error(`Arguments to getDir are not adjacent: ${{ from: to, to: from }}`)
  }

  if (to.x === from.x - 1) return "west"
  if (to.x === from.x + from.w) return "east"
  if (to.y === from.y - 1) return "north"
  if (to.y === from.y + from.h) return "south"
}

const doorFunc = (doors: Door[]) => (a: { x: number; y: number }) =>
  doors.find((door) => door.x === a.x && door.y === a.y)

/** Return every rect that is connected to 'a' along one edge */
const getAdjacent = <T extends Rect>(a: T, rects: T[]) => rects.filter((rect) => isAdjacent(rect, a))

/** Accepts One-Page JSON and returns a navigable object */
export const parseDungeon = (dungeon: JsonDungeon): Dungeon => {
  const { rects, notes: notesWithoutId, doors } = dungeon

  // Assign a unique id to each rect
  const rectsWithId: (Rect & { id: number })[] = rects.map((r, id) => ({
    id,
    ...r,
  }))

  const isDoor = (rect: Rect) =>
    rect.h === 1 && rect.w === 1 && doors.some((door) => door.x === rect.x && door.y === rect.y)

  // Assign each door its corresponding rect id
  const doorsWithId = rectsWithId
    .filter((rect) => isDoor(rect))
    .map((rect) => ({
      id: rect.id,
      ...doors.find((door) => door.x === rect.x && door.y === rect.y),
    })) as (Door & { id: number; dir: Direction })[]

  const dungeonNotes: (JsonNote & { id: number })[] = notesWithoutId.map((note, id) => ({ ...note, id }))

  // Return the door at {x,y}
  const getDoor = doorFunc(doorsWithId)

  /* Assign each room (non-door) its corresponding unique rect id
   * and associated note, exits, column, water and description */
  const rooms = rectsWithId
    .filter((r) => !getDoor(r))
    .map((fullRoom) => {
      const door = getDoor(fullRoom)
      const notes = dungeonNotes.filter((note) => isInside(note.pos, fullRoom)).flatMap(parseNote)
      const columns = dungeon.columns.filter((column) => isInside(column, fullRoom))
      const water = dungeon.water.filter((column) => isInside(column, fullRoom))
      const exits: Exit[] = getAdjacent(fullRoom, rectsWithId).map((exit) => {
        const door = getDoor(exit)
        const direction = getDir(fullRoom, exit)
        if (door) {
          // If the exit is a door, include the "to"
          const destination = rectsWithId.find((x) => isAdjacent(x, exit) && x.id !== fullRoom.id)
          const to = destination?.id ?? "outside"
          const isFacing = facingDirection(door) === direction

          // If the door isFacing and it's of type double, then it might have an associated note.
          const note =
            isFacing && door.type === DoorType.double
              ? notes.filter(isDoorNote).find((doorNote) => doorNote.direction === direction)
              : undefined

          return {
            towards: direction,
            isFacing,
            to,
            type: door.type,
            door,
            ...(note && { note }),
            description: destination ? describeDoor(door, direction, destination) : "way out of the dungeon",
          } as Exit
        } else return { towards: direction, to: exit.id } as Exit
      })
      const description = describeRoom(fullRoom, exits, columns, water)
      const room: Room = {
        id: fullRoom.id,
        description,
        area: fullRoom.rotunda ? `${fullRoom.h}m across` : `${fullRoom.w}m x ${fullRoom.h}m`,
        exits,
        x: fullRoom.x,
        y: fullRoom.y,
        w: fullRoom.w,
        h: fullRoom.h,
        notes,
        ...(fullRoom.ending ? { ending: true } : {}),
        ...(door ? { door } : {}),
      }

      return room
    })

  return { ...dungeon, rooms, doors: doorsWithId, rects: rectsWithId }
}
