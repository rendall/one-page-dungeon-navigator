import { Dungeon, exitDirections } from "./dungeon"
import { actions, game, GameOutput } from "./gameLoop"
import { parseDungeon } from "./parseDungeon"
import testDungeon from "../tests/test_dungeon.json"

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
        "Test Dungeon\nFor several centuries the Test Dungeon remained sealed. These days it is badly infested by goats.",
      room: 0,
      end: false,
      turn: 1,
      description: "You are in a 7m x 6m room. Here is a mouth-shaped stone double door with a keyhole to the west. ",
      action: "init",
      exits: [
        {
          towards: "south",
          isFacing: false,
          to: "outside",
          type: 3,
          door: { id: 4, x: 0, y: 0, dir: { x: 0, y: -1 }, type: 3 },
          description: "To the south is a way out of the dungeon",
        },
        {
          towards: "west",
          isFacing: true,
          to: 1,
          type: 5,
          door: { id: 5, x: -4, y: -1, dir: { x: -1, y: 0 }, type: 5 },
          description: "To the west are double doors",
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
      const eastOutput: GameOutput = input("east")
      expect(eastOutput.message).toBe("You cannot go that way")
      expect(eastOutput.exits.length).toBe(2)

      const searchOutput = input("search")
      expect(searchOutput.message).toBe("You discover a secret door to the east!")
      expect(searchOutput.exits.length).toBe(3)

      const secretOutput = input("east")
      expect(secretOutput.message).toBe("You go east")
    })

    test("second search should give 'searched' status", () => {
      input("search")
      const output = input("search")
      expect(output.message).toBe("You find nothing else of interest.")
      expect(output.statuses).toContain("searched")
    })
  })
})
