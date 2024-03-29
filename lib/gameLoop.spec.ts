import { Action, actions, CuriousNote, Door, Dungeon, Enemy, exitDirections, JsonDungeon, Rect, Room } from "./dungeon"
import { describeAgents, game, GameOutput, GameState } from "./gameLoop"
import { parseDungeon } from "./parseDungeon"
import testDungeon from "../tests/dungeons/house_of_the_immortal_lord.json"
import dungeonRun from "../tests/dungeons/chambers_of_the_red_master.json"
import { parseNote } from "./parseNote"
import { hasProperty } from "./utilties"

const minimalDungeon: Dungeon = {
  seed: 0,
  version: "",
  title: "Minimal Title",
  story: "Minimal Story",
  rects: [],
  rooms: [],
  doors: [],
  notes: [],
  columns: [],
  water: [],
}

const minRect: Rect = {
  x: 0,
  y: 0,
  w: 1,
  h: 1,
}

const minimalRoom: Room = {
  id: 0,
  description: "minimal room.",
  area: "1x1",
  exits: [],
  notes: [],
  ...minRect,
}

const minimalWorkingDungeon: Dungeon = {
  ...minimalDungeon,
  rooms: [minimalRoom],
}

const twoRoomDungeon: JsonDungeon = {
  ...minimalDungeon,
  rects: [
    { x: 0, y: 0, w: 3, h: 3 },
    { x: 4, y: 0, w: 3, h: 3, rotunda: true }, // east room
    { x: 3, y: 2, w: 1, h: 1 },
  ], // door
  doors: [{ x: 3, y: 2, dir: { x: 1, y: 0 }, type: 0, id: 2 }] as (Door & { id: number })[],
}
const parsedDungeon = parseDungeon(testDungeon)

describe("bad data", () => {
  test("Dungeon with no rooms should error with 'Bad Data'", () => {
    expect(() => game(minimalDungeon)("init")).toThrow("Bad data: no rooms found")
  })

  test("Good dungeon with bad input should throw", () => {
    const input = game(parsedDungeon)
    input("init")
    expect(() => input("not-an-action")).toThrow("Unknown action not-an-action")
  })
})

