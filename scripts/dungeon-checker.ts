/** combat-checker is an ad-hoc tool used to help balance combat. `npm run combat` or `npm run combat:watch` */
/* eslint-disable */
import { readdir, readFile } from "fs"
import { extname, join } from "path"
import { createMenaceManifest, getAdversaryAnalysis } from "../lib/agentKeeper.js"
import { parseDungeon } from "../lib/parseDungeon.js"
import { analyzeDungeon } from "../lib/parseDungeon.js"
import { printAnalysis } from "../lib/parseDungeon.js"
import { attackByFunc, GameState } from "../lib/gameLoop"
import { DoorType, Enemy, Exit } from "../lib/dungeon.js"
import { inspect } from "util"
// import { getRandomNumber } from "../lib/utilties.js"

const jsonFile = process.argv[2]

const directoryPath = "./static/dungeons/"

readdir(directoryPath, function (err, files) {
  if (err) {
    console.error("Error reading directory:", err)
    return
  }

  files
    .filter((file) => extname(file) === ".json")
    .filter((file) => (jsonFile ? file === jsonFile : true))
    .forEach((file, i, all) => {
      const filePath = join(directoryPath, file)

      readFile(filePath, "utf8", function (err, data) {
        if (err) {
          console.error("Error reading file:", err)
          return
        }
        const json = JSON.parse(data)
        const dungeon = parseDungeon(json)
        const { rooms } = dungeon

        rooms
          .flatMap((room) => room.exits)
          .forEach((exit) => {
            if (exit.to !== "outside" && rooms[exit.to] === undefined) {
              console.error(`room ${exit.to} does not exist in ${file}`)
              console.info(inspect(dungeon, { depth: 7, colors: true, compact: false }))
            }
          })

        if (i === all.length - 1) {
          console.info("done")
        }
      })
    })
})
