import { actions, Dungeon, exitDirections } from "./dungeon"
import { game, GameOutput } from "./gameLoop"
import { parseDungeon } from "./parseDungeon"
import testDungeon from "../tests/house_of_the_immortal_lord.json"

const minimalDungeon: Dungeon = {
  version: "",
  title: "",
  story: "",
  rects: [],
  rooms: [],
  doors: [],
  notes: [],
  columns: [],
  water: [],
}

const parsedDungeon = parseDungeon(testDungeon)

describe("gameLoop bad game()", () => {
  test("Dungeon with no rooms should error with 'Bad Data'", () => {
    expect(() => game(minimalDungeon)("init")).toThrow("Bad data: room 0 not found")
  })

  test("Good dungeon with bad input should throw", () => {
    const input = game(parsedDungeon)
    input("init")
    expect(() => input("not-an-action")).toThrow("Unknown action not-an-action")
  })
})

describe("gameLoop good game()", () => {
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
    const input = game(parsedDungeon)
    const firstOutput = {
      message:
        "House of the Immortal Lord\nThe house of the Immortal Lord is situated high in the Mondjit mountains. Lately a huge mutant rabbit has made its lair here. It is rumored that the house is rich with gold and jewels and magical artifacts.",
      room: 0,
      end: false,
      turn: 1,
      description: "You are in a 3m x 4m room. ",
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
      input = game(parsedDungeon)
      input("init")
    })

    test(`${action} of room 0 should return expected output`, () => {
      const output = input(action)
      expect(output).toMatchObject({ action: action, turn: 2, statuses: expect.arrayContaining(["visited"]) })
    })
  })

  describe("search action", () => {
    let input
    beforeEach(() => {
      input = game(parsedDungeon)
      input("init")
    })

    test("search should reveal secret door and allow exit", () => {
      // first move to the room with the secret door
      input("east")

      // moving in the direction of the secret door should fail
      const northOutput: GameOutput = input("north")
      expect(northOutput.message).toBe("You cannot go that way")
      expect(northOutput.exits.length).toBe(1)

      const searchOutput = input("search")
      expect(searchOutput.message).toBe("You discover a secret door to the north!")
      expect(searchOutput.exits.length).toBe(2)

      // moving in the direction of the secret door should now succeed
      const secretOutput = input("north")
      expect(secretOutput.message).toBe("You go north")
    })

    test("unsuccessful search should give 'searched' status", () => {
      // move to the room with the secret doors
      input("east")

      // discover both secret doors
      input("search")
      input("search")

      const output = input("search")
      expect(output.message).toBe("You find nothing else of interest.")
      expect(output.statuses).toContain("searched")
    })
  })

  describe("door status", () => {
    let input
    beforeEach(() => {
      input = game(parsedDungeon)
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
      expect(westExit!.door.statuses).toContain("open")
      expect(westExit!.description).toBe("To the west is an open door")
    })
  })
})
