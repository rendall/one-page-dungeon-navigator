import type {
  Column,
  Door,
  Dungeon,
  Exit,
  ExitDirection,
  Rect,
  Room,
  Water,
} from "./dungeon";

export const facingDirection = (door:Door):ExitDirection => {
  if (door.dir.x === -1) return "west"
  if (door.dir.y === 1) return "south"
  if (door.dir.x === 1) return "east"
  if (door.dir.y === -1) return "north"
  return "UNKNOWN"
}

const describeDoor = (
  door: Door,
  direction: ExitDirection,
  destination: Rect | "outside"
): string | number => {
  const isFacing = facingDirection(door) === direction
  switch (door.type) {
    case 0:
      // These are open entrances where the area beyond is clearly visible
      const roomBeyond = getRoomNoun(destination, []);
      return roomBeyond;
    case 1:
      return "door";
    case 2:
      return "narrow entrance to a " + getRoomNoun(destination, []);
    case 3:
      return "way out of the dungeon";
    case 4:
      return "portcullis";
    case 5:
      return "double doors";
    case 6: {
      return isFacing ? "secret door" : "door";
    }
    case 8:
      return "broad stairs down";
    case 9: {
      return `stairs ${isFacing ? "down" : "up"}`;
    }

    default:
      console.warn(`Unknown door type ${door.type}`);
      return "portal";
  }
};
const describeRoom = (
  room: Rect,
  exits: Exit[],
  columns?: Column[],
  water?: Water[]
): string => {
  const noun = getRoomNoun(room, exits);
  const columnDesc =
    columns && columns.length > 0
      ? room.rotunda
        ? `- ${columns.length} columns ring the center of the room `
        : `- two rows of ${Math.floor(
            columns.length / 2
          )} columns support the ceiling `
      : "";
  const waterDesc =
    water && water.length > 0
      ? water.length === room.h * room.w
        ? `- water entirely covers the floor`
        : `- water covers part of the floor (${Math.floor(
            100 * (water.length / (room.h * room.w))
          )}%)`
      : "";
  const description = `${noun} ${columnDesc}${waterDesc}`.trim();
  return description;
};

const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const areOpposite = (dir1: string, dir2: string): boolean => {
  return (
    (dir1 === "north" && dir2 === "south") ||
    (dir1 === "south" && dir2 === "north") ||
    (dir1 === "east" && dir2 === "west") ||
    (dir1 === "west" && dir2 === "east")
  );
};

const getRoomNoun = (room: Rect | "outside", exits: Exit[]): string => {
  if (room === "outside") return room;
  const exitsLength = exits.filter(
    (exit) => exit.description !== "secret door"
  ).length;
  if (is1x1(room)) {
    switch (exitsLength) {
      case 1:
        return "alcove";
      case 2:
        const [dir1, dir2] = exits.map((exit) => exit.towards);
        if (areOpposite(dir1, dir2)) {
          return random(["entranceway", "archway"]);
        } else {
          return "bend";
        }
      case 3:
        return "three-way intersection";
      case 4:
        return "four-way intersection";

      default:
        return "dim passage";
    }
  }
  if (room.h === 1) {
    if (room.w === 2) return "short hallway";
    if (room.w > 5) return "long hallway";
    return "hallway";
  }

  if (room.rotunda) return "round room";
  if (room.w === room.h) return "square room";
  return "room";
};

/** 1 x 1 rooms are connectors between different rooms */
const is1x1 = (a: Rect) => a.w === 1 && a.h === 1;

const isAdjacent = (a: Rect, b: Rect) => {
  if (!is1x1(a) && !is1x1(b)) return false; // in this format, if rects are adjacent, one of them must by 1 x 1
  if (!is1x1(b)) return isAdjacent(b, a); // makes things easier if the 2nd is always the 1 x 1

  const left = a.x;
  const top = a.y;
  const right = a.x + a.w;
  const bottom = a.y + a.h;

  const isTop = b.y === top - 1;
  const isRight = b.x === right;
  const isBottom = b.y === bottom;
  const isLeft = b.x === left - 1;

  if (isTop || isBottom) return b.x >= a.x && b.x < right;
  if (isRight || isLeft) return b.y >= a.y && b.y < bottom;

  return false;
};

const isInside = (pos: { x: number; y: number }, rect: Rect) =>
  pos.x >= rect.x &&
  pos.x < rect.x + rect.w &&
  pos.y >= rect.y &&
  pos.y < rect.y + rect.h;

const getDir = <T extends Rect>(
  from: T | undefined,
  to: T
): "north" | "south" | "east" | "west" | "UNKNOWN" => {
  if (!from) return "UNKNOWN";
  // to is expected to be a 1x1
  if (!is1x1(to)) {
    console.warn(`Unexpected argument to getDir ${to}`);
    return "UNKNOWN";
  }
  if (!isAdjacent(to, from)) {
    console.warn(
      `Arguments to getDir are not adjacent: ${{ from: to, to: from }}`
    );
    return "UNKNOWN";
  }

  if (to.x === from.x - 1) return "west";
  if (to.x === from.x + from.w) return "east";
  if (to.y === from.y - 1) return "north";
  if (to.y === from.y + from.h) return "south";

  return "UNKNOWN";
};

const doorFunc = (doors: Door[]) => (a: { x: number; y: number }) =>
  doors.find((door) => door.x === a.x && door.y === a.y);

const getAdjacent = <T extends Rect>(a: T, rects: T[]) =>
  rects.filter((rect) => isAdjacent(rect, a));

export const parseDungeon = (dungeon: Dungeon): Dungeon => {
  const { rects, notes, doors } = dungeon;

  const doorsWithId = doors.map((d, id) => ({ ...d, id }))
  const getDoor = doorFunc(doorsWithId)

  const rectsWithId: (Rect & { id: number })[] = rects.map((r, id) => ({
    id,
    ...r,
  }));

  const rooms = rectsWithId
    .filter((r) => !getDoor(r))
    .map((fullRoom) => {
      const exits: Exit[] = getAdjacent(fullRoom, rectsWithId).map((exit) => {
        const door = getDoor(exit);
        const direction = getDir(fullRoom, exit);
        if (door) {
          // If the exit is a door, include the to
          const destination = rectsWithId.find(
            (x) => isAdjacent(x, exit) && x.id !== fullRoom.id
          );
          const to = destination?.id ?? "outside";
          const isFacing = facingDirection(door) === direction
          return {
            towards: direction,
            isFacing,
            to,
            type:door.type,
            door,
            description: destination
              ? describeDoor(door, direction, destination)
              : "exit from dungeon",
          } as Exit;
        } else return { towards: direction, to: exit.id } as Exit;
      });

      const door = getDoor(fullRoom);
      const contains = notes.filter((note) => isInside(note.pos, fullRoom))?.[0]
        ?.text;

      const columns = dungeon.columns.filter((column) =>
        isInside(column, fullRoom)
      );
      const water = dungeon.water.filter((column) =>
        isInside(column, fullRoom)
      );

      const description = describeRoom(fullRoom, exits, columns, water);

      const room:Room = {
        id: fullRoom.id,
        description,
        area: fullRoom.rotunda
          ? `${fullRoom.h}m across`
          : `${fullRoom.w}m x ${fullRoom.h}m`,
        ...(contains ? { contains } : {}),
        ...(fullRoom.ending ? { ending: true } : {}),
        ...(door ? { door } : {}),
        exits,
        x: fullRoom.x,
        y: fullRoom.y,
        w: fullRoom.w,
        h: fullRoom.h,
      };

      return room;
    });

  return { ...dungeon, rooms, doors:doorsWithId };
};
