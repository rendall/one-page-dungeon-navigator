/** notes-checker is an ad-hoc tool used to help overview dungeons, particularly notes */
/* eslint-disable */
import { readdir, readFile } from "fs"
import { extname, join } from "path"
import { parseNote } from "../lib/parseNote"
import { parseDungeon } from "../lib/parseDungeon"
import { CuriousNote, isItemNote, JsonDungeon, Note } from "../lib/dungeon"

const directoryPath = "./static/dungeons/"

const jsonFile = process.argv[2]

const minNote: Note = {
  id: 0,
  type: "none",
  text: "",
  ref: "",
  pos: { x: 0, y: 0 },
}

readdir(directoryPath, function (err, files) {
  if (err) {
    console.error("Error reading directory:", err)
    return
  }

  let notes = []

  let maxRoomsCount = 0
  let minRoomsCount = Number.MAX_SAFE_INTEGER

  files
    .filter((file) => extname(file) === ".json")
    .filter((file) => (jsonFile ? file === jsonFile : true))
    .forEach((file, i, all) => {
      const filePath = join(directoryPath, file)

      readFile(filePath, "utf8", function (err, data) {
        if (err) {
          console.error("Error reading file:", err)
          return
        }

        const json: JsonDungeon = JSON.parse(data)
        const notes: Note[] = json.notes.map((note) => note.text).flatMap((text) => parseNote({ ...minNote, text }))
        const { title, story } = json
        const dungeon = parseDungeon(json)

        const items = notes
          .filter(isItemNote)
          .flatMap((note) => note.items)
          .sort()
        const effects = notes.filter((note: Note) => note.type === "curious").map((note: CuriousNote) => note.action)

        console.log({ title, story })

        // notes.forEach((note) => {
        //   if (note.type === "corpse") console.log(note)
        // })

        if (i === all.length - 1) {
          // const uqNotes = notes.reduce((all, note) => (all.includes(note) ? all : [...all, note]), [])

          // uqNotes
          //   .map((text) => parseNote({ ...minNote, text }))
          //   .filter((o) => o.type === "curious")
          //   // .filter((o) => o?.imperative)
          //   .sort((a, b) =>
          //     a.object > b.object ? 1 : a.object < b.object ? -1 : a.text > b.text ? 1 : a.text < b.text ? -1 : 0
          //   )
          //   .forEach((o) => console.log(o))
          console.log("end")
        }
      })
    })
})
