import { Dungeon } from "./dungeon"
import { game } from "./gameLoop"
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

describe("gameLoop game()", () => {
  test("Dungeon with no rooms should error with 'Bad Data'", () => {
    expect(() => game(minimalDungeon)("init")).toThrow("Bad data: room 0 not found")
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
      action: "init",
      description: "You are in a 3m x 1m hallway.  ",
      end: false,
      error: undefined,
      exits: [
        {
          description: "To the east is a dim passage",
          door: { dir: { x: 1, y: 0 }, id: 18, type: 0, x: 4, y: 0 },
          isFacing: true,
          to: 1,
          towards: "east",
          type: 0,
        },
        {
          description: "To the west is a way out of the dungeon",
          door: { dir: { x: 1, y: 0 }, id: 17, type: 3, x: 0, y: 0 },
          isFacing: false,
          to: "outside",
          towards: "west",
          type: 3,
        },
      ],
      message:
        "Test Dungeon\nThe Test Dungeon is situated on a distant island. Recently an undead soul-sucking goat has made its lair here.",
      room: 0,
      statuses: ["visited"],
      turn: 1,
    }
    const output = input("init")
    expect(output).toEqual(firstOutput)
  })
})
