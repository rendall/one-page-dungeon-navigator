/** This is the game engine. The Dungeon object is immutable.
 * GameState holds all of the changes or status updates. On user
 * input, the GameState is merged or compared with data from
 * Dungeon data and used to determine the result of the player action. */
import type { Door, Dungeon, Exit, ExitDirection, Room } from "./dungeon"
import { exitDirections, DoorType } from "./dungeon"

type GameState = {
  id: number
  action?: Action
  error?: string
  message: string
  turn: number
  end: boolean
  doors: DoorState[]
}

export const actions = ["quit", "noop", "search", "init", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const

export type Action = (typeof actions)[number] | ExitDirection

export const isAction = (x: string | Action): x is Action => [...actions, ...exitDirections].some((elem) => elem === x)

export type GameOutput = {
  action: Action // This is the last action of the user
  message: string
  room: number
  description: string
  exits: Exit[]
  end: boolean
  error?: string
  turn: number
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
          const secret = currentRoom.exits.find(
            (exit) =>
              exit.door.type === 6 &&
              !gameState.doors.find((door) => door.id === exit.door.id)?.status.includes("discovered")
          )
          if (secret) {
            const doors: DoorState[] = [...gameState.doors, { ...secret.door, status: ["discovered"] }]
            return {
              ...gameState,
              doors,
              message: `You discover a secret door to the ${secret.towards}!`,
            }
          } else return { ...gameState, message: currentRoom.contains ? "You find nothing else of interest" : "You find nothing of interest." }
        }
        case "noop":
          return gameState
        case "quit":
          return { ...gameState, message: "You quit.", end: true }
        default:
          if (/\d/.test(gameState.action)) {
            const exit = currentRoom.exits.filter(isVisible).slice(0).sort(sortExitsClockwise(currentRoom))[
              parseInt(gameState.action) - 1
            ]
            return handleExit(exit, dungeon, gameState)
          } else return { ...gameState, message: "Not understood.", error: "syntax" }
      }
    }

/** This gives an expected order to the exits when using numbers to specify them */
const sortExitsClockwise =
  (room: Room) =>
    (aExit: Exit, bExit: Exit): 1 | 0 | -1 => {
      const a = aExit.door
      const b = bExit.door
      const [ax, ay] = [a.x - room.x, a.y - room.y]
      const [bx, by] = [b.x - room.x, b.y - room.y]
      const angleA = Math.atan2(ay, ax)
      const angleB = Math.atan2(by, bx)
      if (angleA < angleB) {
        return -1
      } else if (angleA > angleB) {
        return 1
      } else {
        return 0
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
      const areExitsSame = room.exits.some((exit, i, all) =>
        [...all.slice(0, i), ...all.slice(i + 1)].find((e) => e.towards === exit.towards)
      )

      const isA = (str: string) => (/(doors|stairs)/.test(str) ? "are" : "is a")
      const deCap = (str: string) =>
        /(writing)/.test(str) ? `some ${str.slice(2)}` : `${str.charAt(0).toLowerCase() + str.slice(1)}`
      const hasVerb = (str: string) => (/(holds|hides)/.test(str) ? "" : /^\w*s\s/.test(str) ? "are " : "is ")
      const hereIs = (str: string) => `Here ${hasVerb(str)}${deCap(str)}`

      const exitNumber = (doShow: boolean, index: number) => (doShow ? ` - ${index + 1}` : "")
      const exits = room.exits
        .filter(isVisible)
        .slice(0)
        .sort(sortExitsClockwise(room))
        .map((exit, i) => ({
          ...exit,
          description: `To the ${exit.towards} ${isA(exit.description)} ${exit.description}${exitNumber(
            areExitsSame,
            i
          )}`,
        }))

      // areExitsSame is true if there are 2 or more exits with the same direction
      const description = `You are in a ${room.area} ${room.description} ${room.contains ? hereIs(room.contains) : ""} `
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
    turn: 0,
  }

  const gameInterface = (action: Action | string) => {
    if (!isAction(action)) {
      throw new Error(`Unknown action ${action}`)
    }

    if (gameState.turn > 0) {
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
        turn: gameState.turn,
      }
    } else {
      if (action !== "init") throw new Error("The first call to the game must be 'init'")
      gameState = { ...gameState, turn: 1 }
      return initMessage
    }
  }

  return gameInterface
}
