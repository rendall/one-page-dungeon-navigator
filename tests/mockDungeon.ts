/** MockDungeon can be visualized in a cross pattern with a 3x3
 * central room and neighboring rooms to each cardinal direction.*/
import { Door, JsonDungeon, Rect } from "../lib/dungeon"

export const centerRoom: Rect = {
  x: -1, // 1 unit to the left of the center (0,0)
  y: -1, // 1 unit up from the center (0,0)
  w: 3,
  h: 3,
  rotunda: true,
}

export const eastDoorRect: Rect = {
  x: 2,
  y: 0,
  w: 1,
  h: 1,
}

export const eastDoor: Door = {
  x: 2,
  y: 0,
  id: 0,
  dir: {
    x: 1,
    y: 0,
  },
  type: 0,
}

export const eastRoom: Rect = {
  x: 3, // 1 unit to the right of the eastDoor's right edge (2,0)
  y: -1, // Aligned with the center room's top edge (on the midline)
  w: 4,
  h: 4,
}

export const westDoorRect: Rect = {
  x: -2,
  y: 0,
  w: 1,
  h: 1,
}

export const westDoor: Door = {
  x: -2,
  y: 0,
  id: 0,
  dir: {
    x: -1,
    y: 0,
  },
  type: 0,
}

export const westRoom: Rect = {
  x: -6, // 4 units to the left of the westDoor's left edge (-2,0)
  y: -2, // 1 unit up from the midline
  w: 4,
  h: 3,
}

export const northDoorRect: Rect = {
  x: 0,
  y: -2,
  w: 1,
  h: 1,
}

export const northDoor: Door = {
  x: 0,
  y: -2,
  id: 0,
  dir: {
    x: 0,
    y: -1,
  },
  type: 0,
}

export const northRoom: Rect = {
  x: -1, // Aligned with the center room's left edge (on the midline)
  y: -5, // 3 units above the northDoor's top edge (0,-2)
  w: 3,
  h: 3,
}

const northOutDoorRect: Rect = {
  x: 0,
  y: -6,
  w: 1,
  h: 1,
}

export const northOutDoor: Door = {
  x: 0,
  y: -6,
  id: 0,
  dir: {
    x: 0,
    y: -1,
  },
  type: 0,
}

export const southDoorRect: Rect = {
  x: 0,
  y: 2,
  w: 1,
  h: 1,
}

export const southDoor: Door = {
  x: 0,
  y: 2,
  id: 0,
  dir: {
    x: 0,
    y: 1,
  },
  type: 0,
}

export const southRoom: Rect = {
  x: -1, // Aligned with the center room's left edge (on the midline)
  y: 3, // 1 unit below the southDoor's bottom edge (0,2)
  w: 3,
  h: 3,
}

export const mockDungeon: JsonDungeon = {
  version: "1",
  title: "Mock Dungeon",
  story: "Mock Dungeon Story",
  rects: [
    centerRoom,
    northRoom,
    southRoom,
    eastRoom,
    westRoom,
    northDoorRect,
    southDoorRect,
    eastDoorRect,
    westDoorRect,
    northOutDoorRect,
  ],
  doors: [northDoor, southDoor, eastDoor, westDoor, northOutDoor],
  notes: [],
  columns: [],
  water: [],
}
