/** This is the game engine. The Dungeon object is immutable.
 * GameState holds all of the changes or status updates. On user
 * input, the GameState is merged or compared with data from
 * Dungeon data and used to determine the result of the player action. */
import { Action, Container, Door, Dungeon, Exit, ExitDirection, Note, NoteStatus, NoteType, Room, Secret } from "./dungeon"
import { exitDirections, DoorType, isAction } from "./dungeon"
import { compose, replace, unique } from "./utilties"
type GameState = {
  id: number
  action?: Action
  doors?: DoorState[]
  error?: string
  message: string
  rooms?: RoomState[]
  inventory?: string[]
  turn: number
  end: boolean
}

export type GameOutput = {
  action: Action // This is the last action of the user
  message: string
  room: number
  description: string
  exits: (Exit & { door: DoorState })[]
  end: boolean
  error?: string
  turn: number
  statuses?: RoomStatus[]
}

type DoorStatus = "unlocked" | "discovered" | "open"
type DoorState = Door & { id: number; statuses?: DoorStatus[] }

const roomStatuses = ["visited", "searched", "visited"] as const
type RoomStatus = (typeof roomStatuses)[number]

type RoomState = Partial<Room> & { id: number; statuses: RoomStatus[] }

const initState: GameState = {
  id: 0,
  message: "",
  turn: 0,
  end: false,
  rooms: [],
  doors: [],
}

type GameStateModifier = (gameState: GameState) => GameState

type GameStateEntry = [keyof GameState, GameState[keyof GameState]]

const clearProps: (keyof GameState)[] = ["error", "message", "end"]

/** Remove properties from GameState */
const resetState: GameStateModifier = (gameState: GameState): GameState =>
  Object.entries<GameState[keyof GameState]>(gameState)
    .filter((entry: GameStateEntry) => !clearProps.includes(entry[0]))
    .reduce<Partial<GameState>>(
      (gs: GameState, kv: GameStateEntry) => ({ ...gs, [kv[0]]: kv[1] } as GameState),
      {}
    ) as GameState

/** Add a message to GameState */
const addMessage =
  (message: string): GameStateModifier =>
    (gameState: GameState) => {
      const hasOldMessage = gameState.message && gameState.message.length > 0
      const newMessage = hasOldMessage ? `${gameState.message}\n${message}` : message
      return { ...gameState, message: newMessage }
    }

/** Insert or update a door in GameState */
const updateDoorState =
  (door: DoorState): GameStateModifier =>
    (gameState: GameState): GameState => {
      const amendDoors = gameState.doors?.filter((d) => d.id !== door.id) ?? []
      const doors = [...amendDoors, door]
      return { ...gameState, doors }
    }

const updateRoomState =
  (room: RoomState): GameStateModifier =>
    (gameState: GameState): GameState => {
      const amendRooms = gameState.rooms?.filter((d) => d.id !== room.id) ?? []
      const rooms = [...amendRooms, room]
      return { ...gameState, rooms }
    }

/** Add one or more statuses to a Room or Door
 *  @example addStatus(door, "unlocked", "open")
 */
const addStatus = <T extends { id: number; statuses?: string[] }>(statusObj: T, ...statuses: string[]): T => {
  if (statuses.length === 0) return statusObj
  const status = statuses[0]
  if (statusObj.statuses?.includes(status)) return addStatus(statusObj, ...statuses.slice(1))
  else return addStatus({ ...statusObj, statuses: [...(statusObj.statuses ?? []), status] }, ...statuses.slice(1))
}

const addStatusToRoom = (status: RoomStatus, roomId?: number) => (gameState: GameState) => {
  const id = roomId ?? gameState.id
  const room: RoomState = gameState.rooms?.find((room) => room.id === id) ?? { id, statuses: [] }
  const newState = compose(updateRoomState(addStatus(room, status)))(gameState)
  return newState
}

const addStatusToNote =
  (noteId: number, ...statuses: NoteStatus[]) =>
    (gameState: GameState) => {
      const id = gameState.id
      const room: RoomState = gameState.rooms?.find((room) => room.id === id)
      const note = room.notes.find((note) => note.id === noteId)
      const updatedNote = addStatus(note, ...statuses)
      const notes = replace(updatedNote, room.notes)
      const updatedRoom = { ...room, notes }
      const rooms = replace(updatedRoom, gameState.rooms)
      return { ...gameState, rooms }
    }

