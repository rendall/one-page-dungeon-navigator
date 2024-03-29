/** This is the game engine. The Dungeon object is immutable.
 * GameState holds all of the changes or status updates. On user
 * input, the GameState is merged or compared with data from
 * Dungeon data and used to determine the result of the player action. */
import {
  Action,
  Agent,
  BodyNote,
  ContainerNote,
  CuriousNote,
  Door,
  Dungeon,
  Enemy,
  Exit,
  ExitDirection,
  Mortal,
  Note,
  NoteStatus,
  NoteType,
  Room,
  SecretNote,
  isAgent,
  isCuriousNote,
  isEnemy,
  isPlayer,
  MortalStatus,
  EnemyStatus,
  isItemNote,
  Player,
} from "./dungeon"
import { exitDirections, DoorType, isAction } from "./dungeon"
import {
  capitalize,
  compose,
  deCapitalize,
  doKeysMatchKeyholes,
  fmt,
  getRandomNumber,
  groupAgents,
  hereIs,
  inventoryMessage,
  isArmor,
  isMagic,
  isWeapon,
  period,
  replace,
  sortExitsClockwise,
  toList,
  toThe,
} from "./utilties"
import { MenaceManifest, createMenaceManifest } from "./agentKeeper"
import { analyzeDungeon, DungeonAnalysis } from "./parseDungeon"

export type GameState = {
  id: number
  action?: Action
  doors: DoorState[]
  error?: string
  message: string
  rooms?: RoomState[]
  isFleeing?: boolean
  player: Player
  agents: Agent[]
  turn: number
  end: boolean
}

export type GameOutput = {
  action: Action // This is the last action of the user
  message: string
  agents: { id: number; name: string; message?: string; [key: string]: unknown }[]
  room: number
  description: string
  exits: (Exit & { door: DoorState })[]
  end: boolean
  error?: string
  turn: number
  statuses?: RoomStatus[]
  imperatives?: [string, string][]
}

type DoorStatus = "unlocked" | "discovered" | "open"
export type DoorState = Door & { id: number; statuses?: DoorStatus[] }

const roomStatuses = ["visited", "searched"] as const
type RoomStatus = (typeof roomStatuses)[number]

export type RoomState = Partial<Room> & { id: number; statuses: RoomStatus[]; notes?: Note[] }

const initState: GameState = {
  id: 0,
  message: "",
  turn: 0,
  end: false,
  rooms: [],
  doors: [],
  player: {
    health: 3,
    attack: 3,
    defense: 3,
    maxHealth: 3,
    statuses: [],
    inventory: [],
  },
  agents: [],
}

/** GameStateModifiers are functions that take an old game state,
 * modify it, and return the new game state. GameStateModifier is
 * how all changes to the game state should be made. */
type GameStateModifier = (gameState: GameState) => GameState

type GameStateEntry = [keyof GameState, GameState[keyof GameState]]

const clearProps: (keyof GameState)[] = ["error", "message", "end", "isFleeing"]

/** Remove properties from GameState */
export const resetState: GameStateModifier = (gameState: GameState): GameState => {
  const cleanSlate = Object.entries<GameState[keyof GameState]>(gameState)
    .filter((entry: GameStateEntry) => !clearProps.includes(entry[0]))
    .reduce<Partial<GameState>>(
      (gs: GameState, kv: GameStateEntry) => ({ ...gs, [kv[0]]: kv[1] } as GameState),
      {}
    ) as GameState

  // clean `messages` from agents
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const agents = cleanSlate.agents.map(({ message, ...rest }) => rest)

  return { ...cleanSlate, agents }
}

/** Add a message to GameState */
const addMessage =
  (message: string): GameStateModifier =>
  (gameState: GameState) => {
    const oldMessage = gameState.message?.trim() || ""
    const newMessage = message.trim() === "" ? oldMessage : `${oldMessage} ${fmt(message, capitalize, period)}`
    return { ...gameState, message: newMessage.trim() }
  }

/** Insert or update a door in GameState */
const updateDoorState =
  (door: DoorState): GameStateModifier =>
  (gameState: GameState): GameState => {
    const amendDoors = gameState.doors?.filter((d) => d.id !== door.id) ?? []
    const doors = [...amendDoors, door]
    return { ...gameState, doors }
  }

const updateRoomState =
  (room: RoomState): GameStateModifier =>
  (gameState: GameState): GameState => {
    const amendRooms = gameState.rooms?.filter((d) => d.id !== room.id) ?? []
    const rooms = [...amendRooms, room]
    return { ...gameState, rooms }
  }

