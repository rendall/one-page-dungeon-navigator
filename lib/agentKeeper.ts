/** This file holds functionality responsible for analyzing the
 * dungeon and supplying appropriate enemies, as well as balancing
 * the player to have a decent fighting chance */

import { Enemy, Room, Agent, Mortal, EnemyStatus, Player, DoorType } from "./dungeon"
import { DungeonAnalysis } from "./parseDungeon"
import {
  aAn,
  determineRandomValue,
  distributeFactionPopulation,
  expandTally,
  getEliteNoun,
  getInventory as getEnemyInventory,
  getRandomBossName,
  getRandomElementOf,
  getRandomMonsterName,
  getRandomRaider,
  getRandomTreasureItem,
  getRoomsAtDistance,
  hasMonsterAttributes,
  inverseSquareRandom,
  isMonster,
  shuffleArray,
  singularize,
  toTitleCase,
} from "./utilties"

export type MenaceManifest = {
  player: Player
  agents: Agent[]
}

type EnemyClass = Enemy["class"]

type AdversaryAnalysis = {
  [key in EnemyClass]: number
}

const enemyTemplate: Enemy = {
  id: -1,
  name: "an enemy",
  class: "peon",
  room: -1,
  health: 0,
  attack: 0,
  defense: 0,
  statuses: [],
  inventory: [],
  isEnemy: true,
}

const getPeonFactionName = (
  previousNames: string[],
  dungeonAnalysis: DungeonAnalysis,
  factionIndex: number
): string => {
  const { animal, enemies } = dungeonAnalysis
  switch (factionIndex) {
    case 0: {
      // first peon faction is based on enemy, if available
      const enemyName = enemies && !isMonster(enemies) ? singularize(enemies) : undefined
      if (enemyName) return enemyName
    }
    // fall through if no enemy name
    case 1: {
      const animalName = animal
        ? animal.startsWith("were")
          ? animal
          : determineRandomValue() < 0.33
          ? `were${animal}`
          : `${animal}-man`
        : undefined
      if (animalName && !previousNames.includes(animalName)) return animalName
    }
    // fall through if no animal name
    default: {
      const getUniqueName = (name = getRandomRaider(true)): string =>
        previousNames.includes(name) ? getUniqueName(getRandomRaider(true)) : name
      return getUniqueName()
    }
  }
}

const getEliteName = (previousEnemies: Enemy[], { bossName }: DungeonAnalysis) => {
  const boss = bossName ?? previousEnemies.find((enemy) => enemy.class === "boss")?.name
  const bossNoun = boss?.match(/\b\w+\b$/)[0]
  const bossAdjective = boss?.match(/(?<=\s)\w+(?=\s\w+|$)/) ?? ""

  const eliteNoun = getEliteNoun(bossNoun?.toLowerCase())

  return aAn(`${bossAdjective} ${eliteNoun}`.trim())
}

const getMonsterName = (previousNames: string[], { animal, monsterName, enemies }: DungeonAnalysis) => {
  const invader = enemies && (isMonster(enemies) || hasMonsterAttributes(enemies))
  const isMonsterNameClaimed = monsterName && previousNames.some((pName) => pName === monsterName)
  const isAnimalNameClaimed = animal === undefined || previousNames.some((pName) => pName.match(animal))
  const nameFromStory = isMonsterNameClaimed ? undefined : monsterName
  const nameFromEnemies = () => getRandomMonsterName(singularize(enemies))
  const avoidDuplicates = (name: string, count = 3): string =>
    name && count <= 0 ? name : previousNames.includes(name) ? avoidDuplicates(nameFromEnemies(), count - 1) : name
  const nameFromInvader = invader ? avoidDuplicates(nameFromEnemies()) : undefined
  const nameFromAnimal = isAnimalNameClaimed ? undefined : getRandomMonsterName(animal)
  const name = nameFromStory ?? nameFromInvader ?? nameFromAnimal ?? getRandomMonsterName()
  return name
}

