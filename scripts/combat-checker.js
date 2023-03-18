"use strict"
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i]
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
        }
        return t
      }
    return __assign.apply(this, arguments)
  }
exports.__esModule = true
var fs_1 = require("fs")
var path_1 = require("path")
var agentKeeper_js_1 = require("../lib/agentKeeper.js")
var parseDungeon_js_1 = require("../lib/parseDungeon.js")
var parseDungeon_js_2 = require("../lib/parseDungeon.js")
var gameLoop_1 = require("../lib/gameLoop")
var directoryPath = "./static/dungeons/"
var wins = 0
var defeats = 0
var winAgainstBoss = 0
var defeatByBoss = 0
;(0, fs_1.readdir)(directoryPath, function (err, files) {
  if (err) {
    console.error("Error reading directory:", err)
    return
  }
  files
    .filter(function (file) {
      return (0, path_1.extname)(file) === ".json"
    })
    .forEach(function (file, i, all) {
      var filePath = (0, path_1.join)(directoryPath, file)
      ;(0, fs_1.readFile)(filePath, "utf8", function (err, data) {
        if (err) {
          console.error("Error reading file:", err)
          return
        }
        var json = JSON.parse(data)
        var dungeon = (0, parseDungeon_js_1.parseDungeon)(json)
        var analysis = (0, parseDungeon_js_2.analyzeDungeon)(dungeon)
        // const adversaryAnalysis = getAdversaryAnalysis(analysis)
        var _a = (0, agentKeeper_js_1.createMenaceManifest)(analysis),
          player = _a.player,
          agents = _a.agents
        // printAnalysis({ ...analysis, ...adversaryAnalysis })
        // console.info(inspect(agents, { depth: 6, colors: true }))
        console.info("\n\n" + analysis.title)
        var minGameState = {
          id: 0,
          doors: [],
          message: "",
          player: player,
          agents: [],
          turn: 0,
          end: false,
          inventory: analysis.items,
        }
        var attackBy = (0, gameLoop_1.attackByFunc)(minGameState)
        agents.reverse().reduce(function (player, enemy, i) {
          if (player.health < 0) return player
          var playerLoss = 0
          var enemyLoss = 0
          while (player.health > playerLoss && enemy.health > enemyLoss) {
            var enemyAttackResult = attackBy(enemy, player)
            var enemyAttack = enemyAttackResult.loss
            playerLoss += enemyAttack
            var playerAttackResult = attackBy(player, enemy)
            var playerAttack = playerAttackResult.loss
            enemyLoss += playerAttack
          }
          if (player.health - playerLoss < 0) {
            defeats++
            console.info("Player defeated by ".concat(enemy.name))
            if (enemy["class"] === "boss") defeatByBoss++
          } else {
            console.info("Player defeats ".concat(enemy.name))
            if (agents.length === i + 1) wins++
            if (enemy["class"] === "boss") winAgainstBoss++
          }
          return __assign(__assign({}, player), { health: player.health - playerLoss })
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
          console.info({ wins: wins, defeats: defeats, winAgainstBoss: winAgainstBoss, defeatByBoss: defeatByBoss })
          console.info("done")
        }
      })
    })
})