describe("gameLoop good game()", () => {
  test("minimal working dungeon", () => {
    const input = game(minimalWorkingDungeon, { noCombat: true })
    const initOutput = input("init")
    expect(initOutput).toEqual({
      message: "Minimal Title\nMinimal Story",
      room: 0,
      end: false,
      error: undefined,
      turn: 1,
      description: expect.stringContaining("You are in a 1x1 minimal room."),
      agents: [],
      action: "init",
      exits: [],
      statuses: ["visited"],
    })
    const searchOutput = input("search")
    expect(searchOutput).toMatchObject({
      action: "search",
      message: "You search but find nothing of interest.",
      turn: 2,
      statuses: expect.arrayContaining(["searched"]),
    })
  })

  test.each(actions)("action '%s' should have result", (action) => {
    const expectedMessages: Partial<{ [key in Action]: string }> = {
      init: "Not understood.",
      search: "You search but find nothing of interest.",
      noop: undefined,
      use: "There is nothing to use here.",
      attack: "There is nothing here to attack.",
      quit: "You quit.",
      info: "You take stock of your situation. Your health is 0. Your attack is 0. Your defense is 0. Your magical power is 0. You now have nothing.",
    }
    const input = game(minimalWorkingDungeon, { noCombat: true })
    input("init")
    const actionOutput = input(action)
    const expectedMessage = hasProperty(expectedMessages, action) ? expectedMessages[action] : "You cannot go that way"
    expect(actionOutput.message).toBe(expectedMessage)
  })

  describe("Test 'info' action", () => {
    const initGameState: GameState = {
      id: 0,
      message: "",
      turn: 0,
      end: false,
      rooms: [],
      doors: [],
      player: {
        health: 1,
        defense: 1,
        attack: 1,
        maxHealth: 1,
        statuses: ["poisoned", "hallucinating", "aged"],
        inventory: ["an axe", "a helm", "an amulet", "a potion of healing", "a potion of healing"],
      },
      agents: [],
    }
    const input = game(minimalWorkingDungeon, { noCombat: true, initGameState })
    input("init")
    const infoOutput = input("info")
    expect(infoOutput.message).toBe(
      "You take stock of your situation. Your health is 1. Your attack is 3. Your defense is 3. Your magical power is 1. You are poisoned, hallucinating and aged. You now have an axe, a helm, an amulet and two potions of healing."
    )
  })

  test("Test 'use' action", () => {
    const curiousNote: CuriousNote = {
      id: 0,
      text: "A bottomless well, bursts into flames if a coin is dropped into it.",
      ref: "",
      pos: { x: 0, y: 0 },
      type: "curious",
      feature: "A bottomless well",
      object: "well",
      action: "bursts into flames",
      trigger: "a coin is dropped into it",
      message: "When you drop a coin into the well, it bursts into flames.",
      imperative: "Drop a coin into the well",
      pristine: "There is a bottomless well here.",
    }

    const noteRoom = {
      ...minimalRoom,
      notes: [curiousNote],
    }

    const useDungeon = {
      ...minimalWorkingDungeon,
      rooms: [noteRoom],
    }

    const input = game(useDungeon, { noCombat: true })
    const initOutput = input("init")
    expect(initOutput).toEqual({
      message: "Minimal Title\nMinimal Story",
      room: 0,
      end: false,
      error: undefined,
      turn: 1,
      description: expect.stringContaining("You are in a 1x1 minimal room. There is a bottomless well here."),
      agents: [],
      action: "init",
      exits: [],
      imperatives: [["Drop a coin into the well", "use well"]],
      statuses: ["visited"],
    })
    const useOutput = input("use")
    expect(useOutput).toMatchObject({
      action: "use",
      message: curiousNote.message,
    })

    // imperatives should be gone
    expect(useOutput).not.toMatchObject({
      imperatives: expect.anything(),
    })
  })

  test("Test 'use' action that disappears", () => {
    const curiousNote: CuriousNote = {
      id: 0,
      text: "A puddle of water, turns into dust when drank from.",
      ref: "",
      pos: { x: 0, y: 0 },
      type: "curious",
      feature: "A puddle of water",
      object: "water",
      action: "turns into dust",
      trigger: "drank from",
      message: "When you drink from the water, it turns into dust.",
      imperative: "Drink from the water",
      pristine: "There is a puddle of water here.",
    }

    const noteRoom = {
      ...minimalRoom,
      notes: [curiousNote],
    }

    const useDungeon = {
      ...minimalWorkingDungeon,
      rooms: [noteRoom],
    }

    const input = game(useDungeon, { noCombat: true })
    const initOutput = input("init")
    expect(initOutput).toEqual({
      message: "Minimal Title\nMinimal Story",
      room: 0,
      end: false,
      error: undefined,
      turn: 1,
      description: expect.stringContaining("You are in a 1x1 minimal room. There is a puddle of water here."),
      agents: [],
      action: "init",
      exits: [],
      imperatives: [["Drink from the water", "use water"]],
      statuses: ["visited"],
    })
    const useOutput = input("use")
    expect(useOutput).toMatchObject({
      action: "use",
      message: curiousNote.message,
      description: expect.stringContaining("You are in a 1x1 minimal room."),
    })
  })

  const minNote = {
    id: 0,
    text: "",
    ref: "",
    pos: {
      x: 0,
      y: 0,
    },
  }

  test("Test 'use' action that spawns", () => {
    const curiousNote = parseNote({
      ...minNote,
      text: "A creepy doll, spawns a book of protection when picked up.",
    }) as CuriousNote

    const noteRoom = {
      ...minimalRoom,
      notes: [curiousNote],
    }

    const useDungeon = {
      ...minimalWorkingDungeon,
      rooms: [noteRoom],
    }

    const input = game(useDungeon, { noCombat: true })
    const initOutput = input("init")
    expect(initOutput).toMatchObject({
      description: expect.stringContaining("You are in a 1x1 minimal room. There is a creepy doll here."),
    })

    const useOutput = input("use")
    expect(useOutput).toMatchObject({
      action: "use",
      message: expect.stringContaining(`${curiousNote.message} You now have a book of protection and a creepy doll`),
      description: expect.stringContaining("You are in a 1x1 minimal room."),
    })
  })

  test("Test 'use' action that teleports", () => {
    const curiousNote = parseNote({
      text: "A pool of dark water, teleports a person outside the stronghold when drank from.",
      pos: { x: 5, y: 1 },
      ref: "1",
      id: 0,
    }) as CuriousNote

    const teleportDungeon = parseDungeon({ ...twoRoomDungeon, notes: [curiousNote] })

    const input = game(teleportDungeon, { noCombat: true })
    const initOutput = input("init")
    expect(initOutput).toMatchObject({ description: expect.stringContaining("You are in a 3m x 3m square room.") })

    const eastOutput = input("east")
    expect(eastOutput).toMatchObject({
      description: expect.stringContaining("You are in a 3m across round room. There is a pool of dark water here."),
    })

    const useOutput = input("use")
    expect(useOutput).toMatchObject({
      action: "use",
      message: `${curiousNote.message} You return, and enter.`,
      description: expect.stringContaining("You are in a 3m x 3m square room."),
    })
  })

  test("Loading dungeon should not throw an error", () => {
    expect(() => game(parsedDungeon as Dungeon)).not.toThrow()
  })

  test("Should error if first input is not 'init'", () => {
    const input = game(parsedDungeon)
    expect(() => input("noop")).toThrow("The first call to the game must be 'init'")
  })

  test("Should not error if first input is 'init'", () => {
    const input = game(parsedDungeon)
    expect(() => input("init")).not.toThrow()
  })

  test("First output should welcome properly", () => {
    const input = game(parsedDungeon, { noCombat: true })
    const firstOutput = {
      message:
        "House of the Immortal Lord\nThe house of the Immortal Lord is situated high in the Mondjit mountains. Lately a huge mutant rabbit has made its lair here. It is rumored that the house is rich with gold and jewels and magical artifacts.",
      room: 0,
      end: false,
      turn: 1,
      description: expect.stringContaining("You are in a 3m x 4m room."),
      agents: [],
      action: "init",
      exits: [
        {
          towards: "north",
          isFacing: false,
          to: "outside",
          type: 3,
          door: { id: 6, x: 0, y: 0, dir: { x: 0, y: 1 }, type: 3 },
          description: "To the north is a way out of the dungeon",
        },
        {
          towards: "east",
          isFacing: true,
          to: 1,
          type: 1,
          door: { id: 7, x: 2, y: 3, dir: { x: 1, y: 0 }, type: 1 },
          description: "To the east is a door",
        },
        {
          towards: "west",
          isFacing: true,
          to: 2,
          type: 1,
          door: { id: 8, x: -2, y: 3, dir: { x: -1, y: 0 }, type: 1 },
          description: "To the west is a door",
        },
      ],
      statuses: ["visited"],
    }
    const output = input("init")
    expect(output).toEqual(firstOutput)
  })

  describe.each([...exitDirections, ...actions])("Action %s:", (action) => {
    let input
    beforeEach(() => {
      input = game(parsedDungeon, { noCombat: true })
      input("init")
    })

    test(`Action '${action}' of room 0 should return expected output`, () => {
      const output = input(action)
      expect(output).toMatchObject({ action: action, turn: 2 })
    })
  })

  describe("search action", () => {
    let input
    beforeEach(() => {
      input = game(parsedDungeon, { noCombat: true })
      input("init")
    })

    test("search should reveal secret door and allow exit", () => {
      // first move to the room with the secret door
      input("east")

      const openOutput = input("search")
      expect(openOutput.message).toMatch(/You open the crate/)
      // moving in the direction of the secret door should fail
      const northOutput: GameOutput = input("north")
      expect(northOutput.message).toBe("You cannot go that way")
      expect(northOutput.exits.length).toBe(1)

      const searchOutput = input("search")
      expect(searchOutput.message).toBe("You search along the northern wall and discover a secret door!")
      expect(searchOutput.exits.length).toBe(2)

      // moving in the direction of the secret door should now succeed
      const secretOutput = input("north")
      expect(secretOutput.message).toBe("You go north.")
    })

    test("unsuccessful search should give 'searched' status", () => {
      // move to the room with the secret doors
      input("east")

      // search the crate
      input("search")

      // discover both secret doors
      input("search")
      input("search")

      const output = input("search")
      expect(output.message).toMatch(/You search but find nothing( else)? of interest./)
      expect(output.statuses).toContain("searched")
    })
  })

  describe("door status", () => {
    let input
    beforeEach(() => {
      input = game(parsedDungeon, { noCombat: true })
    })

    test("un-entered door should not have 'open' status", () => {
      const output: GameOutput = input("init")
      const eastDoor = output.exits.find((exit) => exit.towards === "east")?.door
      expect(eastDoor?.statuses ?? []).not.toContain("open")
    })

    test("entered door should have 'open' status", () => {
      input("init")
      const output: GameOutput = input("east")
      const westExit = output.exits.find((exit) => exit.towards === "west")
      expect(westExit).toBeDefined()
      expect(westExit?.door.statuses).toContain("open")
      expect(westExit?.description).toBe("To the west is an open door")
    })
  })

  describe("combat", () => {
    test("basic combat", () => {
      const enemy: Enemy = {
        id: 0,
        room: 1,
        name: "an enemy",
        health: 0,
        attack: 0,
        class: "monster",
        inventory: [],
        defense: 0,
        statuses: [],
        isEnemy: true,
      }
      const initGameState: GameState = {
        id: 0,
        message: "Minimal Title\nMinimal Story",
        turn: 0,
        end: false,
        rooms: [],
        doors: [],
        player: {
          health: 1000,
          defense: 1000,
          maxHealth: 1000,
          attack: 1000,
          statuses: [],
          inventory: [],
        },
        agents: [enemy],
      }

      const combatDungeon = parseDungeon(twoRoomDungeon)
      const input = game(combatDungeon, { initGameState, noCombat: true })
      input("init")
      const eastOutput = input("east")
      expect(eastOutput).toMatchObject({
        agents: expect.arrayContaining([
          expect.objectContaining({
            id: 0,
            isEnemy: true,
            message: expect.stringContaining("The enemy attacks you and"),
          }),
        ]),
      })
      const attackOutput = input("attack 0")
      expect(attackOutput).toMatchObject({
        message: expect.stringContaining("The enemy is dead."),
        description: expect.stringContaining("A corpse of an enemy is here"),
        agents: expect.arrayContaining([
          expect.objectContaining({ id: 0, isEnemy: true, statuses: expect.arrayContaining(["dead"]) }),
        ]),
      })
    })

    test("fleeing combat", () => {
      const enemy: Enemy = {
        id: 0,
        room: 0,
        name: "an enemy",
        health: 1000,
        attack: 1000,
        class: "monster",
        inventory: [],
        defense: 1000,
        statuses: [],
        isEnemy: true,
      }

      const enemies = new Array(10).fill(enemy).map((enemy, id) => ({ ...enemy, id }))
      const initGameState: GameState = {
        id: 0,
        message: "Minimal Title\nMinimal Story",
        turn: 0,
        end: false,
        rooms: [],
        doors: [],
        player: {
          health: 1,
          maxHealth: 1,
          defense: 1,
          attack: 1,
          statuses: [],
          inventory: [],
        },
        agents: enemies,
      }

      const combatDungeon = parseDungeon(twoRoomDungeon)
      const input = game(combatDungeon, { initGameState, noCombat: true })
      const initInput = input("init")
      expect(initInput.end).toBe(false)
      expect(initInput.description).toContain("Ten enemies are here.")
      const eastOutput = input("east")
      expect(eastOutput.room).toBe(0)
      expect(eastOutput.end).toBe(true)
      expect(eastOutput.message).toContain("You succumb to the attack and die.")
    })
  })

  describe("dungeon run: Chambers of The Red Master", () => {
    const parsedDungeon = parseDungeon(dungeonRun)
    const gameInterface = game(parsedDungeon, { noCombat: true })
    const expectations: [string, string][] = [
      [
        "init",
        "Chambers of the Red Master\nLong after the Red Master's demise the chambers remained deserted. These days they are badly infested by ants, which don't care about the past of the place.",
      ],
      ["south", "You go south"],
      ["south", "You go south"],
      ["east", "You go east"],
      ["search", "You approach the iron key hovering in the middle of the hall and take it. You now have an iron key"],
      ["west", "You go west"],
      ["west", "You go west"],
      ["west", "You go west"],
      ["search", "You open the large chest and find an iron key. You now have two iron keys"],
      ["north", "You go north"],
      ["1", "You go north"],
      ["north", "You go north"],
      ["north", "You go north"],
      ["west", "You go west"],
      [
        "north",
        "You attempt to go north but the lavishly decorated wooden gate is locked. It has four keyholes but you have only two iron keys.",
      ],
      ["east", "You go east"],
      ["south", "You go south"],
      ["south", "You go south"],
      ["south", "You go south"],
    ]

    test.each(expectations)("%s should output %s", (input, expectedMessage) => {
      const { message } = gameInterface(input)
      expect(message).toContain(expectedMessage)
    })
  })
})

