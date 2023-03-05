export const exitDirections = ["north", "east", "south", "west", "UNKNOWN"] as const
export type ExitDirection = (typeof exitDirections)[number]

/** Exit is derived from One-Page JSON data. Aids navigation. */
export type Exit = {
  towards: ExitDirection
  to: number | "outside"
  description: string
  isFacing: boolean // some doors have directions, secret doors for example
  door: Door
  type?: DoorType
}

export enum DoorType {
  open,
  door,
  narrow,
  out,
  portcullis,
  double,
  secret,
  steel,
  down,
  stairwell,
}

export type Rect = {
  x: number
  y: number
  w: number
  h: number
  ending?: boolean
  rotunda?: boolean
}

export type Door = {
  id: number
  x: number
  y: number
  dir: Direction
  type: number
}

export type Note = {
  text: string
  ref: string
  pos: { x: number; y: number }
}

export type Column = {
  x: number
  y: number
}

export type Water = {
  x: number
  y: number
}

/** Dungeon is a navigable object derived from One-Page Dungeon's
 * JSON object */
export type JsonDungeon = {
  version: string
  title: string
  story: string
  rects: Rect[]
  doors: { x: number; y: number; dir: { x: number; y: number }; type: number }[]
  notes: Note[]
  columns: Column[]
  water: Water[]
}

export type Direction = {
  x: 1 | 0 | -1
  y: 1 | 0 | -1
}

export type Dungeon = JsonDungeon & {
  rooms: Room[]
  doors: Door[]
}

/** Room is an object derived from One-Page JSON data.
 * Aids navigation and presentation. */
export type Room = Rect & {
  id: number
  description: string
  area: string
  exits: Exit[]
  contains?: string
}