const removeKeys: GameStateModifier = (gameState: GameState): GameState => {
  const inventory = gameState.player.inventory.filter((item) => !item.endsWith("key"))
  const player = { ...gameState.player, inventory }
  return { ...gameState, player }
}

/** Add one or more statuses to an object such as a Door or Room or Enemy
 *  @example addStatus(door, "unlocked", "open")
 */
const addStatus = <T extends { id: number; statuses?: string[] }>(statusObj: T, ...statuses: string[]): T => {
  if (statuses.length === 0) return statusObj
  const status = statuses[0]
  if (statusObj.statuses?.includes(status)) return addStatus(statusObj, ...statuses.slice(1))
  else return addStatus({ ...statusObj, statuses: [...(statusObj.statuses ?? []), status] }, ...statuses.slice(1))
}

const addStatusToRoom =
  (status: RoomStatus, roomId?: number): GameStateModifier =>
  (gameState: GameState) => {
    const id = roomId ?? gameState.id
    const room: RoomState = gameState.rooms?.find((room) => room.id === id) ?? { id, statuses: [] }
    const newState = compose(updateRoomState(addStatus(room, status)))(gameState)
    return newState
  }

const removeStatusFromRoom =
  (statusToRemove: RoomStatus, roomId?: number): GameStateModifier =>
  (gameState: GameState) => {
    const id = roomId ?? gameState.id
    const room: RoomState = gameState.rooms?.find((room) => room.id === id) ?? { id, statuses: [] }
    const updatedStatuses = room.statuses.filter((status) => status !== statusToRemove)
    const updatedRoom = { ...room, statuses: updatedStatuses }
    const newState = compose(updateRoomState(updatedRoom))(gameState)
    return newState
  }
const addStatusToAgent =
  (agent: Agent | Enemy, ...statuses: (MortalStatus | EnemyStatus)[]) =>
  (gameState: GameState) => {
    const updatedAgent = addStatus(agent, ...statuses)
    const agents = replace(updatedAgent, gameState.agents)
    return { ...gameState, agents }
  }

const addStatusToNote =
  (noteId: number, ...statuses: NoteStatus[]): GameStateModifier =>
  (gameState: GameState) => {
    const id = gameState.id
    const room: RoomState = gameState.rooms?.find((room) => room.id === id)
    const note = room.notes.find((note) => note.id === noteId)
    const updatedNote = addStatus(note, ...statuses)
    const notes = replace(updatedNote, room.notes)
    const updatedRoom = { ...room, notes }
    const rooms = replace(updatedRoom, gameState.rooms)
    return { ...gameState, rooms }
  }

const addStatusToDoor = (door: DoorState, ...statuses: string[]) => updateDoorState(addStatus(door, ...statuses))

const addToInventory =
  (items: string[]): GameStateModifier =>
  (gameState: GameState) => {
    const inventory = [...gameState.player.inventory, ...items]
    const player = { ...gameState.player, inventory }
    return { ...gameState, player }
  }

const addInventoryMessage = (): GameStateModifier => (gameState: GameState) => {
  const inventory = inventoryMessage(gameState.player.inventory)
  return compose(addMessage(`You now have ${inventory === "" ? "nothing" : inventory}.`))(gameState)
}

const onUseCuriousNote =
  ({ action, message, id, feature, trigger, object }: CuriousNote): GameStateModifier =>
  (gameState: GameState) => {
    const isGone = ["bursts into flames", "turns into dust"].includes(action)
    const isInventory = trigger === "picked up"
    const items = [
      ...(action.startsWith("spawns") ? [action.replace("spawns ", "")] : []),
      ...(object === "doll" && !isGone ? [feature] : []),
    ]

    const isTeleporter = action.startsWith("teleports")

    const composeParams = [
      addMessage(message),
      addStatusToNote(id, "used"),
      ...(isTeleporter ? [moveTo(0), addMessage("You return, and enter.")] : []),
      ...(isGone || isInventory ? [addStatusToNote(id, "gone")] : []),
      ...(items.length ? [addToInventory(items)] : []),
      ...(items.length ? [addInventoryMessage()] : []),
    ]

    return compose(...composeParams)(gameState)
  }

/** Set current room id to id */
const moveTo =
  (id: number | "outside"): GameStateModifier =>
  (gameState: GameState) =>
    id === "outside" ? { ...gameState, message: "You leave the dungeon", end: true } : { ...gameState, id }