describe("group agents", () => {
  test("should properly describe live agents", () => {
    const waspAgents: Enemy[] = [
      {
        id: 1,
        name: "a giant, soul-eating wasp",
        class: "monster",
        room: 1,
        health: 4,
        attack: 2,
        defense: 4,
        statuses: [],
        inventory: [],
        isEnemy: true,
      },
      {
        id: 7,
        name: "a wasp-man",
        class: "peon",
        room: 1,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: [],
        inventory: [],
        isEnemy: true,
      },
      {
        id: 8,
        name: "a wasp-man",
        class: "peon",
        room: 1,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: [],
        inventory: ["some gold"],
        isEnemy: true,
      },
    ]

    const agentDescriptions = describeAgents(waspAgents)
    expect(agentDescriptions).toBe("A giant, soul-eating wasp and two wasp-men are here.")
  })

  test("should properly describe a single, live agent", () => {
    const enemy: Enemy[] = [
      {
        id: 13,
        name: "a gnoll",
        class: "peon",
        room: 2,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: [],
        inventory: [],
        isEnemy: true,
      },
    ]
    const agentDescriptions = describeAgents(enemy)
    expect(agentDescriptions).toBe("A gnoll is here.")
  })

  test("should properly describe a single, dead agent", () => {
    const enemy: Enemy[] = [
      {
        id: 13,
        name: "a gnoll",
        class: "peon",
        room: 2,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: ["dead"],
        inventory: [],
        isEnemy: true,
      },
    ]
    const agentDescriptions = describeAgents(enemy)
    expect(agentDescriptions).toBe("A corpse of a gnoll is here.")
  })

  test("should properly describe two dead agents", () => {
    const enemy: Enemy[] = [
      {
        id: 13,
        name: "a gnoll",
        class: "peon",
        room: 2,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: ["dead"],
        inventory: [],
        isEnemy: true,
      },
      {
        id: 14,
        name: "a gnoll",
        class: "peon",
        room: 2,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: ["dead"],
        inventory: [],
        isEnemy: true,
      },
    ]
    const agentDescriptions = describeAgents(enemy)
    expect(agentDescriptions).toBe("The corpses of two gnolls are here.")
  })

  test("should properly describe two dead agents, one of them looted", () => {
    const enemy: Enemy[] = [
      {
        id: 13,
        name: "a gnoll",
        class: "peon",
        room: 2,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: ["dead"],
        inventory: [],
        isEnemy: true,
      },
      {
        id: 14,
        name: "a gnoll",
        class: "peon",
        room: 2,
        health: 1,
        attack: 1,
        defense: 1,
        statuses: ["dead", "searched"],
        inventory: [],
        isEnemy: true,
      },
    ] as Enemy[]
    const agentDescriptions = describeAgents(enemy)
    expect(agentDescriptions).toBe("A corpse of a gnoll and a looted corpse of a gnoll are here.")
  })
})