const addStatusToDoor = (door: DoorState, ...statuses: string[]) => updateDoorState(addStatus(door, ...statuses))

const addToInventory = (items: string[]) => (gameState: GameState) => {
  const inventory = unique([...(gameState.inventory ?? []), ...items]).sort()
  return { ...gameState, inventory }
}

const addInventoryMessage = () => (gameState: GameState) =>
  compose(addMessage(`You now have: ${gameState.inventory.join(", ")}`))(gameState)

/** Set current room id to id */
const moveTo =
  (id: number): GameStateModifier =>
    (gameState: GameState) => {
      return { ...gameState, id }
    }

/** handleSearch */
const handleSearch =
  (dungeon: Dungeon): GameStateModifier =>
    (gameState: GameState) => {
      const currentRoom = getCurrentRoom(dungeon, gameState)

      const unopenedContainer = currentRoom.notes?.find(
        (note) => note.type === NoteType.container && !note.statuses?.includes("searched")
      ) as Container

      if (unopenedContainer) {
        const newGameState = compose(
          addMessage(unopenedContainer.message),
          addStatusToNote(unopenedContainer.id, "searched"),
          addToInventory(unopenedContainer.items),
          addInventoryMessage()
        )(gameState)

        return newGameState
      }

      const undiscoveredSecret = currentRoom.notes?.find(
        (note) => note.type === NoteType.secret && !note.statuses?.includes("searched")
      ) as Secret

      if (undiscoveredSecret) {
        const newGameState = compose(
          addMessage(undiscoveredSecret.message),
          addStatusToNote(undiscoveredSecret.id, "searched"),
          addToInventory(undiscoveredSecret.items),
          addInventoryMessage()
        )(gameState)

        return newGameState
      }

      const undiscoveredSecretDoor = currentRoom.exits.find(
        (exit) =>
          exit.door.type === 6 &&
          !gameState.doors.find((door) => door.id === exit.door.id)?.statuses.includes("discovered")
      )

      if (undiscoveredSecretDoor) {
        const doors: DoorState[] = [...gameState.doors, { ...undiscoveredSecretDoor.door, statuses: ["discovered"] }]
        return {
          ...gameState,
          doors,
          message: `You discover a secret door to the ${undiscoveredSecretDoor.towards}!`,
        }
      } else {
        const hadInterest = currentRoom.notes?.length || currentRoom.exits.some(exit => exit.door.type === DoorType.secret)
        const newState = compose(
          addMessage(`You find nothing ${hadInterest? "else " : ""}of interest.`),
          addStatusToRoom("searched")
        )(gameState)
        return newState
      }
    }

const getCurrentRoom = (dungeon: Dungeon, gameState: GameState) => {
  const dungeonCurrentRoom = dungeon.rooms.find((room) => room.id === gameState.id)
  if (!dungeonCurrentRoom) throw new Error(`Bad data: room ${gameState.id} not found`)

  const stateCurrentRoom = gameState.rooms?.find((room) => room.id === gameState.id)

  const notes = stateCurrentRoom?.notes ?? dungeonCurrentRoom.notes

  const currentRoom = {
    ...dungeonCurrentRoom,
    notes,
    statuses: stateCurrentRoom?.statuses ?? [],
    description: dungeonCurrentRoom.description,
  }
  return currentRoom
}

