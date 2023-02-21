export type ExitDirection = "north" | "east" | "south" | "west" | "UNKNOWN";
export type Exit = {
  towards: ExitDirection;
  to: number | "outside";
  description: string;
  type?: number;
};

export type Direction = {
  x: 1 | 0 | -1;
  y: 1 | 0 | -1;
};
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  ending?: boolean;
  rotunda?: boolean;
};

export type Door = {
  x: number;
  y: number;
  dir: Direction;
  type: number;
};

export type Note = {
  text: string;
  ref: string;
  pos: { x: number; y: number };
};

export type Column = {
  x: number;
  y: number;
};

export type Water = {
  x: number;
  y: number;
};

export type Dungeon = {
  version: string;
  title: string;
  story: string;
  rects: Rect[];
  doors: Door[];
  notes: Note[];
  columns: Column[];
  water: Water[];
  rooms?: Room[];
};

export type Room = Rect & {
  id: number;
  description: string;
  area: string;
  exits: Exit[];
}