const handleUse =
  (dungeon: Dungeon): GameStateModifier =>
  (gameState: GameState) => {
    const currentRoom = getCurrentRoom(dungeon, gameState)
    const curiousNotes = currentRoom.notes?.filter((note: CuriousNote) => note.type === "curious") as CuriousNote[]

    const unusedNote = curiousNotes?.find(
      (note: CuriousNote) => note.imperative && !note.statuses?.includes("used")
    ) as CuriousNote

    if (unusedNote) return onUseCuriousNote(unusedNote)(gameState)

    return { ...gameState, message: `There is nothing ${curiousNotes?.length ? "else " : ""}to use here.` }
  }

const handleSearch =
  (dungeon: Dungeon): GameStateModifier =>
  (gameState: GameState) => {
    const currentRoom = getCurrentRoom(dungeon, gameState)

    const unsearchedDeadEnemy = gameState.agents
      .filter((agent) => agent.room === gameState.id)
      .filter((agent) => agent.isEnemy)
      .filter((agent) => agent.statuses.includes("dead"))
      .filter((agent: Enemy) => !agent.statuses.includes("searched"))
      .find((agent) => agent)
    if (unsearchedDeadEnemy) {
      const items = unsearchedDeadEnemy.inventory
      const message = items.length
        ? `You loot the corpse of ${toThe(unsearchedDeadEnemy.name)} and find ${toList(items)}!`
        : `You search the corpse of ${toThe(unsearchedDeadEnemy.name)} and find nothing.`
      const newGameState = compose(addMessage(message), addStatusToAgent(unsearchedDeadEnemy, "searched"))(gameState)

      return items.length ? compose(addToInventory(items), addInventoryMessage())(newGameState) : newGameState
    }

    const unopenedContainer = currentRoom.notes?.find(
      (note) => note.type === NoteType.container && !note.statuses?.includes("searched")
    ) as ContainerNote

    if (unopenedContainer) {
      const newGameState = compose(
        addMessage(unopenedContainer.message),
        addStatusToNote(unopenedContainer.id, "searched"),
        addToInventory(unopenedContainer.items),
        addInventoryMessage()
      )(gameState)

      return newGameState
    }

    const unAcquiredItem = currentRoom.notes?.find(
      (note) => isItemNote(note) && !note.statuses?.includes("searched")
    ) as BodyNote

    if (unAcquiredItem) {
      const newGameState = compose(
        addMessage(unAcquiredItem.message),
        addStatusToNote(unAcquiredItem.id, "searched"),
        addToInventory(unAcquiredItem.items),
        addInventoryMessage()
      )(gameState)

      return newGameState
    }

    const undiscoveredSecret = currentRoom.notes?.find(
      (note) => note.type === NoteType.secret && !note.statuses?.includes("searched")
    ) as SecretNote

    if (undiscoveredSecret) {
      const newGameState = compose(
        addMessage(undiscoveredSecret.message),
        addStatusToNote(undiscoveredSecret.id, "searched"),
        addToInventory(undiscoveredSecret.items),
        addInventoryMessage()
      )(gameState)

      return newGameState
    }

    const undiscoveredSecretDoor = currentRoom.exits.find(
      (exit) =>
        exit.door.type === 6 &&
        !gameState.doors.find((door) => door.id === exit.door.id)?.statuses.includes("discovered")
    )

    if (undiscoveredSecretDoor) {
      const doors: DoorState[] = [...gameState.doors, { ...undiscoveredSecretDoor.door, statuses: ["discovered"] }]
      return {
        ...gameState,
        doors,
        message: `You search along the ${undiscoveredSecretDoor.towards}ern wall and discover a secret door!`,
      }
    } else {
      const hadInterest =
        currentRoom.notes?.length ||
        currentRoom.exits.some((exit) => exit.door.type === DoorType.secret && exit.isFacing)
      const newState = compose(
        addMessage(`You search but find nothing ${hadInterest ? "else " : ""}of interest.`),
        addStatusToRoom("searched")
      )(gameState)
      return newState
    }
  }

