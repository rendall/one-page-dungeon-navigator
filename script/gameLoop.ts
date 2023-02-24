import type { Dungeon, Exit, ExitDirection, Room } from "./dungeon";

type Action = ExitDirection | "quit" | "unknown" | "search";

type GameState = {
  id: number;
  action?: Action;
  error?: string;
  message: string;
  turn: number;
  end: boolean;
  discovered: { id: number, towards: ExitDirection }[]
}

const initState: GameState = {
  id: 0,
  turn: 0,
  message: "",
  end: false,
  discovered: []
}

const inputFunc = (dungeon: Dungeon) => (oldGameState: GameState): GameState => {
  const gameState: GameState = { ...oldGameState, error: undefined }

  const currentRoom = dungeon.rooms?.find(room => room.id === gameState.id)!

  switch (gameState.action) {
    case "east":
    case "west":
    case "north":
    case "south":
      const isVisible = isVisibleExitFunc(gameState)
      const exit = currentRoom.exits.filter(isVisible).find(e => e.towards === gameState.action)
      if (!exit) return { ...gameState, message: "You cannot go that way" }
      if (exit.to === "outside") return { ...gameState, message: "You leave the dungeon", end: true }
      return { ...gameState, id: exit.to, message: `You go ${gameState.action}` }
    case "search": {
      const secret = currentRoom.exits.find(e => e.description === 'secret door')
      if (secret) {
        const discovered = [...gameState.discovered, { id: currentRoom.id, towards: secret.towards }]
        return { ...gameState, discovered, message: `You discover a secret door to the ${secret.towards}!` }
      }
      else return { ...gameState, message: "You find nothing of interest." }
    }
    case "quit":
      return { ...gameState, message: "You quit.", end: true }
    default:
      return { ...gameState, message: "Not understood.", error: "syntax" }
  }
}

const isVisibleExitFunc = (gameState: GameState) => (exit: Exit) => {
  if (exit.type !== 6 || !exit.isFacing) return true
  const roomDiscovered = gameState.discovered.filter(d => d.id === gameState.id)
  return roomDiscovered.some(d => d.towards === exit.towards)
}

const parseInput = (input: string): Action => {
  switch (input) {
    case "e": return "east"
    case "w": return "west"
    case "n": return "north"
    case "s": return "south"
    case "q": return "quit"
    case "x": return "search"
    default: return "unknown"
  }
}

export type StructuredOut = {
  message: string;
  room:number;
  description:string;
  exits:Exit[];
  end:boolean;
  error?: string;
}

const getCurrentRoomFunc = (dungeon: Dungeon) => (id:number):Room => {
  const room = dungeon.rooms?.find( room => room.id === id)
  if (!room) throw Error(`Bad data: room ${id} not found`)
  return room
}

const describeRoomFunc = (getCurrentRoom:(id:number) => Room) => (gameState:GameState):{description:string, exits:Exit[]} => {
  const room = getCurrentRoom(gameState.id)
  const isVisible = isVisibleExitFunc(gameState)
  const exits = room.exits.filter(isVisible)
  const exitsDescription = exits.reduce((description, exit) => description + `To the ${exit.towards} is a ${exit.description}` + "\n", "")
  const description = `A ${room.area} ${room.description}` + "\n" +`${room.contains ?? ''} ` + "\n" + exitsDescription
  return { description, exits }
}

type GameInterface = (input:string) => StructuredOut

export const game = (dungeon: Dungeon):GameInterface => {
  const interpretInput = inputFunc(dungeon)
  let gameState = initState
  const getCurrentRoom = getCurrentRoomFunc(dungeon)
  const describeRoom = describeRoomFunc(getCurrentRoom)


  const initMessage:StructuredOut = {
    message: dungeon.title + "\n" + dungeon.story,
    room: gameState.id,
    ...describeRoom(gameState),
    end: false
  }

  const gameInterface = (input: string) => {
    if (gameState.turn > 0) {
      const action = parseInput(input)
      gameState = interpretInput({ ...gameState, action, turn: gameState.turn + 1 })
      return { message: gameState.message, room: gameState.id, ...describeRoom(gameState), end: gameState.end, error: gameState.error }
    }
    else {
      if (input !== "INIT") throw new Error("The first call to the game must be 'INIT")
      gameState = {...gameState, turn:1}
      return initMessage
    }
  }

  return gameInterface
}
