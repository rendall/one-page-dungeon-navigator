import { isOpposite, parseDungeon } from "./parseDungeon"
import {
  centerRoom,
  eastDoor,
  eastRoom,
  mockDungeon,
  northDoor,
  northRoom,
  southDoor,
  southRoom,
  westDoor,
  westRoom,
} from "../tests/mockDungeon"
import { Dungeon } from "./dungeon"

test("parseDungeon() parses as expected", () => {
  const dungeon = parseDungeon(mockDungeon)
  expect(dungeon).toEqual(expectedParsedMockDungeon)
})

describe("isOpposite() with valid directions", () => {
  test("should return true for eastRoom opposite to centerRoom across eastDoor", () => {
    expect(isOpposite(eastRoom, centerRoom, eastDoor)).toBe(true)
  })

  test("should return true for westRoom opposite to centerRoom across westDoor", () => {
    expect(isOpposite(westRoom, centerRoom, westDoor)).toBe(true)
  })

  test("should return true for northRoom opposite to centerRoom across northDoor", () => {
    expect(isOpposite(northRoom, centerRoom, northDoor)).toBe(true)
  })

  test("should return true for southRoom opposite to centerRoom across southDoor", () => {
    expect(isOpposite(southRoom, centerRoom, southDoor)).toBe(true)
  })

  test("should return true for centerRoom opposite to eastRoom across eastDoor", () => {
    expect(isOpposite(centerRoom, eastRoom, eastDoor)).toBe(true)
  })

  test("should return true for centerRoom opposite to westRoom across westDoor", () => {
    expect(isOpposite(centerRoom, westRoom, westDoor)).toBe(true)
  })

  test("should return true for centerRoom opposite to northRoom across northDoor", () => {
    expect(isOpposite(centerRoom, northRoom, northDoor)).toBe(true)
  })

  test("should return true for centerRoom opposite to southRoom across southDoor", () => {
    expect(isOpposite(centerRoom, southRoom, southDoor)).toBe(true)
  })
})

describe("isOpposite with invalid directions", () => {
  test("should return false for northRoom opposite to centerRoom across southDoor", () => {
    expect(isOpposite(northRoom, centerRoom, southDoor)).toBe(false)
  })

  test("should return false for southRoom opposite to centerRoom across northDoor", () => {
    expect(isOpposite(southRoom, centerRoom, northDoor)).toBe(false)
  })

  test("should return false for eastRoom opposite to centerRoom across westDoor", () => {
    expect(isOpposite(eastRoom, centerRoom, westDoor)).toBe(false)
  })

  test("should return false for westRoom opposite to centerRoom across eastDoor", () => {
    expect(isOpposite(westRoom, centerRoom, eastDoor)).toBe(false)
  })
})

