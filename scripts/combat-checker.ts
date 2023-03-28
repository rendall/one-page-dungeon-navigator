/** combat-checker is an ad-hoc tool used to help balance combat. `npm run combat` or `npm run combat:watch`
 * As an ad-hoc tool, comment out or write code without respect to linting or formatting rules.
 */
/* eslint-disable */
import { readdir, readFile } from "fs"
import { extname, join } from "path"
// import { inspect } from "util"
import { createMenaceManifest, getAdversaryAnalysis } from "../lib/agentKeeper.js"
import { parseDungeon } from "../lib/parseDungeon.js"
import { analyzeDungeon } from "../lib/parseDungeon.js"
import { printAnalysis } from "../lib/parseDungeon.js"
import { handleAttack, enemiesAttack, GameState } from "../lib/gameLoop"
import { Action, DoorType, Enemy, Exit, isEnemy, isItemNote } from "../lib/dungeon.js"
import { inspect } from "util"
// import { getRandomNumber } from "../lib/utilties.js"

const jsonFile = process.argv[2]

let dungeonWinMap: { [file: string]: number } = {}

const directoryPath = "./static/dungeons/"
let fileCount = 0
let runs = 0
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
      fileCount = all.length

      const filePath = join(directoryPath, file)

      readFile(filePath, "utf8", function (err, data) {
        if (err) {
          console.error("Error reading file:", err)
          return
        }

        // get per dungeon counts
        let totalBossCount = 0
        let totalEliteCount = 0
        let totalMonsterCount = 0
        let totalPeonCount = 0

        const dungeonRunCount = 10
        // run each dungeon `i` times:

        const json = JSON.parse(data)
        const dungeon = parseDungeon(json)
        const analysis = analyzeDungeon(dungeon)

        for (let i = 0; i < dungeonRunCount; i++) {
          const {
            boss: bossCount,
            elite: eliteCount,
            monster: monsterCount,
            peon: peonCount,
          } = getAdversaryAnalysis(analysis)
          totalBossCount += bossCount
          totalEliteCount += eliteCount
          totalMonsterCount += monsterCount
          totalPeonCount += peonCount

          let dungeonWins = 0
          let dungeonDefeats = 0

          runs++

          const { player: playerStats, agents } = createMenaceManifest(analysis)

          let gameState: GameState = {
            id: 0,
            doors: [],
            message: "",
            player: playerStats,
            agents,
            turn: 0,
            end: false,
          }

          const getLiveEnemiesHere = (gameState: GameState) =>
            getAllEnemiesHere(gameState).filter((enemy) => !enemy.statuses.includes("dead"))
          const getAllEnemiesHere = (gameState: GameState) =>
            gameState.agents.filter((agent) => agent.room === gameState.id).filter(isEnemy)

          analysis.rooms.forEach((room, id, rooms) => {
            if (gameState.player.health < 0) return

            gameState = { ...gameState, id: room.id }

            let liveEnemiesHere = getLiveEnemiesHere(gameState)

            while (liveEnemiesHere.length && gameState.player.health >= 0) {
              gameState = enemiesAttack(gameState)
              const enemy = liveEnemiesHere[0]
              const action = `attack ${enemy.id}` as Action
              gameState = { ...gameState, action }
              gameState = handleAttack(gameState)
              const attackedEnemy = gameState.agents.find((agent) => agent.id === enemy.id)
              if (attackedEnemy?.statuses.includes("dead")) dungeonWins++
              liveEnemiesHere = getLiveEnemiesHere(gameState)
            }

            if (gameState.player.health >= 0) {
              // player takes room items
              const roomItems = room.notes?.filter(isItemNote).flatMap((note) => note.items) ?? []
              const enemyInventory = getAllEnemiesHere(gameState).flatMap((enemy) => enemy.inventory)
              const player = {
                ...gameState.player,
                inventory: [...gameState.player.inventory, ...roomItems, ...enemyInventory],
              }
              gameState = { ...gameState, player }
              if (id === rooms.length - 1) {
                wins++
                dungeonWinMap[file] = dungeonWinMap[file] ? dungeonWinMap[file] + 1 : 1
                if (gameState.agents.some((agent) => !agent.statuses.includes("dead"))) {
                  const liveRemaining = gameState.agents.filter((agent) => !agent.statuses.includes("dead"))
                  throw new Error(`Not all enemies killed by player ${liveRemaining}`)
                }
                const boss = getAllEnemiesHere(gameState).find((enemy) => enemy.class === "boss")
                if (boss) {
                  if (boss.statuses.includes("dead")) winAgainstBoss++
                  else throw new Error(`Reached victory in ${file} without killing boss`)
                }
                // console.log(file, "winLoss", (dungeonWins / (gameState.agents.length)).toFixed(2))
              }
            } else {
              defeats++
              dungeonWinMap[file] = dungeonWinMap[file] ? dungeonWinMap[file] : 0
              const boss = gameState.agents.filter(isEnemy).find((enemy) => enemy.class === "boss")
              if (boss && !boss.statuses.includes("dead")) defeatByBoss++
              // console.log(file, "winLoss", (dungeonWins / (gameState.agents.length)).toFixed(2))
            }
          })
        }

        const bossCount = Math.fround(totalBossCount / dungeonRunCount)
        const eliteCount = Math.fround(totalEliteCount / dungeonRunCount)
        const monsterCount = Math.fround(totalMonsterCount / dungeonRunCount)
        const peonCount = Math.fround(totalPeonCount / dungeonRunCount)

        if (i === all.length - 1) {
          console.info({
            winLoss: parseFloat((wins / (wins + defeats)).toFixed(2)),
            bossWinLoss: parseFloat((winAgainstBoss / (winAgainstBoss + defeatByBoss)).toFixed(2)),
            wins,
            defeats,
            winAgainstBoss,
            defeatByBoss,
            runs,
            fileCount,
          })
          Object.entries(dungeonWinMap).forEach((e) => console.log(e))

          console.info("done")
        }
      })
    })
})
