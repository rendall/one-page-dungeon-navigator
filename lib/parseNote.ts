import { JsonNote, PlainNote, NoteType, Secret, Note } from "./dungeon"
import { arrEqual, capitalize, deCapitalize, toThe } from "./utilties"

export const notePatterns = [
  /(?<npc_desc>[A-Za-z-,\s]+)\. (?<npc_desire>Can be convinced to help you in your mission)./,
  /(?<enemy>[A-Za-z-,\s]+), (?<npc_state>lying in ambush)./,
  /(?<feature>[A-Za-z-\s]+ depicting a scene of [A-Za-z-\s]+.)/,
  /(?<feature>[A-Za-z-\s]+ depicting (?<depictedNPC>[A-Za-z-\s]+)(?: with (?<magic_noun>[A-Za-z-\s]+) in one hand and a symbol of (?<symbol>[A-Za-z-\s]+) in the other).)/,
  /(?<feature>[A-Za-z-\s]+ depicting the [A-Za-z-\s]+ around the [A-Za-z-\s]+(?: as it looked in the distant past)?.)/,
  /(?<feature>[A-Za-z-\s]+, totally destroyed by (?:fire|mold|(?<enemy>[A-Za-z-\s]+) vandals).)/,
  /A mosaic of (?<symbol>[A-Za-z-\s]+) pattern on the (?:floor|walls|ceiling)/,
  /(?<writing>[A-Za-z-\s]+) on the (?:wall|floor|ceiling)(?: painted in blood): (?<sign>[A-Za-z-\s]+)/,
  /(?<body>Remains of an? [A-Za-z-\s]+) apparently killed by (?<enemy>[A-Za-z-\s]+), (?<item>[A-Za-z-,\s]+) clutched in his hands./,
  /(?<body>Remains of an? [A-Za-z-\s]+) apparently killed by (?<enemy>[A-Za-z-\s]+), (?<item>[A-Za-z-,\s]+) in his hands./,
  /(?<body>Remains of an? [A-Za-z-\s]+), (?<item>[A-Za-z-,\s]+) clutched in his hands./,
  /(?<body>Remains of an? [A-Za-z-\s]+), (?<item>[A-Za-z-,\s]+) in his hands./,
  /(?<rear>A rear entrance into [A-Za-z-\s]+\.)$/,
  /(?<rear>A rear entrance into [A-Za-z-\s]+\.) (?<more>[A-Za-z-,\s]+\.)/,
  /(?<feature>A (?:lifelike )?(?:statue|sculpture) of [A-Za-z-,\s]+), (?<item>[A-Za-z-,\s]+) in its hands./,
  /(?<item>[A-Za-z-,\s]+) hovering (?<hovering>[A-Za-z-,\s]+)./,
  /(?<item>[A-Za-z-,\s]+) in the middle of a (?<feature>[A-Za-z-\s]+)./,
  /(?<npc_desc>[A-Za-z-,\s]+), (?<npc_state>locked [A-Za-z-,\s]+)./,
  /(?<item>[A-Za-z-,\s]+) locked in a (?<locked>magical |mechanical | )(?<container>safe)./,
  /(?<item>[A-Za-z-,\s]+) in a (?<display>(?:shattered |glass |)(?:display|trophy|curio) case)./,
  /(?<item>[A-Za-z-,\s]+) in a (?<locked>magic)ally locked (?<display>(?:display|trophy|curio) case)./,
  /(?<item>[A-Za-z-,\s]+) on a (?<feature>pedestal(?: table)?)./,
  /(?<item>[A-Za-z-,\s]+) on an altar./,
  /A (?<corpse>[A-Za-z-,\s]+), (?<item>[A-Za-z-,\s]+) (nearby|close to it|close by)./,
  /A dying (?<dying>[A-Za-z-,\s]+), (?<item>[A-Za-z-,\s]+) among his belongings./,
  /(?<body>A [A-Za-z-,\s]+)(?: (?<npc_class>[A-Za-z-,\s]+)) with (?<item>[A-Za-z-,\s]+) in their hands./,
  /(?<hidden>A [A-Za-z-,\s]+) (conceals|hides) (?<item>[A-Za-z-,\s]+)./,
  /(?<feature>A (sign|writing) on the wall( painted in blood)?): (?<writing>[A-Za-z-,\s]+)/,
  /(?<feature>[A-Za-z-,\s]+), (?<action>[A-Za-z-,\s]+) (when|if) (?<trigger>[A-Za-z-,\s]+)./,
  /(?<feature>The [A-Za-z-,\s]+ is filled with (?<object>[A-Za-z-,\s]+).) It (?<action>[A-Za-z-,\s]+) when (?<trigger>[A-Za-z-,\s]+)./,
  /(?<item>[A-Za-z-,\s]+) (?:tucked under|among|at the|hidden in) (?<hidden>[A-Za-z-,\s]+)./,
  /(?<item>[A-Za-z-\s]+) under (?<hidden>[A-Za-z-,\s]+)./,
  /(?<npc_desc>[A-Za-z-,\s]+), (?<doing>[A-Za-z-,\s]+) (?:in a corner|on the ground)./,
  /(?<door>[A-Za-z-,\s]+) (?:on the|to the) (?<direction>[A-Za-z-,\s]+)/,
  /(?<container>[A-Za-z-,\s]+) containing (?<item>[A-Za-z-,\s]+)./,
  /(?<container>[A-Za-z-,\s]+) with (?<item>[A-Za-z-,\s]+) in it./,
  /(?<container>[A-Za-z-,\s]+) holds (?<item>[A-Za-z-,\s]+)./,
  /(?<container>[A-Za-z-,\s]+) with (?<item>[A-Za-z-,\s]+)./,
  /(?<item>[A-Za-z-,\s]+) in (?<container>[A-Za-z-,\s]+)./,
  /(?<npc_desc>[A-Za-z-,\s]+)\. (?<npc_desire>Wants to pay you to get rid of (?<item>[A-Za-z-,\s]+))./,
  /(?<npc_desc>[A-Za-z-,\s]+)\. (?<npc_desire>[A-Za-z-,\s]+)./,
  /(?<npc_desc>[A-Za-z-,\s]+), (?<npc_state>[A-Za-z-,\s]+)./,
]