const getStatuses = (name: string): EnemyStatus[] => {
  const undead = /undead/.test(name) ? "undead" : undefined
  const giant = /giant|huge/.test(name) ? "giant" : undefined
  const invisible = /invisible/.test(name) ? "invisible" : undefined
  const venomous = /venomous/.test(name) ? "venomous" : undefined
  const spectral = /spectral/.test(name) ? "spectral" : undefined
  const fireBreathing = /fire-breathing/.test(name) ? "fire-breathing" : undefined
  return [fireBreathing, giant, invisible, spectral, undead, venomous].filter((x) => x) as EnemyStatus[]
}

const createBoss = (dungeonAnalysis: DungeonAnalysis): Enemy => {
  const { artifact, bossName, deadBoss, weapons, isMagic } = dungeonAnalysis
  const isMagicWeapon = () => weapons.some((weapon) => isMagic(weapon))
  const kindOfDead = () => (isMagicWeapon ? "ghost" : "revenant")

  // If boss is dead, what kind of dead? Some can only be defeated using magic weapons.
  // Are there magic weapons in the dungeon? If not, Boss is a 'ghastly revenant'
  // If so, then boss is a 'ghost' with status "spectral"

  const liveBossName = bossName ?? `the ${getRandomBossName()}`

  const name = deadBoss ? `the ${kindOfDead()} of ${bossName}` : liveBossName
  const statuses: EnemyStatus[] = deadBoss && isMagicWeapon() ? ["spectral"] : []
  const bossArtifact = artifact ?? toTitleCase(`the ${getRandomTreasureItem()} of ${liveBossName}`)
  const inventory = [bossArtifact, ...getEnemyInventory("boss")]

  return { ...enemyTemplate, name, statuses, inventory, health: 5, attack: 4, defense: 4, class: "boss" } as Enemy
}

/** This is where encounter difficulty is determined.
 * If encounters need to be buffed or nerfed, do it here */
const createEncounter = (
  previousEnemies: Enemy[],
  dungeonAnalysis: DungeonAnalysis,
  encounterType: EnemyClass
): Enemy[] => {
  const previousNames = previousEnemies.map((enemy) => enemy.name)
  switch (encounterType) {
    case "boss":
      return [...previousEnemies, createBoss(dungeonAnalysis)]
    case "monster": {
      const name = getMonsterName(previousNames, dungeonAnalysis)
      const statuses = getStatuses(name)
      const inventory = getEnemyInventory("monster")
      return [
        ...previousEnemies,
        {
          ...enemyTemplate,
          name,
          class: encounterType,
          health: 4,
          attack: 2,
          defense: 4,
          statuses,
          inventory,
        },
      ] as Enemy[]
    }
    case "elite": {
      const name = getEliteName(previousEnemies, dungeonAnalysis)
      const inventory = getEnemyInventory("elite")
      return [
        ...previousEnemies,
        {
          ...enemyTemplate,
          name,
          class: "elite",
          health: 2,
          attack: 3,
          defense: 3,
          inventory,
        },
      ]
    }
    case "peon": {
      const name = aAn("orc")
      const inventory = getEnemyInventory("peon")
      return [
        ...previousEnemies,
        {
          ...enemyTemplate,
          name,
          class: "peon",
          health: 1,
          attack: 1,
          defense: 1,
          inventory,
        },
      ]
    }

    default:
      return [...previousEnemies, { ...enemyTemplate, name: `${aAn(encounterType)}`, class: encounterType }]
  }
}

/**
 * Analyzes the dungeon's properties to determine the counts of adversaries in the dungeon.
 * This is where balancing of _pacing_ of encounters happens.
 * If there are too many or too few encounters, these are the numbers to adjust.
 * This should be a pure function, no randomness here.
 * @param {DungeonAnalysis} params - An object containing the dungeon's analysis properties.
 **/

export const getAdversaryAnalysis = (dungeonAnalysis: DungeonAnalysis): AdversaryAnalysis => {
  const { largeRooms, lockedRooms, mediumRooms, numKeys, rooms, secretRooms, veryLargeRooms } = dungeonAnalysis
  const veryLargeRoomsCount = veryLargeRooms.length
  const largeRoomsCount = largeRooms.length + mediumRooms.length
  const lockedRoomsCount = lockedRooms.length === rooms.length ? 0 : lockedRooms.length

  const boss = 1
  const elite = numKeys + Math.max(Math.floor(rooms.length * 0.15), 0) + Math.floor(lockedRooms.length * 0.25)
  const peon = Math.max(Math.floor((rooms.length - lockedRoomsCount - secretRooms.length) * 0.85), 0)
  const monster = Math.max(Math.floor(veryLargeRoomsCount / 2.5 + largeRoomsCount / 20), 0) + Math.ceil(peon / 10)

  return {
    boss,
    monster,
    elite,
    peon,
  }
}

