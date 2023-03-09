import { JsonNote, Note, NoteType, Secret } from "./dungeon"
import { arrEqual, deCapitalize } from "./utilties"

const notePatterns = [
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

export const isSecret = (note: null | RegExpMatchArray) =>
  note ? arrEqual(Object.keys(note.groups), ["hidden", "item"]) : false

const matchNoteFunc =
  (patterns: RegExp[]) =>
  (note: string): RegExpMatchArray | null =>
    patterns.reduce<RegExpMatchArray | null>((out, pattern) => (out ? out : note.match(pattern)), null)

export const matchNote = matchNoteFunc(notePatterns)

const matchType = (note: null | RegExpMatchArray): NoteType => {
  if (note === null) return NoteType.none
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

export const parseNote = (note: JsonNote & { id: number }): Note | Secret => {
  const match: RegExpMatchArray | null = matchNote(note.text)
  const type = matchType(match)

  switch (type) {
    case NoteType.secret:
      const active = `You find ${deCapitalize(note.text)}`
      const items = parseItems(match.groups.item)
      return { ...note, type, ...match.groups, items, message: active }

    default:
      return { ...note, type, contains: note.text }
  }
}
