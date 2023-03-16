/** This file holds functionality responsible for analyzing the
 * dungeon for current info and placing appropriate enemies or
 * allies */

import { Enemy, Room, Agent, Mortal } from "./dungeon"
import { DungeonAnalysis } from "./parseDungeon"
import { randomElement, getRandomNumber, keysRepeated, sortByExits, shuffleArray } from "./utilties"

export type MenaceManifest = {
  player: Mortal
  agents: Agent[]
}

type EnemyClass = Enemy["class"]

type AdversaryAnalysis = {
  [key in EnemyClass]: number
}

/** This is where encounter difficulty is determined.
 * If encounters need to be buffed or nerfed, do it here */
const createEncounter = (enemyClass: EnemyClass, id: number): Enemy | Enemy[] => ({
  id,
  name: enemyClass,
  class: enemyClass,
  room: -1,
  health: 0,
  attack: 0,
  defense: 0,
  statuses: [],
  inventory: [],
  isEnemy: true,
})

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

export const createAgents = (dungeonAnalysis: DungeonAnalysis): MenaceManifest => {
  const adversaryAnalysis = getAdversaryAnalysis(dungeonAnalysis)
  const agents = keysRepeated(adversaryAnalysis)
    .flatMap((encounterType, i) => createEncounter(encounterType, i))
    .reduce(placeEnemies(dungeonAnalysis), [])
  const player: Mortal = {
    health: 3,
    defense: 3,
    attack: 3,
    statuses: [],
  }
  return { player, agents }
}