export const handleAttack = (gameState: GameState) => {
  const [, toAttackId] = gameState.action.split(" ").map((x) => parseInt(x))
  const agentsHere = gameState.agents.filter((agent) => agent.room === gameState.id)
  const enemiesHere = agentsHere.filter(isEnemy)

  if (enemiesHere.length === 0) return compose(addMessage(`There is nothing here to attack.`))(gameState)

  const liveEnemies = enemiesHere.filter((enemy) => !enemy.statuses.includes("dead")).sort((a, b) => b.id - a.id)

  if (liveEnemies.length === 0 && toAttackId === undefined)
    return compose(addMessage(`There is nothing here to attack.`))(gameState)

  const enemyId = toAttackId ?? liveEnemies[0].id

  const enemy = enemiesHere.find((enemy) => enemy.id === enemyId)

  if (!enemy) return compose(addMessage("That enemy is unknown"))(gameState)
  if (enemy.statuses.includes("dead"))
    return compose(addMessage(`${capitalize(toThe(enemy.name))} is dead.`))(gameState)

  const { loss, result } = attackBy(gameState.player, enemy)

  if (loss < 0) throw new Error(`Bad attack result with loss of ${loss}`)

  const health = enemy.health - loss

  if (health < 0) {
    if (!isAgent(enemy)) throw new Error("Mortal is not of type Agent in 'handleAttack'")
    const deadEnemy = addStatus(enemy, "dead")
    const agents = replace(deadEnemy, gameState.agents)
    return compose(
      addMessage(result),
      addMessage(`${capitalize(toThe(enemy.name))} is dead.`),
      removeStatusFromRoom("searched") // The room is no longer thoroughly searched because now there is an unsearched dead enemy here.
    )({ ...gameState, agents })
  }

  const agents = replace({ ...enemy, health }, gameState.agents)
  return compose(addMessage(result))({ ...gameState, agents })
}

const getCurrentRoom = (dungeon: Dungeon, gameState: GameState) => {
  const dungeonCurrentRoom = dungeon.rooms.find((room) => room.id === gameState.id)
  if (!dungeonCurrentRoom) throw new Error(`Bad data: room ${gameState.id} not found`)

  const stateCurrentRoom = gameState.rooms?.find((room) => room.id === gameState.id)

  const notes = stateCurrentRoom?.notes ?? dungeonCurrentRoom.notes

  const currentRoom = {
    ...dungeonCurrentRoom,
    notes,
    statuses: stateCurrentRoom?.statuses ?? [],
    description: dungeonCurrentRoom.description,
  }
  return currentRoom
}

/** handleExit handles status changes when the character exits a room */
const handleExit =
  (dungeon: Dungeon): GameStateModifier =>
  (gameState: GameState): GameState => {
    const currentRoom = getCurrentRoom(dungeon, gameState)
    const isVisible = isVisibleExitFunc(gameState)
    const isByDirection = exitDirections.includes(gameState.action as ExitDirection)
    const isByNumber = /^\d$/.test(gameState.action)
    const visibleExits = currentRoom.exits.filter(isVisible)
    const exit = isByDirection
      ? visibleExits.find((e) => e.towards === gameState.action)
      : isByNumber
      ? visibleExits.sort(sortExitsClockwise(currentRoom))[parseInt(gameState.action) - 1]
      : false
    if (!exit) return { ...gameState, message: "You cannot go that way" }
    if (exit.to === "outside") return { ...gameState, message: "You leave the dungeon", end: true }
    const dungeonDoor = (dungeon.doors as (Door & { id: number })[]).find((door) => door.id === exit.door.id)
    const door: DoorState = {
      ...dungeonDoor,
      ...gameState.doors.find((door) => door.id === exit.door.id),
    }

    const goOutFunc =
      (dungeon: Dungeon) =>
      (exit: Exit): GameStateModifier =>
      (gameState: GameState) => {
        // prevent an esoteric edge case by ensuring the room exists
        const doesRoomExist = exit.to < dungeon.rooms.length || dungeon.rooms.some((room) => room.id === exit.to)

        if (doesRoomExist)
          return compose(
            fleeingEnemiesCheck,
            addMessage(`You go ${exit.towards}`),
            addStatusToRoom("visited"),
            moveTo(exit.to)
          )(gameState, passIfEnd)
        else return compose(addMessage("You cannot go that way"))(gameState)
      }

    const goOut = goOutFunc(dungeon)

    switch (door.type) {
      // steel doors can only be opened from one direction
      case DoorType.steel: {
        const isSteelUnlocked = door?.statuses?.find((s) => s === "unlocked")
        if (isSteelUnlocked) return compose(goOut(exit))(gameState, passIfEnd)
        if (exit.isFacing)
          return { ...gameState, message: `You attempt to go ${exit.towards} but the steel door does not open.` }
        else {
          return compose(
            addStatusToDoor(door, "unlocked", "open"),
            addMessage("You shove against the steel door and it opens."),
            goOut(exit)
          )(gameState, passIfEnd)
        }
      }
      // portcullises can only be opened from one direction
      case DoorType.portcullis: {
        const isPortcullisUnlocked = door?.statuses?.find((s) => s === "unlocked")
        if (isPortcullisUnlocked) return compose(goOut(exit))(gameState, passIfEnd)
        if (exit.isFacing)
          return { ...gameState, message: `You attempt to go ${exit.towards} but the portcullis bars your way.` }
        else {
          return compose(
            addStatusToDoor(door, "unlocked", "open"),
            addMessage("You pull the lever. The portcullis opens."),
            goOut(exit)
          )(gameState, passIfEnd)
        }
      }
      case DoorType.double:
        // This door type falls through if there is no associated note
        if (exit.note && exit.note.keyholes) {
          if (door.statuses?.includes("open")) return compose(goOut(exit))(gameState, passIfEnd)

          const keys = gameState.player.inventory.filter((item) => item.endsWith("key")) ?? []
          const whichKeys = inventoryMessage(gameState.player.inventory).match(/^[\w\s-]+? keys?/)
          const howManyKeys = whichKeys ? `only ${whichKeys}` : "no keys"

          if (doKeysMatchKeyholes(exit.note.keyholes, keys)) {
            return compose(
              addStatusToDoor(door, "unlocked", "open"),
              addMessage(
                `You insert ${whichKeys} into ${toThe(exit.note.keyholes)} of ${toThe(exit.note.door)}. It grinds open.`
              ),
              removeKeys,
              goOut(exit)
            )(gameState, passIfEnd)
          } else
            return {
              ...gameState,
              message: `You attempt to go ${exit.towards} but ${toThe(exit.note.door)} is locked. It has ${
                exit.note.keyholes
              } but you have ${howManyKeys}.`,
            }
        }
      // eslint-disable-next-line no-fallthrough
      default:
        return compose(addStatusToDoor(door, "open"), goOut(exit))(gameState, passIfEnd)
    }
  }

