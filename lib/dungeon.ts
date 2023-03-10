export const exitDirections = ["north", "east", "south", "west"] as const
export type ExitDirection = (typeof exitDirections)[number]

export type Action = (typeof actions)[number] | ExitDirection
export const actions = ["quit", "noop", "search", "init", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const
export const isAction = (x: string | Action): x is Action => [...actions, ...exitDirections].some((elem) => elem === x)

/** Exit is derived from One-Page JSON data. Aids navigation. */
export type Exit = {
  towards: ExitDirection
  to: number | "outside"
  description: string
  isFacing: boolean // some doors have directions, secret doors for example
  door: Door
  type: DoorType
  note?: DoorNote
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

export type JsonNote = {
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
  notes: JsonNote[]
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

// enum compatible with Jest
export const NoteType = {
  none: "none",
  body: "body",
  container: "container",
  corpse: "corpse",
  door: "door",
  dying: "dying",
  feature: "feature",
  hovering: "hovering",
  lockedcontainer: "lockedcontainer",
  more: "more",
  remains: "remains",
  secret: "secret",
} as const

export type NoteType = (typeof NoteType)[keyof typeof NoteType]
export type NoteStatus = "searched"

export type PlainNote = JsonNote & {
  id: number
  text: string
  contains?: string
  type: NoteType
  statuses?: NoteStatus[]
}

export type Secret = PlainNote & {
  type: "secret"
  message: string
  item: string
  items: string[]
  hidden: string
}

export type Container = PlainNote & {
  type: "container"
  message: string
  item: string
  items: string[]
  container: string
  imperative: string
  pristine: string
  empty: string
}

export type Body = PlainNote & {
  type: "body" | "remains" | "dying"
  message: string
  item: string
  items: string[]
  imperative: string
  pristine: string
  empty: string
}

export type DoorNote = PlainNote & {
  type: "door"
  text: string
  door: string
  keyholes?: string
  direction: ExitDirection
}

export const isDoorNote = (note: Note): note is DoorNote => note.type === NoteType.door

export type Note = Secret | Container | PlainNote | Body | DoorNote

/** Room is an object derived from One-Page JSON data.
 * Aids navigation and presentation. */
export type Room = Rect & {
  id: number
  description: string
  area: string
  exits: Exit[]
  notes?: PlainNote[]
}
