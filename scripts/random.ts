/** This node app will run a random walk through a random dungeon */

import { Dungeon, exitDirections } from "../lib/dungeon"
import { inspect } from "util"
import { readdir, readFile } from "fs"
import { extname, join as pathjoin } from "path"
import { parseDungeon } from "../lib/parseDungeon"
import { actions, game, GameOutput } from "../lib/gameLoop"

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
    console.log(`Selected: ${jsonFiles[index]}`)
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
  console.log(welcome.message)
  console.log(welcome.description)
  welcome.exits.forEach((exit) => console.log(exit.description))

  while (!out.end) {
    const possibleActions = [...exitDirections, ...actions].filter((action) => !["quit", "UNKNOWN"].includes(action))
    const action = possibleActions[Math.floor(Math.random() * possibleActions.length)]
    console.log(action)
    out = inputToGame(action)
    console.log(out.message)
    if (!out.end) {
      console.log(`#${out.turn}: ${out.description}`)
      out.exits.forEach((exit) => console.log(exit.description))
    }
  }
}

const printDungeon = (dungeon: Dungeon) => {
  console.log(inspect(dungeon, { depth: 6, colors: true }))
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
