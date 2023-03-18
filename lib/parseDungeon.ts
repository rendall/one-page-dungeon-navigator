/** This file takes a One Page Dungeon json file and parses it for navigation.
 * This is the immutable, single source of truth for the adventure.
 */
import {
  Column,
  CuriousNote,
  Direction,
  Door,
  DoorType,
  Dungeon,
  Exit,
  ExitDirection,
  isDoorNote,
  isItemNote,
  JsonDungeon,
  JsonNote,
  Rect,
  Room,
  Water,
} from "./dungeon"
import { parseNote } from "./parseNote"
import {
  hasProperty,
  isArmor,
  isMagic,
  isWeapon,
  RandomNumberGenerator,
  sortById,
  sortExitsClockwise,
  toId,
} from "./utilties"

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
  const { rects, notes: notesWithoutId, doors, seed } = dungeon

  const rngSeed = seed ?? 42
  if (!RandomNumberGenerator.hasInstance()) RandomNumberGenerator.setSeed(rngSeed)

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
      const exits: Exit[] = getAdjacent(fullRoom, rectsWithId)
        .map((exit) => {
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
        .sort(sortExitsClockwise(fullRoom))
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

export type DungeonAnalysis = ReturnType<typeof analyzeDungeon>

/** These are expensive calculations that can be done once and passed around */
export const analyzeDungeon = (dungeon: Dungeon) => {
  const bossPatterns = [
    /[A-Za-z/s]+ of (?<boss>the [A-Za-z-]+ (?!Cross|Skull|Moon|Star|Eye|Arrow|Fish|Crown|Bat|Heart|Bird|Lily|Leaf|Palm|Claw|Seashell|Snail|Fist)[A-Za-z]+)$/,
    /[A-Za-z/s]+ of (?<boss>[A-Za-z-]+)$/,
  ]

  const deadBossPatterns = [
    /(?<boss>[\w\s]+) is long (dead|gone), but people are still (reluctant|afraid) to come close to the/,
    /(Since|After) the (demise|death|fall|defeat) of (?<boss>[\w\s]+) the [\w\s]+ has changed hands many times./,
    /Long after (?<boss>[\w\s]+)'s (demise|death|fall|defeat) the (?:[\w\s]+) remained/,
  ]

  const monsterPatterns = [/(?:Recently|Lately) (?<beast>an? [A-Za-z-\s]+) has made its (?:home|lair) here/]

  const animalPatterns = [
    /(?:(badly )?infested by|overrun with) (?<animal>(?!rabbit|sparrow|turtle|pig|pigeon|goat|chicken|cat)\w+)s/, // even giant versions of some of these animals will just never be scary
  ]

  const enemyPatterns = [
    /(?:Recently|Lately) a pack of (?<enemies>[\w\s-]+) have made its (?:home|lair) here/,
    /(?:Recently|Lately) a (?:gang|party|band) of (?<enemies>[\w]+) rediscovered/,
    /(?:Recently|Lately|Now) [\w\s]+ (squatted|controlled) by a (?:gang|party|band) of (?<enemies>[\w]+)/,
  ]

  const artifactPatterns = [/[\w\s]+that (?<artifact>[\w\s,-]+) is (?:still )?hidden here/]

  const { title, story } = dungeon

  const getBoss = (title: string): string | undefined =>
    bossPatterns
      .reduce((all, regex) => (all[0] ? all : regex.test(title) ? [title.match(regex)] : [undefined]), [undefined])
      .flatMap((o) => o?.groups?.boss)[0]
  const getDeadBoss = (title: string): string | undefined =>
    deadBossPatterns
      .reduce((all, regex) => (all[0] ? all : regex.test(title) ? [title.match(regex)] : [undefined]), [undefined])
      .flatMap((o) => o?.groups?.boss)[0]
  const getMonster = (story: string): string | undefined =>
    monsterPatterns
      .reduce((all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [undefined]), [undefined])
      .filter((o) => o !== undefined)
      .flatMap((o) => o.groups.beast)[0]
  const getEnemies = (story: string): string | undefined =>
    enemyPatterns
      .reduce((all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [undefined]), [undefined])
      .filter((o) => o !== undefined)
      .flatMap((o) => o.groups.enemies)[0]
  const getAnimal = (story: string): string | undefined =>
    animalPatterns
      .reduce((all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [undefined]), [undefined])
      .filter((o) => o !== undefined)
      .flatMap((o) => o.groups.animal)[0]
  const getArtifact = (story: string): string | undefined =>
    artifactPatterns
      .reduce((all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [undefined]), [undefined])
      .filter((o) => o !== undefined)
      .flatMap((o) => o.groups.artifact)[0]

  const isTreasure = (item: string) =>
    [
      "box",
      "bracelet",
      "brooch",
      "chain",
      "chess piece",
      "comb",
      "crown",
      "dice",
      "egg",
      "figurine",
      "gems",
      "idol",
      "mask",
      "medallion",
      "mirror",
      "necklace",
      "pin",
      "ring",
      "some gold",
      "statuette",
      "tiara",
    ].some((treasure) => item.match(new RegExp(`\\b${treasure}\\b`)))

  const notes = dungeon.rooms.filter((room) => room.notes).flatMap((room) => room.notes)
  const bossName = getBoss(title)
  const deadBoss = getDeadBoss(story)
  const monsterName = getMonster(story)
  const enemies = getEnemies(story)
  const animal = getAnimal(story)
  const artifact = getArtifact(story)
  const items = notes
    .filter(isItemNote)
    .filter((note) => note.items)
    .flatMap((note) => note.items)
    .sort()
  const effects = notes.filter((note) => note.type === "curious").map((note: CuriousNote) => note.action)
  const weapons = items.filter(isWeapon)
  const armor = items.filter(isArmor)
  const magic = items.filter(isMagic)
  const treasure = items.filter(isTreasure)
  const endingRoom = dungeon.rooms.find((room) => room.ending)
  const treasureRooms =
    dungeon.rooms.filter((room) =>
      room.notes
        .filter((note) => note)
        .flatMap((note) => note)
        .filter(isItemNote)
        .flatMap((note) => note.items)
        .filter((items) => items)
        .some((item) => isTreasure(item) || isMagic(item))
    ) ?? []
  /** Start with a room and include rooms that pass the predicate */
  const getConnectedRooms = (rooms: Room[], startRoom: Room, predicate: (exit: Exit) => boolean): Room[] => {
    const visited = new Set()
    const queue: Room[] = [startRoom]
    const connectedRooms = []

    while (queue.length) {
      const currentRoom = queue.shift()

      if (!currentRoom || !currentRoom?.exits) {
        console.error(JSON.stringify({ rooms, queue, currentRoom }, undefined, 2))
        throw new Error(`Bad room data`)
      }

      if (!visited.has(currentRoom)) {
        visited.add(currentRoom)
        connectedRooms.push(currentRoom)
        const neighboringRooms: Room[] = currentRoom.exits
          .filter(predicate)
          .map((exit) => rooms.find((room) => room.id === exit.to))
          .filter((x) => x)

        neighboringRooms.forEach((room) => {
          if (!visited.has(room)) {
            queue.push(room)
          }
        })
      }
    }

    return connectedRooms.sort(sortById)
  }

  const getUnlockedRooms = (rooms: Room[]): Room[] => {
    const keyholeRoom = rooms
      .filter((room) => room.notes)
      .find((room) => room.notes.some((note) => note.text.match(/keyhole/)))
    if (!keyholeRoom) return rooms

    const start: Room = rooms.find((room) => room.id === 0)

    const unlockedRooms = getConnectedRooms(
      rooms,
      start,
      (exit: Exit) =>
        exit.to !== "outside" &&
        !(
          (exit.type === DoorType.steel || exit.type === DoorType.portcullis || exit.type === DoorType.double) &&
          exit.isFacing
        )
    )

    return unlockedRooms
  }

  const getLockedRooms = (rooms: Room[], unlockedRooms: Room[]): Room[] =>
    rooms.filter((room) => unlockedRooms.every((unlocked) => unlocked.id !== room.id))

  /** All rooms not behind a secret door */
  const getNonSecretRooms = (rooms: Room[]): Room[] =>
    getConnectedRooms(
      rooms,
      rooms.find((room) => room.id === 0),
      (exit: Exit) => exit.type !== DoorType.secret
    )

  const unlockedRooms = getUnlockedRooms(dungeon.rooms)
  const lockedRooms = getLockedRooms(dungeon.rooms, unlockedRooms)
  const nonSecretRooms = getNonSecretRooms(dungeon.rooms)
  const secretRooms = dungeon.rooms.filter((room) => !nonSecretRooms.some((nonSecret) => nonSecret.id === room.id))
  const gateRoom = dungeon.rooms
    .filter((room) => room.notes)
    .find((room) => room.notes.some((note) => note.text.includes("keyhole") || note.text.match(/gate|door/)))

  const rooms = dungeon.rooms
  /** Very large rooms have 25 area or more */
  const veryLargeRooms = dungeon.rooms.filter((room) => !room.ending && room.w * room.h >= 25)
  /** Large rooms are between 9 and up to 25 area */
  const largeRooms = dungeon.rooms.filter((room) => room.w * room.h >= 9 && room.w * room.h < 25)
  /** Medium rooms are between 6 and up to 9 area */
  const mediumRooms = dungeon.rooms.filter((room) => room.w * room.h >= 6 && room.w * room.h < 9)
  /** Tiny rooms are under 6 area */
  const tinyRooms = dungeon.rooms.filter((room) => room.w * room.h < 6)
  /** Empty rooms have no notes associated */
  const emptyRooms = dungeon.rooms.filter((room) => !room.notes || room.notes.length === 0)
  /** Sorted by number of exits */
  const roomsSortedByNumberOfExits = dungeon.rooms
    .slice(0)
    .sort((a: Room, b: Room) => (b.exits.length > a.exits.length ? 1 : a.exits.length > b.exits.length ? -1 : 0))

  const roomsSortedByArea = dungeon.rooms
    .slice()
    .sort((a: Room, b: Room) => (b.w * b.h > a.w * a.h ? 1 : a.w * a.h > b.w * b.h ? -1 : 0))

  const justInsideId = gateRoom?.exits.find((exit) => exit.type === DoorType.double)?.to

  const justInsideRoom = justInsideId ? rooms.find((room) => room.id === justInsideId) : undefined

  const numKeys = items.reduce((count, item) => (item.endsWith("key") ? count + 1 : count), 0)

  const unlockedNonsecretTreasureRooms =
    treasureRooms.filter(
      (room) =>
        nonSecretRooms.some((nonsecret) => nonsecret.id === room.id) &&
        lockedRooms.every((locked) => locked.id !== room.id)
    ) ?? []
  const unlockedNonsecretRooms =
    dungeon.rooms.filter(
      (room) =>
        nonSecretRooms.some((nonsecret) => nonsecret.id === room.id) &&
        lockedRooms.every((locked) => locked.id !== room.id)
    ) ?? []

  return {
    title,
    story,
    bossName,
    deadBoss,
    monsterName,
    enemies,
    animal,
    artifact,
    items,
    effects,
    weapons,
    armor,
    treasure,
    magic,
    veryLargeRooms,
    largeRooms,
    mediumRooms,
    tinyRooms,
    emptyRooms,
    lockedRooms,
    unlockedRooms,
    secretRooms,
    nonSecretRooms,
    gateRoom,
    justInsideRoom,
    endingRoom,
    treasureRooms,
    unlockedNonsecretRooms,
    unlockedNonsecretTreasureRooms,
    rooms,
    roomsSortedByArea,
    roomsSortedByNumberOfExits,
    numKeys,
    isMagic,
    isWeapon,
    isTreasure,
    isArmor,
  }
}

/** Debug printing of dungeon analysis */
export const printAnalysis = (dungeonAnalysis: DungeonAnalysis) => {
  // Show only room ids

  const anyalysisToIds = Object.entries(dungeonAnalysis)
    .map(([key, value]) =>
      Array.isArray(value)
        ? [key, value.map(toId)]
        : [key, value && hasProperty(value, "id") ? (value as Room).id : value]
    )
    .reduce((obj, [key, value]: [string, string | (string | number | Room)[]]) => ({ ...obj, [key]: value }), {})

  console.info(anyalysisToIds)
}