const passIfEnd = (gameState: GameState, f: GameStateModifier) => (gameState.end ? gameState : f(gameState))

const handleActionFunc =
  (dungeon: Dungeon): GameStateModifier =>
  (gameState: GameState): GameState => {
    if (gameState === undefined) throw Error("gameState is undefined in handleAction")
    const action = gameState.action.split(" ")[0]
    switch (action) {
      case "east":
      case "west":
      case "north":
      case "south":
        return handleExit(dungeon)(gameState)
      case "search":
        return handleSearch(dungeon)(gameState)
      case "use":
        return handleUse(dungeon)(gameState)
      case "attack":
        return handleAttack(gameState)
      case "noop":
        return gameState
      case "quit":
        return { ...gameState, message: "You quit.", end: true }
      case "info": {
        const { health, attack, defense, statuses } = gameState.player
        return compose(
          addMessage("You take stock of your situation."),
          addMessage(`Your health is ${health}.`),
          addMessage(`Your attack is ${attack + calculateAttackBonus(gameState.player)}.`),
          addMessage(`Your defense is ${defense + calculateDefenseBonus(gameState.player)}.`),
          addMessage(`Your magical power is ${calculateMagicBonus(gameState.player)}.`),
          addMessage(statuses?.length ? `You are ${toList(statuses)}` : ""),
          addInventoryMessage()
        )(gameState)
      }
      default:
        if (/^\d$/.test(action)) {
          return handleExit(dungeon)(gameState)
        } else return { ...gameState, message: "Not understood.", error: "syntax" }
    }
  }

type AttackResult = {
  loss: number
  result: string
}

const calculateMagicBonus = (mortal: Mortal): number =>
  mortal.inventory?.reduce<number>((bonus: number, item: string) => (isMagic(item) ? bonus + 1 : bonus), 0)
const calculateAttackBonus = (mortal: Mortal) =>
  mortal.inventory?.reduce((bonus, item) => (isWeapon(item) ? bonus + 1 : bonus), calculateMagicBonus(mortal)) ?? 0
const calculateDefenseBonus = (mortal: Mortal) =>
  mortal.inventory?.reduce((bonus, item) => (isArmor(item) ? bonus + 1 : bonus), calculateMagicBonus(mortal)) ?? 0