/** handleExit handles status changes when the character exits a room */
const handleExit =
  (dungeon: Dungeon): GameStateModifier =>
    (gameState: GameState): GameState => {
      const currentRoom = getCurrentRoom(dungeon, gameState)
      const isVisible = isVisibleExitFunc(gameState)
      const isByDirection = exitDirections.includes(gameState.action as ExitDirection)
      const isByNumber = /^\d$/.test(gameState.action)
      const visibleExits = currentRoom.exits.filter(isVisible)
      const exit = isByDirection
        ? visibleExits.find((e) => e.towards === gameState.action)
        : isByNumber
          ? visibleExits.sort(sortExitsClockwise(currentRoom))[parseInt(gameState.action) - 1]
          : false
      if (!exit) return { ...gameState, message: "You cannot go that way" }
      if (exit.to === "outside") return { ...gameState, message: "You leave the dungeon", end: true }
      const dungeonDoor = (dungeon.doors as Door[]).find((door) => door.id === exit.door.id)
      const door: DoorState = {
        ...dungeonDoor,
        ...gameState.doors.find((door) => door.id === exit.door.id),
      }
      switch (door.type) {
        // portcullises can only be opened from one direction
        case DoorType.portcullis:
          const isUnlocked = door?.statuses?.find((s) => s === "unlocked")
          if (isUnlocked) return compose(addMessage(`You go ${exit.towards}`), moveTo(exit.to))(gameState)
          if (exit.isFacing) return { ...gameState, message: "The portcullis bars your way." }
          else {
            return compose(
              addStatusToDoor(door, "unlocked", "open"),
              addMessage(`You pull the lever. The portcullis opens. You go ${exit.towards}.`),
              moveTo(exit.to)
            )(gameState)
          }
        default:
          return compose(addStatusToDoor(door, "open"), addMessage(`You go ${exit.towards}`), moveTo(exit.to))(gameState)
      }
    }

const handleActionFunc =
  (dungeon: Dungeon): GameStateModifier =>
    (gameState: GameState): GameState => {
      if (gameState === undefined) throw Error("gameState is undefined in handleAction")
      switch (gameState.action) {
        case "east":
        case "west":
        case "north":
        case "south":
          return handleExit(dungeon)(gameState)
        case "search":
          return handleSearch(dungeon)(gameState)
        case "noop":
          return gameState
        case "quit":
          return { ...gameState, message: "You quit.", end: true }
        default:
          if (/\d/.test(gameState.action)) {
            return handleExit(dungeon)(gameState)
          } else return { ...gameState, message: "Not understood.", error: "syntax" }
      }
    }

const advanceTurn: GameStateModifier = (gameState: GameState) => ({ ...gameState, turn: gameState.turn + 1 })

export const describeNote = (note: Note) => {

  switch (note.type) {
    case "container":
      if (note.statuses?.includes("searched")) return (note as Container).empty
      else return (note as Container).pristine
    case "secret": return ""

    default:


      if (note.text.startsWith("The")) return note.text
      const deCap = (str: string) =>
        /(writing)/.test(str) ? `some ${str.slice(2)}` : `${str.charAt(0).toLowerCase() + str.slice(1)}`
      const hasVerb = (str: string) => (/(holds|hides)/.test(str) ? "" : /^\w*s\s/.test(str) ? "are " : "is ")
      const hereIs = (str: string) => `Here ${hasVerb(str)}${deCap(str)}`

      return hereIs(note.text)
  }
}

const describeNotes = (notes: Note[]): string => notes.reduce((description: string, note: Note) => `${description}${describeNote(note)}`, "")

const getExitDescription = (exit: Exit, i: number, all: Exit[]) => {
  const exitNumber = (doShow: boolean, index: number) => (doShow ? ` - ${index + 1}` : "")
  // areExitsSame is true if there are at least 2 exits toward the same direction,
  const areExitsSame = all.some((exit, i, all) =>
    [...all.slice(0, i), ...all.slice(i + 1)].find((e) => e.towards === exit.towards)
  )

  const isA = (exit: Exit) => {
    const door = exit.door as DoorState
    switch (door.type) {
      case DoorType.door:
      case DoorType.portcullis:
      case DoorType.secret:
      case DoorType.steel:
        return door.statuses?.includes("open") ? "is an open" : "is a"
      case DoorType.double:
        return door.statuses?.includes("open") ? "are open" : "are"
      default:
        return /(doors|stairs)/.test(exit.description) ? "are" : "is a"
    }
  }

  return `To the ${exit.towards} ${isA(exit)} ${exit.description}${exitNumber(areExitsSame, i)}`
}
const describeRoomFunc =
  (dungeon: Dungeon): GameStateModifier =>
    (gameState: GameState): GameState => {
      if (gameState === undefined) throw Error("gameState is undefined!")
      const currentRoom = getCurrentRoom(dungeon, gameState)
      const isVisible = isVisibleExitFunc(gameState)

      const exits = currentRoom.exits
        .filter(isVisible)
        .slice(0)
        .sort(sortExitsClockwise(currentRoom))
        .map((exit) => [exit, gameState.doors.find((door) => door.id === exit.door.id)?.statuses])
        .map(([exit, statuses]: [Exit, DoorStatus[]]) => ({
          ...exit,
          door: {
            ...exit.door,
            // update exit door with statuses if it exists
            ...(statuses && { statuses }),
          },
        }))
        .map((exit, i, all) => ({
          ...exit,
          description: getExitDescription(exit, i, all),
        }))

      const description = `You are in a ${currentRoom.area} ${currentRoom.description} ${describeNotes(currentRoom.notes)}`

      const room: RoomState = { ...currentRoom, exits, description }

      return updateRoomState(room)(gameState)
    }

