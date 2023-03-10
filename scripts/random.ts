/** This node app will run a random walk through a random dungeon */

import { actions, Dungeon, exitDirections } from "../lib/dungeon"
import { inspect } from "util"
import { readdir, readFile } from "fs"
import { extname, join as pathjoin } from "path"
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

const chooseRandom = (jsonFiles: string[]) =>
  new Promise<string>((resolve, reject) => {
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

const gameLoop = async (dungeon: Dungeon): Promise<void> => {
  const inputToGame = game(dungeon)

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
  console.info(welcome.message)
  console.info(welcome.description)
  welcome.exits.forEach((exit) => console.info(exit.description))

  while (!out.end) {
    const possibleActions = [...exitDirections, ...actions].filter((action) => !["quit", "UNKNOWN"].includes(action))
    const action = possibleActions[Math.floor(Math.random() * possibleActions.length)]
    console.info(action)
    out = inputToGame(action)
    console.info(out.message)
    if (!out.end) {
      console.info(`#${out.turn}: ${out.description}`)
      out.exits.forEach((exit) => console.info(exit.description))
    }
  }
}

const printDungeon = (dungeon: Dungeon) => {
  console.info(inspect(dungeon, { depth: 6, colors: true }))
  return dungeon
}

const app = () =>
  readJsonFilesDirectory()
    .then(chooseRandom)
    .then(loadJsonFile)
    .then((x) => parseDungeon(x))
    .then(printDungeon)
    .then(gameLoop)
    .catch((err) => {
      console.error(err)
    })

app()