export const attackBy = (attacker: Mortal, defender: Mortal): AttackResult => {
  const attackBonus = calculateAttackBonus(attacker)
  const defenseBonus = calculateDefenseBonus(defender)

  const attackPower = attacker.attack + attackBonus
  const defensePower = defender.defense + defenseBonus

  const defenderName = isPlayer(defender) ? "you" : toThe((defender as Agent).name)
  const attackerName = isPlayer(attacker) ? "You" : capitalize(toThe((attacker as Agent).name))

  const attack = getRandomNumber() * attackPower
  const defense = getRandomNumber() * defensePower

  const isSuccess = attack > defense
  const damage = attackPower - defenseBonus < 1 ? 1 : attackPower - defenseBonus
  const loss = isSuccess ? damage : 0

  if (isPlayer(attacker)) {
    if (!isAgent(defender)) throw new Error("Defender is unknown agent")
    const successResult = `You attack ${toThe(defender.name)} and hit!`
    const failResult = `You attack ${toThe(defender.name)} and miss!`
    return { loss, result: isSuccess ? successResult : failResult }
  } else {
    const successResult = `${toThe(attackerName)} attacks ${defenderName} and hits!`
    const failResult = `${toThe(attackerName)} attacks ${defenderName} and misses!`
    return { loss, result: isSuccess ? successResult : failResult }
  }
}

export const enemiesAttack: GameStateModifier = (gameState: GameState) => {
  const { player, agents } = gameState
  const enemiesHere = agents
    .filter(isEnemy)
    .filter((agent) => agent.room === gameState.id)
    .filter((agent) => agent.isEnemy)
    .filter((enemy) => !enemy.statuses.includes("dead"))

  if (enemiesHere.length === 0) return gameState

  const attacksResults = enemiesHere
    .map((enemy) => (gameState.isFleeing ? { ...enemy, attack: enemy.attack * 1.5 } : enemy))
    .map((enemy) => ({ enemy, ...attackBy(enemy, player) }))
  const enemies = attacksResults.map(({ enemy, result }) => ({ ...enemy, message: result })) as Agent[]
  const health = attacksResults.reduce((health, { loss }) => health - loss, player.health)

  const updatedAgents = enemies.reduce((all, attacker) => replace(attacker, all), agents)
  const newGameState = { ...gameState, player: { ...player, health }, agents: updatedAgents }

  if (health < 0) {
    const healthPotionIndex = player.inventory.findIndex((item) => item === "a potion of healing")
    if (healthPotionIndex >= 0) {
      const inventory = player.inventory
        .slice(0, healthPotionIndex)
        .concat(player.inventory.slice(healthPotionIndex + 1))

      const healedPlayer = { ...player, inventory, health: player.maxHealth }
      return compose(addMessage("You quaff a potion of healing."))({ ...newGameState, player: healedPlayer })
    }
    return compose(addMessage("You succumb to the attack and die."))({ ...newGameState, end: true })
  } else return newGameState
}

const fleeingEnemiesCheck: GameStateModifier = (gameState: GameState) => {
  const { agents } = gameState
  const enemiesHere = agents
    .filter(isEnemy)
    .filter((agent) => agent.room === gameState.id)
    .filter((agent) => agent.isEnemy)
    .filter((enemy) => !enemy.statuses.includes("dead"))

  if (enemiesHere.length === 0) return gameState
  return enemiesAttack({ ...gameState, isFleeing: true })
}

const advanceTurn: GameStateModifier = (gameState: GameState) => ({ ...gameState, turn: gameState.turn + 1 })

export const describeNote = (note: Note) => {
  switch (note.type) {
    case "none":
      if (note.text.startsWith("The")) return note.text
      return hereIs(note.text)

    case NoteType.curious:
      if (!isCuriousNote(note)) throw new Error(`Mislabeled note ${note}`)
      return note.pristine

    case "secret":
      return ""

    case "door":
      return `There is ${deCapitalize(note.text)}`

    default:
      if (note.statuses?.includes("searched")) return (note as ContainerNote).empty
      else return (note as ContainerNote).pristine
  }
}

const describeNotes = (notes: Note[]): string =>
  notes
    .filter((note) => !note.statuses?.includes("gone"))
    .reduce((description: string, note: Note) => `${description} ${describeNote(note)}`.trim(), "")

const describeAgent = (agent: Agent): string => {
  const agentDescription = agent.statuses.includes("dead")
    ? (agent as Enemy).statuses.includes("searched")
      ? `a looted corpse of ${agent.name}`
      : `a corpse of ${agent.name}`
    : agent.name
  return agentDescription
}