const expectedParsedMockDungeon: Dungeon = {
  version: "1",
  title: "Mock Dungeon",
  story: "Mock Dungeon Story",
  rects: [
    {
      id: 0,
      x: -1,
      y: -1,
      w: 3,
      h: 3,
      rotunda: true,
    },
    {
      id: 1,
      x: -1,
      y: -5,
      w: 3,
      h: 3,
    },
    {
      id: 2,
      x: -1,
      y: 3,
      w: 3,
      h: 3,
    },
    {
      id: 3,
      x: 3,
      y: -1,
      w: 4,
      h: 4,
    },
    {
      id: 4,
      x: -6,
      y: -2,
      w: 4,
      h: 3,
    },
    {
      id: 5,
      x: 0,
      y: -2,
      w: 1,
      h: 1,
    },
    {
      id: 6,
      x: 0,
      y: 2,
      w: 1,
      h: 1,
    },
    {
      id: 7,
      x: 2,
      y: 0,
      w: 1,
      h: 1,
    },
    {
      id: 8,
      x: -2,
      y: 0,
      w: 1,
      h: 1,
    },
    {
      id: 9,
      x: 0,
      y: -6,
      w: 1,
      h: 1,
    },
  ],
  doors: [
    {
      id: 0,
      x: 0,
      y: -2,
      dir: {
        x: 0,
        y: -1,
      },
      type: 0,
    },
    {
      id: 0,
      x: 0,
      y: 2,
      dir: {
        x: 0,
        y: 1,
      },
      type: 0,
    },
    {
      id: 0,
      x: 2,
      y: 0,
      dir: {
        x: 1,
        y: 0,
      },
      type: 0,
    },
    {
      id: 0,
      x: -2,
      y: 0,
      dir: {
        x: -1,
        y: 0,
      },
      type: 0,
    },
    {
      id: 0,
      x: 0,
      y: -6,
      dir: {
        x: 0,
        y: -1,
      },
      type: 0,
    },
  ],
  notes: [],
  columns: [],
  water: [],
  rooms: [
    {
      id: 0,
      description: "round room.",
      area: "3m across",
      exits: [
        {
          towards: "north",
          isFacing: true,
          to: 1,
          type: 0,
          door: {
            id: 0,
            x: 0,
            y: -2,
            dir: {
              x: 0,
              y: -1,
            },
            type: 0,
          },
          description: "square room",
        },
        {
          towards: "east",
          isFacing: true,
          to: 3,
          type: 0,
          door: {
            id: 0,
            x: 2,
            y: 0,
            dir: {
              x: 1,
              y: 0,
            },
            type: 0,
          },
          description: "square room",
        },
        {
          towards: "south",
          isFacing: true,
          to: 2,
          type: 0,
          door: {
            id: 0,
            x: 0,
            y: 2,
            dir: {
              x: 0,
              y: 1,
            },
            type: 0,
          },
          description: "square room",
        },
        {
          towards: "west",
          isFacing: true,
          to: 4,
          type: 0,
          door: {
            id: 0,
            x: -2,
            y: 0,
            dir: {
              x: -1,
              y: 0,
            },
            type: 0,
          },
          description: "room",
        },
      ],
      x: -1,
      y: -1,
      w: 3,
      h: 3,
      notes: [],
    },
    {
      id: 1,
      description: "square room.",
      area: "3m x 3m",
      exits: [
        {
          towards: "north",
          isFacing: true,
          to: "outside",
          type: 0,
          door: {
            id: 0,
            x: 0,
            y: -6,
            dir: {
              x: 0,
              y: -1,
            },
            type: 0,
          },
          description: "way out of the dungeon",
        },
        {
          towards: "south",
          isFacing: false,
          to: 0,
          type: 0,
          door: {
            id: 0,
            x: 0,
            y: -2,
            dir: {
              x: 0,
              y: -1,
            },
            type: 0,
          },
          description: "round room",
        },
      ],
      x: -1,
      y: -5,
      w: 3,
      h: 3,
      notes: [],
    },
    {
      id: 2,
      description: "square room.",
      area: "3m x 3m",
      exits: [
        {
          towards: "north",
          isFacing: false,
          to: 0,
          type: 0,
          door: {
            id: 0,
            x: 0,
            y: 2,
            dir: {
              x: 0,
              y: 1,
            },
            type: 0,
          },
          description: "round room",
        },
      ],
      x: -1,
      y: 3,
      w: 3,
      h: 3,
      notes: [],
    },
    {
      id: 3,
      description: "square room.",
      area: "4m x 4m",
      exits: [
        {
          towards: "west",
          isFacing: false,
          to: 0,
          type: 0,
          door: {
            id: 0,
            x: 2,
            y: 0,
            dir: {
              x: 1,
              y: 0,
            },
            type: 0,
          },
          description: "round room",
        },
      ],
      x: 3,
      y: -1,
      w: 4,
      h: 4,
      notes: [],
    },
    {
      id: 4,
      description: "room.",
      area: "4m x 3m",
      exits: [
        {
          towards: "east",
          isFacing: false,
          to: 0,
          type: 0,
          door: {
            id: 0,
            x: -2,
            y: 0,
            dir: {
              x: -1,
              y: 0,
            },
            type: 0,
          },
          description: "round room",
        },
      ],
      x: -6,
      y: -2,
      w: 4,
      h: 3,
      notes: [],
    },
  ],
}
