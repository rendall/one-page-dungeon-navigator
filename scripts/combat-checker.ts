/** combat-checker is an ad-hoc tool used to help balance combat. `npm run combat` or `npm run combat:watch` */
/* eslint-disable */
import { readdir, readFile } from "fs"
import { extname, join } from "path"
// import { inspect } from "util"
import { createMenaceManifest } from "../lib/agentKeeper.js"
import { parseDungeon } from "../lib/parseDungeon.js"
import { analyzeDungeon } from "../lib/parseDungeon.js"
// import { printAnalysis } from "../lib/parseDungeon.js"
import { attackByFunc, GameState } from "../lib/gameLoop"
import { Enemy } from "../lib/dungeon.js"
// import { getRandomNumber } from "../lib/utilties.js"

const jsonFile = process.argv[2]

const directoryPath = "./static/dungeons/"
let wins = 0
let defeats = 0
let winAgainstBoss = 0
let defeatByBoss = 0

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
        const analysis = analyzeDungeon(dungeon)

        // const adversaryAnalysis = getAdversaryAnalysis(analysis)
        const { player, agents } = createMenaceManifest(analysis)

        // printAnalysis({ ...analysis, ...adversaryAnalysis })
        // console.info(inspect(agents, { depth: 6, colors: true }))
        console.info("\n\n" + analysis.title)

        let gameState: GameState = {
          id: 0,
          doors: [],
          message: "",
          player,
          agents: [],
          turn: 0,
          end: false,
          inventory: analysis.items,
        }

        let attackBy = attackByFunc(gameState)

        agents.reverse().reduce((player, enemy, i) => {
          if (player.health < 0) return player

          let playerLoss = 0
          let enemyLoss = 0

          while (player.health > playerLoss && enemy.health > enemyLoss) {
            const enemyAttackResult = attackBy(enemy, player)
            const { loss: enemyAttack } = enemyAttackResult
            playerLoss += enemyAttack

            const playerAttackResult = attackBy(player, enemy)
            const { loss: playerAttack } = playerAttackResult
            enemyLoss += playerAttack
          }

          if (player.health - playerLoss < 0) {
            defeats++
            console.info(`Player defeated by ${enemy.name}`)
            if ((enemy as Enemy).class === "boss") defeatByBoss++
          } else {
            if (agents.length === i + 1) {
              console.info(`Player defeats ${enemy.name}`)
              wins++
            } // take enemy's inventory
            const newInventory = [...(gameState.inventory ?? []), ...enemy.inventory]
            gameState = { ...gameState, inventory: newInventory }
            attackBy = attackByFunc(gameState)
            if ((enemy as Enemy).class === "boss") winAgainstBoss++
          }

          return { ...player, health: player.health - playerLoss }
        }, player)
        // if there is a Boss, it is in the ending room
        // if there is an Artifact, it is in the ending room

        // if a boss is needed, and the boss is dead, the boss will be a ghost or undead

        // if there is a monster and no boss, the monster is in the ending room
        // if there is a monster and a boss,
        //    if there is a keyhole room
        //        and the keyhole room is not the first room, the monster is in the keyhole room
        //    if there is no keyhole room or the keyhole room is the first room, the monster is in a random room in the middle
        //
        if (i === all.length - 1) {
          console.info({ wins, defeats, winAgainstBoss, defeatByBoss })
          console.info("done")
        }
      })
    })
})