/**
 * Gets a list of peon base rooms from the dungeon analysis, sorted by their suitability as bases.
 * The function prioritizes rooms with only one non-secret exit and an area between 4 and 20.
 * If there are not enough suitable rooms, it considers rooms with two non-secret exits and similar area requirements.
 * If still not enough, it includes all remaining rooms.
 *
 * @param {DungeonAnalysis} param0 - An object containing dungeon analysis data.
 * @param {{ id: number; w: number; h: number; exits: { type: DoorType }[] }[]} param0.unlockedNonsecretRooms - An array of unlocked non-secret room objects with their dimensions, exits, and IDs.
 * @returns {{ area: number; id: number }[]} An array of peon base room objects sorted by their suitability as bases, each containing the area and ID.
 */
const getPeonBaseRooms = ({ unlockedNonsecretRooms }: DungeonAnalysis) => {
  const getRoomScore = (exitsCount: number) => (exitsCount === 1 ? 2 : exitsCount === 2 ? 1 : 0)

  const availableRooms = unlockedNonsecretRooms.filter((room) => room.id)

  const suitableBases = availableRooms
    .map((room) => ({
      area: room.w * room.h,
      id: room.id,
      exitsCount: room.exits.filter((exit) => exit.type !== DoorType.secret).length,
    }))
    .filter(({ area }) => area >= 4 && area < 20)
    .sort((a, b) => getRoomScore(b.exitsCount) - getRoomScore(a.exitsCount) || b.area - a.area)

  const unfilteredUnordered = availableRooms.map((room) => ({ area: room.w * room.h, id: room.id }))

  const bases = [...suitableBases, ...unfilteredUnordered]

  if (bases.length === 0) console.error("No peon base rooms available")

  return bases
}

const assignLocations =
  (roomGraph: [number, number[]][]) =>
  (previous: { name: string; id: number }[] = [], { name, home }: { name: string; home: number }) => {
    const distance = inverseSquareRandom()
    const roomsAtDistance = getRoomsAtDistance(roomGraph, home, distance)
    const room = getRandomElementOf(roomsAtDistance)

    return [{ name, room }, ...previous]
  }

const findLocation = (roomGraph: [number, number[]][], homeRoom: number, inversePower = 2) => {
  const distance = inverseSquareRandom(0, inversePower)
  const roomsAtDistance = getRoomsAtDistance(roomGraph, homeRoom, distance)
  const roomId = getRandomElementOf(roomsAtDistance)
  return roomId
}

/** This is where placement of encounters is determined. If the
 * encounters need to be distributed differently, this is where that
 * happens */