export const describeAgents = (agents: Enemy[]): string => {
  if (agents.length === 0) return ""
  return groupAgents(agents.map((agent) => describeAgent(agent)))
}

const getExitDescription = (exit: Exit, i: number, all: Exit[]) => {
  const exitNumber = (doShow: boolean, index: number) => (doShow ? ` - ${index + 1}` : "")
  // areExitsSame is true if there are at least 2 exits toward the same direction,
  const areExitsSame = all.some((exit, i, all) =>
    [...all.slice(0, i), ...all.slice(i + 1)].find((e) => e.towards === exit.towards)
  )

  if (exit.note) {
    const isOpen = (exit.door as DoorState).statuses?.includes("open")
    const keyholes = exit.note.keyholes ? ` with ${exit.note.keyholes}` : ""
    if (isOpen) return `To the ${exit.towards}, ${deCapitalize(exit.note.door)} stands open.`
    else return `To the ${exit.towards} is ${deCapitalize(exit.note.door)}${keyholes}.`
  }

  const isA = (exit: Exit) => {
    const door = exit.door as DoorState
    switch (door.type) {
      case DoorType.door:
      case DoorType.portcullis:
      case DoorType.secret:
      case DoorType.steel:
        return door.statuses?.includes("open") ? "is an open" : "is a"
      case DoorType.double:
        return door.statuses?.includes("open") ? "are open" : "are"
      default:
        return /(doors|stairs)/.test(exit.description) ? "are" : "is a"
    }
  }

  return `To the ${exit.towards} ${isA(exit)} ${exit.description}${exitNumber(areExitsSame, i)}`
}
const describeRoomFunc =
  (dungeon: Dungeon): GameStateModifier =>
  (gameState: GameState): GameState => {
    if (gameState === undefined) throw Error("gameState is undefined!")

    const currentRoom = getCurrentRoom(dungeon, gameState)
    const isVisible = isVisibleExitFunc(gameState)
    const getDoorStatuses = ((gs: GameState) => (id: number) => {
      return gs.doors.find((door) => door.id === id)?.statuses
    })(gameState)

    const exits = currentRoom.exits
      .filter(isVisible)
      .slice(0)
      .sort(sortExitsClockwise(currentRoom))
      .map((exit) => [exit, getDoorStatuses(exit.door.id)])
      .map(([exit, statuses]: [Exit, DoorStatus[]]) => ({
        ...exit,
        door: {
          ...exit.door,
          // update exit door with statuses if it exists
          ...(statuses && { statuses }),
        },
      }))
      .map((exit, i, all) => ({
        ...exit,
        description: getExitDescription(exit, i, all),
      }))

    const enemies = gameState.agents.filter(isEnemy).filter((agent) => agent.room === gameState.id)
    const notes = currentRoom.notes ?? []

    const descriptions = [
      `You are in a ${currentRoom.area} ${currentRoom.description}`,
      describeNotes(notes),
      describeAgents(enemies),
    ]

    const description = descriptions.map((d) => fmt(d, period, capitalize)).join(" ")

    const room: RoomState = { ...currentRoom, exits, description }

    return updateRoomState(room)(gameState)
  }

/** inputFunc is a higher order function that accepts a Dungeon and
 * returns a function that accepts a GameState and returns a new
 * GameState.
 *
 * `message` should make no assumptions about how it will be presented.
 * Ideally, in future, all text descriptions will be constructed by the
 * client from output data.
 * @param dungeon
 * @returns (gameState) => gameState
 */
export const inputFunc =
  (dungeon: Dungeon): GameStateModifier =>
  (oldGameState: GameState): GameState =>
    compose(
      resetState,
      advanceTurn,
      handleActionFunc(dungeon),
      describeRoomFunc(dungeon),
      enemiesAttack
    )(oldGameState, passIfEnd)

const isVisibleExitFunc = (gameState: GameState) => (exit: Exit) => {
  switch (exit.type) {
    case 6: {
      const exitDoor = gameState.doors.find((door) => door.id === exit.door.id)
      if (exitDoor && exitDoor.statuses.some((s) => s === "discovered")) return true
      return !exit.isFacing
    }
    default:
      return true
  }
}

