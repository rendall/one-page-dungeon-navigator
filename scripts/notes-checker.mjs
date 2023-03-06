import fs from "fs";
import path from "path"
const directoryPath = "./static/dungeons/"

const templates = [
  "Remains of #person.a# apparently killed by #creature.s#, #treasure# clutched in his hands.",
  "Remains of #person.a# apparently killed by #creature.s#, #treasure# in his hands.",
  "Remains of #person.a#, #treasure# clutched in his hands.",
  "Remains of #person.a#, #treasure# in his hands.",
  "#special_item.capitalize# hovering in the middle of the #room#.",
  "#special_item.capitalize# in the middle of a {pentagram|circle of runes} on the ground.",
  "#special_item.capitalize# locked in a {magical |mechanical | }safe.",
  "#special_item.capitalize# in a {magically locked |shattered |glass |}{display|trophy|curio} case.",
  "#special_item.capitalize# on a pedestal{ table}.",
  "#special_item.capitalize# on an altar.",
  "#treasure.capitalize# among rubble on the ground.",
  "#treasure.capitalize# at the bottom of a {small }pool.",
  "#treasure.capitalize# hidden in a {crack|crevice} of the {wall|floor}.",
  "#treasure.capitalize# tucked under some debris.",
  "#treasure.capitalize# under pieces of broken furniture.",
  "A corpse of #person.a#, #treasure# #nearby#.",
  "A dying #person#, #treasure# among his belongings.",
  "A stuffed #race#{ #npc_class#} with #special_item# in their hands.",
  "A wall panel conceals #treasure#.",
  "A {lifelike }{statue|sculpture} of #native.a#{ #npc_class#}, #special_item# in its hands.",
  "A {{giant|large} }pile of rubble hides #treasure#.",
  "A sign on the wall#writing#",
  "#body_state.a.capitalize# body of #person.a#, #treasure# #nearby#.",
  "#object#, #action# (when|if) #trigger#.",
  "The #room# is filled with #object#. It #action# when #trigger#.",
  "A skeleton on the ground, #action# if disturbed.",
  "#npc_desc.a.capitalize#, #doing.what# {in a corner|on the ground}.",
  "#door# {on the|to the} #direction#",
  "#container.a.capitalize# containing #treasure#.",
  "#container.a.capitalize# with #treasure# in it.",
  "#container.a.capitalize# holds #treasure#.",
  "#container.a.capitalize# with #treasure#.",
  "A rear entrance into #where#",
  "#treasure.capitalize# in #container.a#.",
  "#npc_desc.a.capitalize#. #npc_desire.capitalize#.",
  "#npc_desc.a.capitalize#, #npc_state#.", 
]
const toRegex = (template) => new RegExp(template.replace("#nearby#", "(nearby|close to it|close by)").replace(/\{(.*?)\}/g, "($1)?").replace(/#(\w+?)(?:\.([^.#]+))*#/g, "(?<$1>[A-Za-z-,\\s]+)"))
templates.forEach(template => console.log(template, toRegex(template)))
const parseSentenceFunc = (templates) => (sentence) => templates.reduce((out, template) => out[0] ? out : [sentence.match(toRegex(template)), sentence, template, toRegex(template)], [null, null])

const parseSentence = parseSentenceFunc(templates)

fs.readdir(directoryPath, function (err, files) {
  if (err) {
    console.error("Error reading directory:", err)
    return
  }

  let notes = []

  files
    .filter((file) => path.extname(file) === ".json")
    .forEach(function (file, i, all) {
      const filePath = path.join(directoryPath, file)

      fs.readFile(filePath, "utf8", function (err, data) {
        if (err) {
          console.error("Error reading file:", err)
          return
        }

        const json = JSON.parse(data)
        const mapNotes = json.notes.map((note) => note.text)//.map(describeNote)
        notes = [...notes, ...mapNotes]

        if (i === all.length - 1) {
          const uqNotes = notes.filter(o => o.includes("rear")).reduce((all, note) => all.includes(note) ? all : [...all, note], [])
          uqNotes.sort().map(parseSentence).filter(o => o[0]).forEach(match => console.log(match))
          uqNotes.forEach(note => console.log(note))
        }
      })
    })
})

