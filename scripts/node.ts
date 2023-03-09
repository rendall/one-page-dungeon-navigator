import { actions, Dungeon, exitDirections, isAction } from "../lib/dungeon"
import { inspect } from "util"
import { readdir, readFile } from "fs"
import { extname, join as pathjoin } from "path"
import { createInterface, Interface } from "readline"
import { parseDungeon } from "../lib/parseDungeon"
import { game, GameOutput } from "../lib/gameLoop"

const jsonDirectory = "./static/dungeons"

const readJsonFilesDirectory = () =>
  new Promise<string[]>((resolve, reject) =>
    readdir(jsonDirectory, (err, files) => {
      if (err) {
        reject(`Error reading directory: ${err}`)
      } else {
        const jsonFiles = files.filter((file) => extname(file) === ".json")
        resolve(jsonFiles)
      }
    })
  )

const promptUser = (jsonFiles: string[]) =>
  new Promise<string>((resolve, reject) => {
    console.log("Choose a JSON file to load:")
    jsonFiles.forEach((file, index) => console.log(`${index + 1}. ${file}`))

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question("Enter the index number of the file you want to load: ", (answer) => {
      rl.close()
      const index = parseInt(answer) - 1
      if (isNaN(index) || index < 0 || index >= jsonFiles.length) {
        reject("Invalid selection")
      } else {
        resolve(jsonFiles[index])
      }
    })
  })

const loadJsonFile = (fileName: string) =>
  new Promise<Dungeon>((resolve, reject) => {
    const filePath = pathjoin(jsonDirectory, fileName)
    readFile(filePath, (err, data) => {
      if (err) {
        reject(`Error reading file: ${err}`)
      } else {
        try {
          const jsonData = JSON.parse(data.toString()) as Dungeon
          resolve(jsonData)
        } catch (e) {
          reject(`Error parsing JSON: ${e}`)
        }
      }
    })
  })

const questionFunc = (rl: Interface) => (prompt: string) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

const gameLoop = async (dungeon: Dungeon): Promise<void> => {
  const inputToGame = game(dungeon)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const prompt = questionFunc(rl)

  let out: GameOutput = {
    action: "init",
    message: "",
    room: 0,
    description: "",
    exits: [],
    end: false,
    turn: 0,
  }

  const welcome: GameOutput = inputToGame("init")
  console.log(welcome.message)
  console.log(welcome.description)
  welcome.exits.forEach((exit) => console.log(exit.description))

  while (!out.end) {
    const input = (await prompt("> ")) as string

    if (!isAction(input)) {
      const possibleActions = [...exitDirections, ...actions].filter(
        (action) => !["noop", "init", "UNKNOWN", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(action)
      )
      console.log(`Unknown command ${input}. The following commands are possible: ${possibleActions.join(", ")}`)
      continue
    }

    out = inputToGame(input)
    console.log(out.message)
    if (!out.end) {
      console.log(out.description)
      out.exits.forEach((exit) => console.log(exit.description))
    }
  }

  rl.close()
}

const printDungeon = (dungeon: Dungeon) => {
  console.log(inspect(dungeon, { depth: 6, colors: true }))
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
      console.error(err)
    })

app()
