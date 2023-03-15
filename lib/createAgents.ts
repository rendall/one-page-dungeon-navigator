/** This file holds functionality responsible for analyzing the
 * dungeon for current info and placing appropriate enemies or
 * allies */

import { Dungeon, isItemNote, Note, Enemy, Room, Agent, Mortal, isEnemy, isAgent } from "./dungeon"
import { aAn, randomElement } from "./utilties"

const bossPatterns = [
  /[A-Za-z/s]+ of (?<boss>the [A-Za-z-]+ (?!Cross|Skull|Moon|Star|Eye|Arrow|Fish|Crown|Bat|Heart|Bird|Lily|Leaf|Palm|Claw|Seashell|Snail|Fist)[A-Za-z]+)$/,
  /[A-Za-z/s]+ of (?<boss>[A-Za-z-]+)$/,
]

const deadBossPatterns = [
  /(?<boss>[\w\s]+) is long (dead|gone), but people are still (reluctant|afraid) to come close to the/,
  /(Since|After) the (demise|death|fall|defeat) of (?<boss>[\w\s]+) the [\w\s]+ has changed hands many times./,
  /Long after (?<boss>[\w\s]+)'s (demise|death|fall|defeat) the (?:[\w\s]+) remained/,
]

const monsterPatterns = [/(?:Recently|Lately) (?<beast>an? [A-Za-z-\s]+) has made its (?:home|lair) here/]

const animalPatterns = [
  /(?:(badly )?infested by|overrun with) (?<animal>(?!rabbit|sparrow|turtle|pig|pigeon|goat|chicken|cat)\w+)s/, // even giant versions of some of these animals will just never be scary
]

const enemyPatterns = [
  /(?:Recently|Lately) a pack of (?<enemies>[\w\s-]+) have made its (?:home|lair) here/,
  /(?:Recently|Lately) a (?:gang|party|band) of (?<enemies>[\w]+) rediscovered/,
  /(?:Recently|Lately|Now) [\w\s]+ (squatted|controlled) by a (?:gang|party|band) of (?<enemies>[\w]+)/,
]

const artifactPatterns = [/[\w\s]+that (?<artifact>[\w\s,-]+) is (?:still )?hidden here/]

const raiders = ["orc", "goblin", "hobgoblin", "kobold", "gnoll", "pirate", "bandit", "cultist", "thug", "ogre"]

const getBoss = (title: string): string | undefined =>
  bossPatterns
    .reduce<[RegExpMatchArray] | [null]>(
      (all, regex) => (all[0] ? all : regex.test(title) ? [title.match(regex)] : [null]),
      [null]
    )
    .flatMap((o) => o?.groups?.boss)[0]
const getDeadBoss = (story: string) =>
  deadBossPatterns
    .reduce<[RegExpMatchArray] | [null]>(
      (all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [null]),
      [null]
    )
    .flatMap((o) => o?.groups?.boss)[0]

const getMonster = (story: string): string | undefined =>
  monsterPatterns
    .reduce<[RegExpMatchArray] | [null]>(
      (all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [null]),
      [null]
    )
    .flatMap((o) => o?.groups?.beast)[0]
const getEnemies = (story: string): string | undefined =>
  enemyPatterns
    .reduce<[RegExpMatchArray] | [null]>(
      (all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [null]),
      [null]
    )
    .flatMap((o) => o?.groups?.enemies)[0]
const getAnimal = (story: string): string | undefined =>
  animalPatterns
    .reduce<[RegExpMatchArray] | [null]>(
      (all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [null]),
      [null]
    )
    .flatMap((o) => o?.groups?.animal)[0]
const getArtifact = (story: string): string | undefined =>
  artifactPatterns
    .reduce<[RegExpMatchArray] | [null]>(
      (all, regex) => (all[0] ? all : regex.test(story) ? [story.match(regex)] : [null]),
      [null]
    )
    .flatMap((o) => o?.groups?.artifact)[0]

const isWeapon = (item: string) =>
  [
    "axe",
    "dagger",
    "flail",
    "glaive",
    "halberd",
    "hammer",
    "javelin",
    "katana",
    "mace",
    "rapier",
    "scimitar",
    "spear",
    "staff",
    "sword",
  ].some((weapon) => item.includes(weapon))