export const isSecret = (note: null | RegExpMatchArray) => note ? arrEqual(Object.keys(note.groups), ["hidden", "item"]) : false
export const isContainer = (note: null | RegExpMatchArray) => note ? arrEqual(Object.keys(note.groups), ["container", "item"]) : false

const matchNoteFunc =
  (patterns: RegExp[]) =>
  (note: string): RegExpMatchArray | null =>
    patterns.reduce<RegExpMatchArray | null>((out, pattern) => (out ? out : note.match(pattern)), null)

export const matchNote = matchNoteFunc(notePatterns)

export const matchType = (note: null | RegExpMatchArray): NoteType => {
  if (note === null) return NoteType.none
  if (note.groups.more) return NoteType.more
  if (isContainer(note)) return NoteType.container
  if (isSecret(note)) return NoteType.secret
  return NoteType.none
}

export const parseItems = (items: string): string[] =>
  items.split(" and ").flatMap((item) =>
    item
      .split(/(?<!mysterious|strange|uncanny|weird),/)
      .map((item) => item.trim())
      .map((item) => deCapitalize(item))
  )

export const parseNote = (note: JsonNote & { id: number }): Note | [Note, Note] => {
  const match: RegExpMatchArray | null = matchNote(note.text)
  const type = matchType(match)

  const items = match?.groups?.item ? parseItems(match.groups.item) : undefined

  switch (type) {
    case NoteType.more:
      // Assign an arbitrary id to the first note, because as a
      // "rear" type, it will never need a status update
      const firstNote = parseNote({ ...note, text: match.groups.rear, id: -1 })
      const moreNote = parseNote({ ...note, text: match.groups.more })
      return [firstNote, moreNote] as [Note, Note]
    case NoteType.secret:
      const messageSecret = `You find ${deCapitalize(note.text)}`
      return { ...note, type, ...match.groups, items, message: messageSecret }

    case NoteType.container:
      const messageContainer = `You open ${toThe(match.groups.container)} and find ${deCapitalize(match.groups.item)}.`
      const imperative = `Open ${toThe(match.groups.container)}.`
      const pristine = `There is ${deCapitalize(match.groups.container)} here.`
      const empty = `${capitalize(match.groups.container)} is here, open and empty.`
      return { ...note, type, ...match.groups, items, message: messageContainer, imperative, pristine, empty }


    default:
      return { ...note, type, contains: note.text, ...match?.groups, items } as Note
  }
}
