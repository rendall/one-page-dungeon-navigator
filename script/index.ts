import type { Dungeon, Exit, ExitDirection, Room } from "./dungeon";
import { inspect } from "util";
import { readdir, readFile } from "fs";
import { extname, join as pathjoin } from "path";
import { createInterface, Interface } from "readline";
import { parseDungeon } from "./parseDungeon";

const jsonDirectory = "./dungeons";

const readJsonFilesDirectory = () =>
  new Promise<string[]>((resolve, reject) =>
    readdir(jsonDirectory, (err, files) => {
      if (err) {
        reject(`Error reading directory: ${err}`);
      } else {
        const jsonFiles = files.filter((file) => extname(file) === ".json");
        resolve(jsonFiles);
      }
    })
  );

const promptUser = (jsonFiles: string[]) =>
  new Promise<string>((resolve, reject) => {
    console.log("Choose a JSON file to load:");
    jsonFiles.forEach((file, index) => console.log(`${index + 1}. ${file}`));

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Enter the index number of the file you want to load: ",
      (answer) => {
        rl.close();
        const index = parseInt(answer) - 1;
        if (isNaN(index) || index < 0 || index >= jsonFiles.length) {
          reject("Invalid selection");
        } else {
          resolve(jsonFiles[index]);
        }
      }
    );
  });

const loadJsonFile = (fileName: string) =>
  new Promise<Dungeon>((resolve, reject) => {
    const filePath = pathjoin(jsonDirectory, fileName);
    readFile(filePath, (err, data) => {
      if (err) {
        reject(`Error reading file: ${err}`);
      } else {
        try {
          const jsonData = JSON.parse(data.toString()) as Dungeon;
          resolve(jsonData);
        } catch (e) {
          reject(`Error parsing JSON: ${e}`);
        }
      }
    });
  });

type Action = ExitDirection | "quit" | "unknown" | "search";

type GameState = {
  id: number;
  action?: Action;
  message: string;
  turn: number;
  end: boolean;
  discovered: { id:number, towards: ExitDirection}[]
}

const initState: GameState = {
  id: 0,
  turn: 0,
  message: "",
  end: false,
  discovered: []
}

const questionFunc = (rl: Interface) => (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const inputFunc = (dungeon: Dungeon) => (gameState: GameState): GameState => {
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
      else return { ...gameState, message: "You find nothing of interest."}
    }
    case "quit":
      return { ...gameState, message: "You quit.", end: true }
    default:
      return { ...gameState, message: "Not understood. e, w, n, or s to move in a direction, and q to quit" }
  }
}

const isVisibleExitFunc = (gameState: GameState) => (exit:Exit) => {
  if (exit.type !== 6 || !exit.isFacing) return true
  const roomDiscovered = gameState.discovered.filter( d => d.id === gameState.id)
  return roomDiscovered.some( d => d.towards === exit.towards)
}

const describe = (room: Room, gameState: GameState) => {
  const isVisible = isVisibleExitFunc(gameState)
  const exitsDescription = room.exits.filter(isVisible).reduce((description, exit) => description + `To the ${exit.towards} is a ${exit.description}` + "\n", "")
  return `A ${room.area} ${room.description} ${room.contains ?? ''} ` + "\n" + exitsDescription
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

const gameLoop = async (dungeon: Dungeon, gameState: GameState = initState): Promise<void> => {
  const interpretInput = inputFunc(dungeon)
  const message = gameState.turn === 0 ? dungeon.title + "\n" + dungeon.story : gameState.message

  if (message) console.log("\n" + message + "\n")

  if (gameState.end) return

  const currentRoom = dungeon.rooms?.find(room => room.id === gameState.id)
  if (!currentRoom) throw Error(`Bad data: room ${gameState.id} does not exist`)
  const description = describe(currentRoom, gameState)

  console.log(description)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = questionFunc(rl)
  const input = await prompt('> ') as string
  rl.close()

  const action = parseInput(input)
  const newState = interpretInput({ ...gameState, action, turn: gameState.turn + 1 })
  gameLoop(dungeon, newState)
}

const printDungeon = (dungeon: Dungeon) => {
  console.log(
    inspect(
      dungeon,
      { depth: 5, colors: true }
    )
  )
  return dungeon

}

const app = () =>
  readJsonFilesDirectory()
    .then(promptUser)
    .then(loadJsonFile)
    .then((x) => parseDungeon(x))
    .then(printDungeon)
    .then(gameLoop)
    .catch((err) => {
      console.error(err);
    });

app();