const isArmor = (item: string) =>
  [
    "breastplate",
    "cape",
    "chainmail",
    "cloak",
    "helm",
    "leather armor",
    "mantle",
    "robe",
    "scale mail",
    "scarf",
    "shield",
  ].some((armor) => item.includes(armor))

const isMagic = (item: string) =>
  [
    "amulet",
    "ball",
    "blade",
    "book",
    "bow",
    "cape",
    "carpet",
    "censer",
    "coin",
    "compass",
    "cube",
    "doll",
    "eldritch",
    "enchanted",
    "flask",
    "flute",
    "gem",
    "grimoire",
    "holy",
    "horn",
    "hourglass",
    "knife",
    "lamp",
    "lantern",
    "life stealing",
    "lightning",
    "looking glass",
    "magic",
    "needle",
    "orb",
    "potion",
    "quill",
    "relic",
    "rod",
    "scroll",
    "skull",
    "slaying",
    "smiting",
    "spellbook",
    "staff",
    "stone",
    "tablet",
    "tarot deck",
    "tome",
    "unholy",
    "vengeance",
    "venom",
    "vorpal",
    "wand",
  ].some((magic) => item.includes(magic))

const isTreasure = (item: string) =>
  [
    "box",
    "bracelet",
    "brooch",
    "chain",
    "chess piece",
    "comb",
    "crown",
    "dice",
    "egg",
    "figurine",
    "gems",
    "idol",
    "mask",
    "medallion",
    "mirror",
    "necklace",
    "pin",
    "ring",
    "some gold",
    "statuette",
    "tiara",
  ].some((treasure) => item.includes(treasure))

const getItems = (rooms: Room[]) =>
  rooms
    .flatMap<Note>((room) => room.notes)
    .filter(isItemNote)
    .flatMap((note) => note.items)
    .sort()

const monsterAdjs = [
  "venomous",
  "mutant",
  "man-eating",
  "albino",
  "blood-sucking",
  "spectral",
  "soul-eating",
  "intelligent",
  "fire-breathing",
  "invisible",
]

const monsters = ["dragon", "basilisk", "manticore", "beholder", "sphinx", "chimera", "hydra", "wyvern", "wyrm"]

const getRandomAnimalMonster = (animal?: string) => {
  if (!animal) return undefined
  return randomElement(["huge", "giant", "terrifying", "fearsome", "undead"]) + ` ${animal}`
}

const getRandomMonster = () => aAn(`${randomElement(monsterAdjs)} ${randomElement(monsters)}`)

const getRandomBoss = () => {
  const adjs = [
    "serpent",
    "viper",
    "spider",
    "raven",
    "dread",
    "mad",
    "shadow",
    "dark",
    "blood",
    "cursed",
    "iron",
    "golden",
    "diamond",
    "jade",
    "storm",
    "fire",
    "ice",
    "void",
    "purple",
    "black",
    "red",
    "white",
    "vampire",
    "undead",
    "zombie",
    "silent",
    "moon",
    "immortal",
    "shadow",
    "fallen",
    "obsidian",
    "scarlet",
    "great",
    "one-eyed",
    "lich",
    "amber",
    "leper",
    "grey",
    "blind",
    "demon",
    "blasphemous",
  ]

  const nouns = [
    "king",
    "queen",
    "prince",
    "emperor",
    "lord",
    "lady",
    "baron",
    "magus",
    "savant",
    "titan",
    "god",
    "dragon",
    "one",
    "master",
    "general",
    "beast",
    "knight",
    "witch",
    "lady",
    "reaper",
    "messiah",
    "priest",
    "oracle",
  ]

  return `${randomElement(adjs)} ${randomElement(nouns)}`
}

type Analysis = {
  player: Mortal
  agents: Agent[]
}

export const createAgents = ({ title, story, rooms }: Dungeon): Analysis => {
  const deadBoss = getDeadBoss(story)
  const endMonsterName = deadBoss ? `the ghost of ${deadBoss}` : getBoss(title) ?? getMonster(story) ?? getRandomMonster()
  const endRoom = rooms.find((room) => room.ending)?.id

  const boss: Enemy = {
    id: 0,
    health: 3,
    attack: 3,
    defense: 3,
    statuses: [],
    name: endMonsterName,
    room: endRoom,
    isEnemy: true,
  }

  const agents: Agent[] = [boss].filter(isAgent) ?? []

  const player: Mortal = {
    health: 3,
    defense: 3,
    attack: 3,
    statuses: [],
  }
  return { player, agents }
}
