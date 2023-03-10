const fs = require("fs")
import { DoorNote, Note, NoteType, PlainNote, Secret } from "./dungeon"
import { parseNote, parseItems } from "./parseNote"
import { toThe } from "./utilties"

const notesFile: string = fs.readFileSync("./tests/notes.txt", "utf-8")
const notes = notesFile.split("\n")

const minNote: PlainNote = {
  text: "",
  type: NoteType.none,
  id: 0,
  ref: "",
  pos: {
    x: 0,
    y: 0,
  },
}

describe("parseNote()", () => {
  const parsedNotes = notes.map((text) => parseNote({ ...minNote, text })).filter((n) => n)
  const secrets: Secret[] = parsedNotes.filter((note) => note.type === NoteType.secret) as Secret[]
  test.each(secrets)("Should parse secret '$text'", (secret) => {
    expect(Object.keys(secret)).toEqual(expect.arrayContaining(["message", "items", "pos"]))
    expect(secret.message).toMatch(/^You find /)
  })

  describe("More type", () => {
    const moreNotes = [
      "A rear entrance into the fortress. A huge gate with two keyholes to the east.",
      "A rear entrance into the mausoleum. A corpse of a hobgoblin, a key nearby.",
    ]

    test.each(moreNotes)("%s should be two notes", (text) => {
      const notes = parseNote({ ...minNote, text }) as [Note, Note]
      expect(notes).toHaveLength(2)
    })

    const notMoreNotes = [
      "A rear entrance into the fortress.",
      "A huge gate with two keyholes to the east.",
      "A rear entrance into the mausoleum.",
      "A corpse of a hobgoblin, a key nearby.",
    ]

    test.each(notMoreNotes)("%s should be only one note", (text) => {
      const note = parseNote({ ...minNote, text }) as Note
      expect(note).toEqual(expect.objectContaining({ text: expect.stringMatching(text) }))
    })
  })

  describe("Door notes", () => {
    const doors = [
      "A lavishly decorated wooden gate with four keyholes on the northern wall of the large chamber.",
      "A battered wooden double door with a keyhole on the southern wall of the large chamber.",
      "A round double door to the north.",
      "A large wooden gate to the north.",
      "A huge gate to the south.",
    ]

    test.each(doors)("'%s' is a door", (text) => {
      const parsedNote = parseNote({ ...minNote, text }) as Note
      expect(parsedNote.type).toBe(NoteType.door)
    })

    const keyholeDoors = doors.filter((door) => door.includes("keyhole"))
    test.each(keyholeDoors)("'%s' is a keyhole door", (text) => {
      const doorNote: DoorNote = parseNote({ ...minNote, text }) as DoorNote
      expect(doorNote).toHaveProperty("keyholes")
    })

    const notKeyholeDoors = doors.filter((door) => !door.includes("keyhole"))
    test.each(notKeyholeDoors)("'%s' is a not keyhole door", (text) => {
      const doorNote: DoorNote = parseNote({ ...minNote, text }) as DoorNote
      expect(doorNote).not.toHaveProperty("keyholes")
    })

    const notdoors = ["A villager, chained to the wall."]

    test.each(notdoors)("'%s' is not a door", (text) => {
      const parsedNote = parseNote({ ...minNote, text }) as Note
      expect(parsedNote.type).not.toBe(NoteType.door)
    })
  })

  describe("Container type", () => {
    const containers = ["An enchanted tome in a medium crate."]

    test.each(containers)("%s should be a container type", (text) => {
      const parsedNote = parseNote({ ...minNote, text })
      expect(parsedNote.type).toBe(NoteType.container)
    })
    const nonContainers = [
      "A druid. Wants to join you.",
      "A gnome, lying in ambush.",
      "An explorer. Can be convinced to help you in your mission.",
    ]
    test.each(nonContainers)("%s should not be a container type", (text) => {
      const parsedNote = parseNote({ ...minNote, text }) as Note
      expect(parsedNote.type).not.toBe(NoteType.container)
    })
  })
})

describe("parseItems()", () => {
  const expected: [string, string[]][] = [
    [
      "A weird, sticky to touch glaive, a regular spear and a flask of holy water",
      ["a weird, sticky to touch glaive", "a regular spear", "a flask of holy water"],
    ],
    [
      "A chainmail, a regular spear and a flask of holy water",
      ["a chainmail", "a regular spear", "a flask of holy water"],
    ],
    ["A crowbar and a rusty axe", ["a crowbar", "a rusty axe"]],
    ["A cursed mace, a breastplate and some gold", ["a cursed mace", "a breastplate", "some gold"]],
    ["a mysterious, whispering helm", ["a mysterious, whispering helm"]],
    ["A lamp and a blood-stained flail", ["a lamp", "a blood-stained flail"]],
    ["A mysterious, unnaturally heavy scale mail", ["a mysterious, unnaturally heavy scale mail"]],
    ["An ancient halberd", ["an ancient halberd"]],
    ["An exotic halberd and a shield", ["an exotic halberd", "a shield"]],
    ["Some gold and a blood-stained long sword", ["some gold", "a blood-stained long sword"]],
  ]

  it.each(expected)("should parse %s to %s", (items, expected) => {
    expect(parseItems(items)).toEqual(expected)
  })
})

describe("toThe()", () => {
  const expectations = [["An apple and a pear", "the apple and the pear"]]
  test.each(expectations)("'%s' becomes '%s'", (received, expected) => {
    const the = toThe(received)
    expect(the).toBe(expected)
  })
})
