/** This file holds functionality responsible for analyzing the
 * dungeon and supplying appropriate enemies, as well as balancing
 * the player to have a decent fighting chance */

import { Enemy, Room, Agent, Mortal, EnemyStatus, Player } from "./dungeon"
import { DungeonAnalysis } from "./parseDungeon"
import {
  randomElement,
  getRandomNumber,
  keysRepeated,
  sortByExits,
  shuffleArray,
  randomBossName,
  aAn,
  randomMonsterName,
  singularize,
  isMonster,
  randomRaider,
  determineRandomValue,
  hasMonsterAttributes,
  getEliteNoun,
  capitalize,
} from "./utilties"

export type MenaceManifest = {
  player: Mortal
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

const getPeonName = (previousNames: string[], { animal, enemies }: DungeonAnalysis): string => {
  const enemyName = enemies && !isMonster(enemies) ? singularize(enemies) : undefined
  const animalName = animal
    ? animal.startsWith("were")
      ? animal
      : determineRandomValue() < 0.33
      ? `were${animal}`
      : `${animal}-man`
    : undefined
  const raider = randomRaider() // This returns the same raider each time it's called unless reset
  const name = enemyName ?? animalName ?? raider
  const changeItUp = (aName: string): string => {
    const previousNameCount = previousNames.reduce((count, pname) => (pname.endsWith(aName) ? count + 1 : count), 0)
    if (previousNameCount < 4) return aName
    else return changeItUp(randomRaider(true))
  }
  const peonName = changeItUp(name)

  return peonName
}

const getEliteName = ({ bossName }: DungeonAnalysis) => {
  const bossNoun = bossName?.match(/\b\w+\b$/)[0]
  const bossAdjective = bossName?.match(/(?<=\s)\w+(?=\s\w+|$)/) ?? ""

  const eliteNoun = capitalize(getEliteNoun(bossNoun?.toLowerCase()))

  return aAn(`${bossAdjective} ${eliteNoun}`.trim())
}

const getMonsterName = (previousNames: string[], { animal, monsterName, enemies }: DungeonAnalysis) => {
  const invader = enemies && (isMonster(enemies) || hasMonsterAttributes(enemies))
  const isMonsterNameClaimed = monsterName && previousNames.some((pName) => pName === monsterName)
  const isAnimalNameClaimed = animal === undefined || previousNames.some((pName) => pName.match(animal))
  const nameFromStory = isMonsterNameClaimed ? undefined : monsterName
  const nameFromEnemies = () => randomMonsterName(singularize(enemies))
  const avoidDuplicates = (name: string, count = 3): string =>
    name && count <= 0 ? name : previousNames.includes(name) ? avoidDuplicates(nameFromEnemies(), count - 1) : name
  const nameFromInvader = invader ? avoidDuplicates(nameFromEnemies()) : undefined
  const nameFromAnimal = isAnimalNameClaimed ? undefined : randomMonsterName(animal)
  const name = nameFromStory ?? nameFromInvader ?? nameFromAnimal ?? randomMonsterName()
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
  const { artifact, bossName, deadBoss, weapons, magic } = dungeonAnalysis
  const isMagicWeapon = weapons.some((weapon) => magic.some((magic) => magic === weapon))
  const kindOfDead = isMagicWeapon ? "ghost" : "ghastly revenant"

  // If boss is dead, what kind of dead? Some can only be defeated using magic weapons.
  // Are there magic weapons in the dungeon? If not, Boss is a 'ghastly revenant'
  // If so, then boss is a 'ghost' with status "spectral"

  const name = deadBoss ? `the ${kindOfDead} of ${bossName}` : bossName ?? randomBossName()
  const statuses: EnemyStatus[] = isMagicWeapon ? ["spectral"] : []
  const inventory = artifact ? [artifact] : []

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
        },
      ] as Enemy[]
    }
    case "elite": {
      const name = getEliteName(dungeonAnalysis)
      return [
        ...previousEnemies,
        {
          ...enemyTemplate,
          name,
          class: "elite",
          health: 2,
          attack: 3,
          defense: 3,
        },
      ]
    }
    case "peon": {
      const name = aAn(getPeonName(previousNames, dungeonAnalysis))
      return [
        ...previousEnemies,
        {
          ...enemyTemplate,
          name,
          class: "peon",
          health: 1,
          attack: 1,
          defense: 1,
        },
      ]
    }

    default:
      return [...previousEnemies, { ...enemyTemplate, name: `${aAn(encounterType)}`, class: encounterType }]
  }
}

/** This is where balancing of _pacing_ of encounters happens.
 * If there are too many or too few encounters, these are the numbers to adjust. */
