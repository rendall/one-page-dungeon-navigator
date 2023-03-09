const fs = require("fs")
import { NoteType, Secret } from "./dungeon"
import { parseNote, parseItems } from "./parseNote"

const notesFile: string = fs.readFileSync("./tests/notes.txt", "utf-8")
const notes = notesFile.split("\n")

const minNote = {
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
    ["a mysterious, made of an unknown material helm", ["a mysterious, made of an unknown material helm"]],
    ["A weird, sticky to touch glaive", ["a weird, sticky to touch glaive"]],
    ["An ancient halberd", ["an ancient halberd"]],
    ["An enchanted hammer", ["an enchanted hammer"]],
    ["An exotic halberd and a shield", ["an exotic halberd", "a shield"]],
    ["An ornate javelin", ["an ornate javelin"]],
    ["Some gold and a blood-stained long sword", ["some gold", "a blood-stained long sword"]],
    ["Some gold and a vorpal spear", ["some gold", "a vorpal spear"]],
  ]

  it.each(expected)("should parse %s to %s", (items, expected) => {
    expect(parseItems(items)).toEqual(expected)
  })
})
