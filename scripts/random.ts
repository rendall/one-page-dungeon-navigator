/** This node app will run a random walk through a random dungeon */

import { Action, actions, DoorType, Dungeon, Exit, exitDirections } from "../lib/dungeon"
import { inspect } from "util"
import { readdir, readFile } from "fs"
import { extname, join as pathjoin } from "path"
import { parseDungeon } from "../lib/parseDungeon"
import { DoorState, game, GameOutput } from "../lib/gameLoop"

const jsonDirectory = "./static/dungeons"

/** The number of turns to run the app can be set as a parameter
 * e.g. to set the game to quit at turn #400 do:
 *  `node ./scripts/random.js 400` or
 *  `npm run random -- 400`
 *
 * If minTurns is 0, the loop will continue until the random walk
 * randomly chooses an exit out of the dungeon
 */
const minTurns = process.argv[2] ? parseInt(process.argv[2]) : 0
const jsonFile = process.argv[3]

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

const chooseFile = (jsonFiles: string[]) =>
  new Promise<string>((resolve, reject) => {
    const chosen = jsonFile ? jsonFiles.find(file => file.includes(jsonFile)) : undefined
    if (chosen) resolve(chosen)
    const index = Math.floor(Math.random() * jsonFiles.length)
    console.info(`Selected: ${jsonFiles[index]}`)
    resolve(jsonFiles[index])
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

const gameLoop = async (inputToGame: (input: Action) => GameOutput, action: Action = "init"): Promise<void> => {
  const out: GameOutput = inputToGame(action)
  console.info(out.message)

  if (!out.end) {
    console.info(`#${out.turn}: ${out.description}`)
    out.exits.forEach((exit) => console.info(exit.description))

    // If minTurns is defined then do not leave the dungeon before minTurns are up
    const doNotLeave = minTurns > 0 && out.turn < minTurns
    const exitActions = out.exits.reduce((all: Action[], e, i) => [...all, e.towards, `${i + 1}` as Action], [])
    const leaveActions = doNotLeave
      ? out.exits.reduce(
        (all: Action[], e, i) => (e.to === "outside" ? [...all, e.towards, `${i + 1}` as Action] : all),
        []
      )
      : []

    const possibleActions = exitActions.filter((action) => !leaveActions.includes(action)) as Action[]

    const isVisited =
      out.statuses?.includes("visited") &&
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", ...exitDirections].includes(out.action)

    const isQuit = minTurns > 0 && out.turn >= minTurns

    const fullSearchedMessage = /You find nothing( else)? of interest/.test(out.message)
    const doSearch = !fullSearchedMessage && !isVisited

    const appropriateDoor = (exit: (Exit & { door: DoorState }), out:GameOutput, action:Action) => {
      const door = exit.door
      const isOpen = door.statuses?.includes("open")
      if (isOpen) return false


      const isLocked = (door.type === DoorType.steel || door.type === DoorType.portcullis) && exit.isFacing

      if (isLocked) return false
      const isKeyhole = exit.description.includes("keyhole") && exit.isFacing
      if (isKeyhole && (action === out.action || out.action === "search") ) {
        return false
      }

      return true
    }

    const [unUsedExit, _] = possibleActions
      .filter(action => parseInt(action))
      .map<[Action, Exit]>(action => [action, out.exits[parseInt(action) - 1]])
      .find(([action, exit]) => appropriateDoor(exit, out, action)) ?? [undefined, undefined]

    const action = isQuit
      ? "quit"
      : doSearch
        ? "search"
        : unUsedExit ?? possibleActions[Math.floor(Math.random() * possibleActions.length)]
    console.info("> " + action)

    gameLoop(inputToGame, action)
  }
}

const printDungeon = (dungeon: Dungeon) => {
  // console.info(inspect(dungeon, { depth: 6, colors: true }))
  return game(dungeon)
}

const app = () =>
  readJsonFilesDirectory()
    .then(chooseFile)
    .then(loadJsonFile)
    .then((x) => parseDungeon(x))
    .then(printDungeon)
    .then(gameLoop)
    .catch((err) => {
      console.error(err)
    })

app()
