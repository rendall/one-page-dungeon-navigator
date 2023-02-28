/** This is the game engine. The Dungeon object is immutable.
 * GameState holds all of the changes or status updates. On user
 * input, the GameState is merged or compared with data from
 * Dungeon data and used to determine the result of the player action. */
import { Door, DoorType, Dungeon, Exit, ExitDirection, Room } from "./dungeon"

type GameState = {
  id: number
  action?: Action
  error?: string
  message: string
  turn: number
  end: boolean
  doors: DoorState[]
}

type Action =
  | ExitDirection
  | "quit"
  | "unknown"
  | "search"
  | "init"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"

export type GameOutput = {
  action: Action // This is the last action of the user
  message: string
  room: number
  description: string
  exits: Exit[]
  end: boolean
  error?: string
}

type DoorStatus = "unlocked" | "discovered"
type DoorState = Door & { status?: DoorStatus[] }

const initState: GameState = {
  id: 0,
  message: "",
  turn: 0,
  end: false,
  doors: [],
}

const handleExit = (exit: Exit, dungeon: Dungeon, gameState: GameState): GameState => {
  if (!exit) return { ...gameState, message: "You cannot go that way" }
  if (exit.to === "outside") return { ...gameState, message: "You leave the dungeon", end: true }
  // portcullises can only be opened from one direction
  if (exit.door.type === DoorType.portcullis) {
    const exitDoor = gameState.doors?.find((door) => door.id === exit.door.id)
    const isOpen = exitDoor?.status?.find((s) => s === "unlocked")
    if (exit.isFacing) {
      if (!isOpen) return { ...gameState, message: "The portcullis bars your way." }
    } else {
      if (!isOpen) {
        const exitDoor = dungeon.doors.find((door) => door.id === exit.door.id)
        const openDoor: DoorState = { ...exitDoor, status: ["unlocked"] }
        const newGameState = {
          ...gameState,
          doors: [...gameState.doors, openDoor],
          message: `You pull the lever. The portcullis opens. You go ${exit.towards}.`,
          id: exit.to,
        }
        return newGameState
      }
    }
  }
  return { ...gameState, id: exit.to, message: `You go ${exit.towards}.` }
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
  (dungeon: Dungeon) =>
  (oldGameState: GameState): GameState => {
    const gameState: GameState = {
      ...oldGameState,
      error: undefined,
      end: undefined,
    }
    const currentRoom = dungeon.rooms?.find((room) => room.id === gameState.id)!
    const isVisible = isVisibleExitFunc(gameState)

    switch (gameState.action) {
      case "east":
      case "west":
      case "north":
      case "south":
        const exit = currentRoom.exits.filter(isVisible).find((e) => e.towards === gameState.action)
        return handleExit(exit, dungeon, gameState)
      case "search": {
        const secret = currentRoom.exits.find((e) => e.door.type === 6)
        if (secret) {
          const doors: DoorState[] = [...gameState.doors, { ...secret.door, status: ["discovered"] }]
          return {
            ...gameState,
            doors,
            message: `You discover a secret door to the ${secret.towards}!`,
          }
        } else return { ...gameState, message: "You find nothing of interest." }
      }
      case "quit":
        return { ...gameState, message: "You quit.", end: true }
      default:
        if (/\d/.test(gameState.action)) {
          const exit = currentRoom.exits
            .filter(isVisible)
            .slice(0)
            .sort((a, b) => b.door.id - a.door.id)[parseInt(gameState.action) - 1]
          return handleExit(exit, dungeon, gameState)
        } else return { ...gameState, message: "Not understood.", error: "syntax" }
    }
  }

const isVisibleExitFunc = (gameState: GameState) => (exit: Exit) => {
  switch (exit.type) {
    case 6:
      const exitDoor = gameState.doors.find((door) => door.id === exit.door.id)
      if (exitDoor && exitDoor.status.some((s) => s === "discovered")) return true
      return !exit.isFacing
    default:
      return true
  }
}

const parseInput = (input: string): Action => {
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

const getCurrentRoomFunc =
  (dungeon: Dungeon) =>
  (id: number): Room => {
    const room = dungeon.rooms?.find((room) => room.id === id)
    if (!room) throw Error(`Bad data: room ${id} not found`)
    return room
  }

const describeRoomFunc =
  (getCurrentRoom: (id: number) => Room) =>
  (gameState: GameState): { description: string; exits: Exit[] } => {
    const room = getCurrentRoom(gameState.id)
    const isVisible = isVisibleExitFunc(gameState)
    const exits = room.exits
      .filter(isVisible)
      .slice(0)
      .sort((a, b) => b.door.id - a.door.id)
    // areExitsSame is true if there are 2 or more exits with the same direction
    const areExitsSame = exits.some((exit, i, all) =>
      [...all.slice(0, i), ...all.slice(i + 1)].find((e) => e.towards === exit.towards)
    )
    const exitNumber = (doShow: boolean, index: number) => (doShow ? ` #(${index + 1})` : "")
    const exitsDescription = exits.reduce(
      (description, exit, i) =>
        description + `To the ${exit.towards} is a ${exit.description}${exitNumber(areExitsSame, i)}` + "\n",
      ""
    )
    const description =
      `You are in a ${room.area} ${room.description}` + "\n" + `${room.contains ?? ""} ` + "\n" + exitsDescription
    return { description, exits }
  }

type GameInterface = (input: string) => GameOutput

/** `game` is a higher-order function that accepts a Dungeon and
 * returns a GameInterface. GameInterface is responsible for
 * accepting raw user input and returning GameOutput. It does
 * this by parsing user input into an Action, which is sent to
 * the game engine as part of the current GameStage, and then
 * mapping the resulting GameState state into a GameOutput.
 */
export const game = (dungeon: Dungeon): GameInterface => {
  // init game interface
  const interpretInput = inputFunc(dungeon)
  let gameState = initState
  const getCurrentRoom = getCurrentRoomFunc(dungeon)
  const describeRoom = describeRoomFunc(getCurrentRoom)

  const initMessage: GameOutput = {
    message: dungeon.title + "\n" + dungeon.story,
    room: gameState.id,
    ...describeRoom(gameState),
    action: "init",
    end: false,
  }

  const gameInterface = (input: string) => {
    if (gameState.turn > 0) {
      const action = parseInput(input)
      gameState = interpretInput({
        ...gameState,
        action,
        turn: gameState.turn + 1,
      })
      return {
        message: gameState.message,
        room: gameState.id,
        ...describeRoom(gameState),
        end: gameState.end,
        error: gameState.error,
        action,
      }
    } else {
      if (input !== "INIT") throw new Error("The first call to the game must be 'INIT")
      gameState = { ...gameState, turn: 1 }
      return initMessage
    }
  }

  return gameInterface
}