export const getAdversaryAnalysis = ({
  rooms,
  veryLargeRooms,
  numKeys,
  emptyRooms,
  largeRooms,
  mediumRooms,
  lockedRooms,
}: DungeonAnalysis): AdversaryAnalysis => {
  const emptyRoomsCount = emptyRooms.length
  const veryLargeRoomsCount = veryLargeRooms.length
  const largeRoomsCount = largeRooms.length + mediumRooms.length
  const lockedRoomsCount = lockedRooms.length === rooms.length ? 0 : lockedRooms.length

  const bossChance = numKeys * 0.25 + emptyRoomsCount * 0.01
  const boss = bossChance > getRandomNumber() ? 1 : 0
  const monster = Math.max(Math.floor(veryLargeRoomsCount / 2.5 + largeRoomsCount / 20 + (1 - bossChance)), 0)
  const elite = Math.max(Math.floor(lockedRoomsCount * 0.15 + (1 - bossChance)), 0)
  const peon = Math.max(Math.floor((rooms.length - lockedRoomsCount) * 0.15), 0)

  return {
    boss,
    monster,
    elite,
    peon,
  }
}
/** This is where placement of encounters is determined. If the
 * encounters need to be distributed differently, this is where that
 * happens */
const placeEnemies =
  ({
    rooms,
    unlockedNonsecretTreasureRooms,
    unlockedNonsecretRooms,
    endingRoom,
    lockedRooms,
    largeRooms,
    veryLargeRooms,
    mediumRooms,
    justInsideRoom,
    treasureRooms,
    unlockedRooms,
  }: DungeonAnalysis) =>
  (placedEnemies: Enemy[], enemy: Enemy): Enemy[] => {
    const placedRoomIds = placedEnemies.map((enemy) => enemy.room) ?? []
    const availableRooms = rooms.filter((room) => !(placedRoomIds.includes(room.id) || room.id === 0)) // let's also reserve the front room
    const getRandomRoom = (rooms: Room[]) => randomElement(rooms)
    const firstAvailable = (rooms: Room[]) => rooms.find((room) => availableRooms.includes(room))

    switch (enemy.class) {
      case "boss": {
        // Boss is always in the ending room if it exists, otherwise the highest id room with area 9 or more
        const placed = firstAvailable([endingRoom, ...lockedRooms]) ?? getRandomRoom(availableRooms)
        const room = placed.id
        const boss = { ...enemy, room }
        return [...placedEnemies, boss]
      }

      // Monsters prefer large rooms with lots of exits
      case "monster": {
        // boss room if available
        // otherwise only unlocked rooms
        const unlockedLargeRooms =
          veryLargeRooms.filter((room) => !lockedRooms.some((locked) => locked.id === room.id)) ??
          largeRooms.filter((room) => !lockedRooms.some((locked) => locked.id === room.id)) ??
          mediumRooms.filter((room) => !lockedRooms.some((locked) => locked.id === room.id))
        const sorted = unlockedLargeRooms.sort(sortByExits)
        const room = firstAvailable([endingRoom, ...sorted, ...shuffleArray(unlockedRooms)]).id
        const monster = { ...enemy, room }
        return [...placedEnemies, monster]
      }

      // Elites only exist in the locked back rooms but never in the ending room
      case "elite": {
        // Locked rooms with treasure
        const lockedTreasureRooms = lockedRooms.filter((room) => treasureRooms.some((tRoom) => tRoom.id === room.id))
        // Just inside the gate room
        const anywhere = lockedRooms.filter((room) => room.id !== endingRoom.id)
        const room = firstAvailable([...lockedTreasureRooms, justInsideRoom, ...anywhere].filter((x) => x)).id
        const elite = { ...enemy, room }
        return [...placedEnemies, elite]
      }
      default: {
        // anywhere that is not a locked room, nor secret room
        // prefer treasure rooms
        const room = firstAvailable([
          ...unlockedNonsecretTreasureRooms,
          ...unlockedNonsecretRooms,
          ...shuffleArray(unlockedRooms),
        ]).id
        return [...placedEnemies, { ...enemy, room }]
      }
    }
  }

export const createMenaceManifest = (dungeonAnalysis: DungeonAnalysis): MenaceManifest => {
  const adversaryAnalysis = getAdversaryAnalysis(dungeonAnalysis)
  const agents = keysRepeated(adversaryAnalysis)
    .reduce(
      (enemies: Enemy[], encounterType: EnemyClass) => createEncounter(enemies, dungeonAnalysis, encounterType),
      []
    )
    .map((enemy, id) => ({ ...enemy, id }))
    .reduce(placeEnemies(dungeonAnalysis), [])

  const minMortal: Mortal = {
    health: 3,
    defense: 3,
    attack: 3,
    statuses: [],
  }
  const addMortals = (a: Mortal, b: Mortal) => ({ ...a, health: a.health + b.attack })
  const player = agents.reduce((player: Player, agent: Enemy) => addMortals(player, agent), minMortal)

  return { player, agents }
}