const placeEnemies = (dungeonAnalysis: DungeonAnalysis, adversaryAnalysis: AdversaryAnalysis) => {
  const { rooms, lockedRooms } = dungeonAnalysis

  const { peon: peonCount } = adversaryAnalysis

  // if there are many peons, they are divided into factions
  // number of factions and their sizes are determined by the number of defensible, non-secret rooms and their area
  // each faction has a defendable home base - prefer a non-secret room with few exits and no notes
  const peonBaseRooms = getPeonBaseRooms(dungeonAnalysis)
  const peonFactionDistribution = distributeFactionPopulation({
    population: peonCount,
    spaces: peonBaseRooms.map(({ area }) => area),
  })
  const peonFactionNames = new Array(peonFactionDistribution.length)
    .fill("")
    .reduce((previousNames, _blank, i) => [...previousNames, getPeonFactionName(previousNames, dungeonAnalysis, i)], [])
  // home base is not the location of the enemy
  const roomGraph: [number, number[]][] = rooms.map<[number, number[]]>((room) => [
    room.id,
    room.exits.filter((exit) => typeof exit.to === "number").map((exit) => exit.to) as number[],
  ])

  let peonCounter = 0
  const peons: { name: string; room: number }[] = assignFactions(
    peonFactionDistribution,
    peonBaseRooms,
    peonFactionNames
  ).reduce(assignLocations(roomGraph), [])

  //TODO: large factions have a faction-themed monster at their home base

  // most peons will be at the home base, some will be just outside and there will be stragglers elsewhere, nearby

  // other monsters prefer large room, no notes, fewer exits, non-secret

  // boss room is always at the `ending` room if it's available, otherwise the highest id locked room, otherwise the highest id room over 3 x 3, otherwise the highest room over 2 x 2

  // elites will be in the boss room or an adjacent room

  const bossRoom =
    rooms.find((room) => room.ending) ??
    lockedRooms.reduce((highestId, room) => (room.id > highestId.id ? room : highestId)) ??
    rooms
      .filter((room) => room.h * room.w >= 9)
      .reduce((highestId, room) => (room.id > highestId.id ? room : highestId)) ??
    rooms
      .filter((room) => room.h * room.w >= 4)
      .reduce((highestId, room) => (room.id > highestId.id ? room : highestId))

  return (placedEnemies: Enemy[], enemy: Enemy): Enemy[] => {
    const placedRoomIds = placedEnemies.map((enemy) => enemy.room) ?? []
    const availableRooms = rooms.filter((room) => !(placedRoomIds.includes(room.id) || room.id === 0)) // let's also reserve the front room
    const firstAvailable = (rooms: Room[]) =>
      rooms.filter((room) => room.id).find((room) => availableRooms.includes(room)) ?? getRandomElementOf(rooms)

    switch (enemy.class) {
      case "boss": {
        // Boss is always in the ending room if it exists, otherwise the highest id room with area 9 or more
        const boss = { ...enemy, room: bossRoom.id }
        return [...placedEnemies, boss]
      }

      // Monsters prefer large rooms with lots of exits
      case "monster": {
        // boss room if available
        // otherwise only unlocked rooms
        const room = firstAvailable(shuffleArray(rooms)).id
        const monster = { ...enemy, room }
        return [...placedEnemies, monster]
      }

      case "elite": {
        const room = findLocation(roomGraph, bossRoom.id, 1.5)
        const elite = { ...enemy, room }
        return [...placedEnemies, elite]
      }
      default: {
        const peon = peons[peonCounter]
        const name = aAn(peon.name)
        peonCounter++
        return [...placedEnemies, { ...enemy, ...peon, name }]
      }
    }
  }
}

export const createMenaceManifest = (dungeonAnalysis: DungeonAnalysis): MenaceManifest => {
  const adversaryAnalysis = getAdversaryAnalysis(dungeonAnalysis)
  const agents = expandTally(adversaryAnalysis)
    .reduce(
      (enemies: Enemy[], encounterType: EnemyClass) => createEncounter(enemies, dungeonAnalysis, encounterType),
      []
    )
    .map((enemy, id) => ({ ...enemy, id }))
    .reduce(placeEnemies(dungeonAnalysis, adversaryAnalysis), [])

  const inventory = [
    "a wooden shield",
    "a rusty sword",
    "a leather helmet",
    "a potion of healing",
    "a potion of healing",
  ]

  const playerStats: Mortal = {
    health: 10,
    defense: 1,
    attack: 1,
    statuses: [],
    inventory,
  }
  const player = { ...playerStats, maxHealth: playerStats.health }

  return { player, agents }
}

/**
 * Assigns factions to base rooms based on the given population distribution and room information.
 * The function creates an array of objects representing the assignments of faction members to the available rooms.
 *
 * @param {number[]} factionPopulationDistribution - An array representing the population of each faction.
 * @param {{ area: number; id: number }[]} baseRooms - An array of objects containing the area and ID of each room.
 * @returns {{ faction: number; room: number }[]} An array of objects representing the assignment of faction members to rooms.
 */
const assignFactions = (
  factionPopulationDistribution: number[],
  baseRooms: { area: number; id: number }[],
  factionNames: string[]
) =>
  factionPopulationDistribution.flatMap((factionPopulation: number, faction: number) =>
    new Array(factionPopulation).fill({ name: factionNames[faction], home: baseRooms[faction].id })
  )