const toOutput = (gameState: GameState): GameOutput => {
  const room = gameState.rooms.find((room) => room.id === gameState.id)
  const imperatives: [string, string][] =
    room.notes
      ?.filter((note: CuriousNote) => note.imperative)
      .filter((note) => !note.statuses?.includes("used"))
      .map((note: CuriousNote) => [note.imperative, `use ${note.object}`]) ?? []
  const output = {
    message: gameState.message,
    room: gameState.id,
    end: gameState.end,
    error: gameState.error,
    turn: gameState.turn,
    description: room.description,
    action: gameState.action,
    exits: room.exits,
    statuses: room.statuses,
    agents: gameState.agents.filter((agent) => agent.room === gameState.id),
    ...(imperatives && imperatives.length > 0 && { imperatives }),
  }
  return output
}

type GameInterface = (input: string) => GameOutput

type GameOptions = {
  initGameState?: GameState
  noCombat?: boolean
}
/** `game` is a higher-order function that accepts a Dungeon and returns a GameInterface.
 * A GameInterface is a function that accepts user input and returns the result.
 * The result is structured in a way suitable for use in presentation, called GameOutput.
 * There should be no undiscovered secrets in GameOutput.
 *
 * @param dungeon:Dungeon
 * @returns gameInterface: (input:string) => GameOutput
 */
export const game = (dungeon: Dungeon, options?: GameOptions): GameInterface => {
  // init game interface
  const interpretInput: GameStateModifier = inputFunc(dungeon)

  const initMessage: Partial<GameOutput> = {
    message: dungeon.title + "\n" + dungeon.story,
    action: "init",
  }

  const minManifest: MenaceManifest = {
    player: {
      health: 0,
      maxHealth: 0,
      attack: 0,
      defense: 0,
      statuses: [],
      inventory: [],
    },
    agents: [],
  }
  if (!dungeon.rooms || dungeon.rooms.length === 0) throw "Bad data: no rooms found"

  const dungeonAnalysis = analyzeDungeon(dungeon)
  const initAgents = options?.noCombat ? minManifest : createMenaceManifest(dungeonAnalysis)

  let gameState: GameState = options?.initGameState ?? { ...initState, ...initMessage, ...initAgents }

  const gameInterface = (action: Action | string) => {
    if (!isAction(action)) {
      throw new Error(`Unknown action ${action}`)
    }

    if (gameState.turn > 0) {
      gameState = interpretInput({ ...gameState, action })
      const output = toOutput(gameState)
      if (output.end) return toFinalGameResult(output, gameState, dungeonAnalysis)
      else return output
    } else {
      if (action !== "init") throw new Error("The first call to the game must be 'init'")
      gameState = compose(advanceTurn, describeRoomFunc(dungeon), addStatusToRoom("visited"))(gameState)
      return toOutput(gameState)
    }
  }

  return gameInterface
}

export type GameResult = ReturnType<typeof toFinalGameResult>

const toFinalGameResult = (
  output: GameOutput,
  { id, turn, player, agents, doors, action }: GameState,
  { title, treasure, isTreasure, artifact }: DungeonAnalysis
) => {
  const defeatedBy = agents
    .filter((agent) => agent.room === id)
    .filter((agent) => agent.isEnemy)
    .filter((agent) => !agent.statuses.includes("dead"))
    .map((a) => a.name)
  const enemiesDefeated = agents
    .filter((agent) => agent.isEnemy)
    .filter((agent) => agent.statuses.includes("dead"))
    .map((enemy) => enemy.name)
  const treasuresFound = player.inventory.filter(isTreasure) ?? []
  const moreTreasures = treasure.length > (treasuresFound?.length ?? 0)
  const moreSecrets = doors
    .filter((door) => door.type === DoorType.secret)
    .some((secretDoor) => !secretDoor.statuses.includes("open"))

  const artifactFound = !!artifact && player.inventory?.includes(artifact)
  const boss = agents.filter(isEnemy).find((agent) => agent.class === "boss")?.name

  // victory is boss defeated or all defeated
  const victory =
    player.health >= 0 && (enemiesDefeated.includes(boss) || enemiesDefeated?.length === agents.filter(isEnemy)?.length)

  const endResult: "victory" | "defeat" | "escape" = victory ? "victory" : player.health < 0 ? "defeat" : "escape"

  return {
    ...output,
    action,
    artifact,
    artifactFound,
    boss,
    defeatedBy,
    end: true,
    enemiesDefeated,
    moreSecrets,
    moreTreasures,
    title,
    treasuresFound,
    endResult,
    turn,
  }
}