/** inputFunc is a higher order function that accepts a Dungeon and
 * returns a function that accepts a GameState and returns a new
 * GameState.
 *
 * `message` should make no assumptions about how it will be presented.
 * Ideally, in future, all text descriptions will be constructed by the
 * client from output data.
 * @param dungeon
 * @returns (gameState) => gameState
 */
const inputFunc =
  (dungeon: Dungeon): GameStateModifier =>
    (oldGameState: GameState): GameState =>
      compose(
        resetState,
        handleActionFunc(dungeon),
        describeRoomFunc(dungeon),
        addStatusToRoom("visited"),
        advanceTurn
      )(oldGameState)

/** This gives an expected order to the exits when using numbers to specify them */
const sortExitsClockwise =
  (room: { x: number; y: number }) =>
    (aExit: Exit, bExit: Exit): 1 | 0 | -1 => {
      const a = aExit.door
      const b = bExit.door
      const [ax, ay] = [a.x - room.x, a.y - room.y]
      const [bx, by] = [b.x - room.x, b.y - room.y]
      const angleA = Math.atan2(ay, ax)
      const angleB = Math.atan2(by, bx)
      return angleA < angleB ? -1 : angleA > angleB ? 1 : 0
    }

const isVisibleExitFunc = (gameState: GameState) => (exit: Exit) => {
  switch (exit.type) {
    case 6:
      const exitDoor = gameState.doors.find((door) => door.id === exit.door.id)
      if (exitDoor && exitDoor.statuses.some((s) => s === "discovered")) return true
      return !exit.isFacing
    default:
      return true
  }
}

const toOutput = (gameState: GameState): GameOutput => {
  const room = gameState.rooms.find((room) => room.id === gameState.id)
  const output = {
    message: gameState.message,
    room: gameState.id,
    end: gameState.end,
    error: gameState.error,
    turn: gameState.turn,
    description: room.description,
    action: gameState.action,
    exits: room.exits,
    statuses: room.statuses,
  }
  return output
}

type GameInterface = (input: string) => GameOutput

/** `game` is a higher-order function that accepts a Dungeon and returns a GameInterface.
 * A GameInterface is a function that accepts user input and returns the result.
 * The result is structured in a way suitable for use in presentation, called GameOutput.
 * There should be no undiscovered secrets in GameOutput.
 *
 * @param dungeon:Dungeon
 * @returns gameInterface: (input:string) => GameOutput
 */
export const game = (dungeon: Dungeon): GameInterface => {
  // init game interface
  const interpretInput: GameStateModifier = inputFunc(dungeon)

  const initMessage: Partial<GameOutput> = {
    message: dungeon.title + "\n" + dungeon.story,
    action: "init",
  }

  let gameState: GameState = { ...initState, ...initMessage }

  const gameInterface = (action: Action | string) => {
    if (!isAction(action)) {
      throw new Error(`Unknown action ${action}`)
    }

    if (gameState.turn > 0) {
      gameState = interpretInput({ ...gameState, action })
      return toOutput(gameState)
    } else {
      if (action !== "init") throw new Error("The first call to the game must be 'init'")
      gameState = compose(describeRoomFunc(dungeon), addStatusToRoom("visited"), advanceTurn)(gameState)
      return toOutput(gameState)
    }
  }

  return gameInterface
}
