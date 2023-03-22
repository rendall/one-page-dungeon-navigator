import { hasProperty } from "./utilties"

export const exitDirections = ["north", "east", "south", "west"] as const
export type ExitDirection = (typeof exitDirections)[number]

export type Action = (typeof actions)[number] | ExitDirection
export const actions = [
  "quit",
  "attack",
  "use",
  "noop",
  "search",
  "init",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const
export const isAction = (input: string | Action): input is Action =>
  [...actions, ...exitDirections].some((elem) => elem === input) ||
  (input.includes(" ") && isAction(input.split(" ")[0]))

/** Exit is derived from One-Page JSON data. Aids navigation. */
export type Exit = {
  towards: ExitDirection
  to: number | "outside"
  description: string
  isFacing: boolean // some doors have directions, secret doors for example
  door: Door & { id: number }
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
  seed?: number
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
  rects: (Rect & { id: number })[]
  rooms: (Room & { id: number })[]
  doors: (Door & { id: number })[]
}

// enum compatible with Jest
export const NoteType = {
  body: "body",
  container: "container",
  corpse: "corpse",
  door: "door",
  dying: "dying",
  feature: "feature",
  hovering: "hovering",
  lockedcontainer: "lockedcontainer",
  more: "more",
  none: "none",
  remains: "remains",
  secret: "secret",
  curious: "curious",
} as const

export type NoteType = (typeof NoteType)[keyof typeof NoteType]
export type NoteStatus = "searched" | "used" | "gone"

export type PlainNote = JsonNote & {
  id: number
  text: string
  contains?: string
  type: NoteType
  statuses?: NoteStatus[]
}

export type SecretNote = PlainNote & {
  type: "secret"
  message: string
  item: string
  items: string[]
  hidden: string
}

export type ContainerNote = PlainNote & {
  type: "container"
  message: string
  item: string
  items: string[]
  container: string
  imperative: string
  pristine: string
  empty: string
}

export type BodyNote = PlainNote & {
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

export type CuriousNote = PlainNote & {
  action: string
  feature: string
  imperative: string
  message: string
  object: string
  pristine: string
  trigger: string
  type: "curious"
}

export const isDoorNote = (note: Note): note is DoorNote => note.type === NoteType.door
export const isCuriousNote = (note: Note): note is CuriousNote => note.type === NoteType.curious
export const isItemNote = (note: Note): note is SecretNote | ContainerNote | BodyNote =>
  hasProperty(note, "items", (value) => value !== undefined)

export type Note = SecretNote | ContainerNote | PlainNote | BodyNote | DoorNote | CuriousNote

/** Room is an object derived from One-Page JSON data.
 * Aids navigation and presentation. */
export type Room = Rect & {
  id: number
  description: string
  area: string
  exits: Exit[]
  notes?: PlainNote[]
}

export type MortalStatus = "dead"

export type Mortal = {
  health: number
  attack: number
  defense: number
  statuses: MortalStatus[]
}

export type Player = Mortal

export type Agent = Mortal & {
  id: number
  name: string
  room: number
  message?: string
  inventory: string[]
  isEnemy?: boolean
}

export type EnemyStatus =
  | MortalStatus
  | "spectral"
  | "fire-breathing"
  | "venomous"
  | "invisible"
  | "undead"
  | "giant"
  | "searched"

export type Enemy = Agent & {
  class: "boss" | "monster" | "elite" | "peon"
  statuses: EnemyStatus[]
  isEnemy: true
}

export const isPlayer = (mortal: Mortal): mortal is Player => !("id" in mortal)
export const isAgent = (mortal: Mortal): mortal is Agent => "id" in mortal
export const isEnemy = (agent: Agent): agent is Enemy => "isEnemy" in agent && agent.isEnemy === true
