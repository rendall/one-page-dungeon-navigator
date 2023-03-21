import type { Exit, Room } from "./dungeon"
import type { GameState } from "./gameLoop"

/**
 * Composes a sequence of functions that transform a single input value into a final output value.
 *
 * @template T The type of the input and output values.
 * @param {...((i: T) => T)[]} funcs An array of functions that take a single input parameter of type T and return an output of the same type T.
 * @param {T} initValue The initial input value to be passed to the first function in the sequence.
 * @param {(currentValue: T, nextFunc: (i: T) => T) => T} [wrapper=(currentValue, nextFunc) => nextFunc(currentValue)] A function that wraps each function in the sequence and allows for modification of the output before it is passed as input to the next function.
 * @returns {T} The final output value after applying all functions in the sequence to the initial input value.
 *
 * @example
 * // Define some simple functions to transform a string input
 * const addExclamation = (str: string) => str + "!";
 * const addQuestionMark = (str: string) => str + "?";
 * const addPeriod = (str: string) => str + ".";
 *
 * // Compose the functions into a sequence and apply them to an input value
 * const result = compose(addExclamation, addQuestionMark, addPeriod)("hello");
 *
 * // Output the final result
 * console.log(result); // "hello?!."
 *
 * @example
 * // Define a function that converts a string to uppercase
 * const toUpperCase = (str: string) => str.toUpperCase();
 *
 * // Define a wrapper function that appends "!" to the output of each function in the sequence
 * const addExclamation = (currentValue: string, nextFunc: (i: string) => string) => nextFunc(currentValue) + "!";
 *
 * // Compose the functions into a sequence and apply them to an input value
 * const result = compose(toUpperCase)("hello", addExclamation);
 *
 * // Output the final result
 * console.log(result); // "HELLO!"
 */
export const compose =
  <T>(...funcs: ((i: T) => T)[]) =>
  (initValue: T, wrapper = (currentValue: T, nextFunc: (i: T) => T) => nextFunc(currentValue)): T =>
    funcs.reduce<T>((currentValue: T, nextFunc) => wrapper(currentValue, nextFunc), initValue)

/** Compare two arrays and only return true if they each have the same elements, irrespective of order */
export const arrEqual = (a: unknown[], b: unknown[]): boolean => {
  if (a.length !== b.length) return false
  if (a.length === 0) return true
  const aPop = a[0]
  const bIndex = b.findIndex((b) => b === aPop)
  if (bIndex === -1) return false
  const bStripped = [...b.slice(0, bIndex), ...b.slice(bIndex + 1)]
  return arrEqual(a.slice(1), bStripped)
}

/** Shuffles an array */
export const shuffleArray = <T>(array: T[]): T[] =>
  array
    .map((value) => ({ value, random: getRandomNumber() }))
    .sort((a, b) => a.random - b.random)
    .map(({ value }) => value)

/** call arr.sort() on anything that has an id, such as a room, note or enemy */
export const sortById = <T extends { id: number }>(a: T, b: T) => (a.id > b.id ? 1 : b.id > a.id ? -1 : 0)

/** sort by the number of exits */
export const sortByExits = (a: Room, b: Room) =>
  a.exits.length > b.exits.length ? 1 : b.exits.length > a.exits.length ? -1 : 0

/** This gives an expected order to the exits when using numbers to specify them */
export const sortExitsClockwise =
  (room: { x: number; y: number }) =>
  (aExit: Exit, bExit: Exit): 1 | 0 | -1 => {
    const a = aExit.door
    const b = bExit.door
    const [ax, ay] = [a.x - room.x, a.y - room.y]
    const [bx, by] = [b.x - room.x, b.y - room.y]
    const angleA = Math.atan2(ay, ax)
    const angleB = Math.atan2(by, bx)
    return angleA < angleB ? -1 : angleA > angleB ? 1 : 0
  }

/** Take an object of the form { key: n } where n is a number, and
 * return an array of keys repeated n times.
 *
 * @example {a: 1, b: 3, c: 2} => ["a", "b", "b", "b", "c", "c"]
 */
export const keysRepeated = <T extends string>(obj: { [key in T]: number }): T[] => {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value !== "number")
      throw new Error(`Invalid value type '${typeof value}' in keysRepeated ${key}:${value}`)
    if (value < 0) throw new Error(`Invalid value range '${value}' in keysRepeated ${key}:${value}`)
  })

  return Object.entries(obj).reduce((arr, [key, value]) => [...arr, ...Array(value).fill(key)], [])
}
/** Given an value with an id, return the id. Otherwise return the value */
export const toId = (value: Room | number | string) => (value && hasProperty(value, "id") ? (value as Room).id : value)
/** Randomly choose one of the element's members */
export const randomElement = <T>(arr: T[]) => arr[Math.floor(getRandomNumber() * arr.length)]

/** Compare two arrays and return true if all elements of a are contained in b. Does not accommodate duplicates */
export const containsElementsOf = (a: unknown[], b: unknown[]): boolean => a.every((e) => b.includes(e))

/** Replace item in array with id */
export const replace = <T extends { id: number }>(e: T, arr: T[]) => arr.map((a) => (e.id === a.id ? e : a))

/** Remove duplicate elements */
export const unique = <T>(arr: T[]) => arr.reduce((out: T[], e: T) => (out.includes(e) ? out : [...out, e]), [])

const hasVerb = (str: string) => (/(holds|hides)/.test(str) ? "" : /^\w*s\s/.test(str) ? "are " : "is ")

/** Checks if obj has property. Optional predicate to check value of property */
export const hasProperty = (obj: unknown, property: string, pred: (value: unknown) => boolean = () => true) =>
  Object.prototype.hasOwnProperty.call(obj, property) && pred((obj as { [key: string]: unknown })[property])

/** Append "." to str and ensure there is only one, as long as there is not already a ! or ? */
export const period = (str: string): string =>
  /[?!]$/.test(str.trim()) ? str : /\.$/.test(str.trim()) ? period(str.trim().slice(0, -1)) : `${str}.`

/** Format the string using successive formats, e.g. formatString("an orc", toThe, isHere, period) // -> "The orc is here. " */
export const formatString = (str: string, ...rest: ((str: string) => string)[]): string =>
  rest?.length === 0 ? str : formatString(rest[0](str), ...rest.slice(1))

/** Alias for 'formatString' */
export const fmt = formatString

/** Add a 'is/are here at the end of a sentence */
export const isHere = (str: string) => (str.startsWith("The") ? str : `${capitalize(str)} ${hasVerb(str)} here`)

/** Add a 'Here is/are at the beginning of a sentence */
export const hereIs = (str: string) => (str.startsWith("The") ? str : `Here ${hasVerb(str)}${deCapitalize(str)}.`)

/** add a 'There is/are ... here. */
export const thereIs = (str: string) =>
  str.startsWith("The") ? str : `There ${hasVerb(str)}${deCapitalize(str)} here.`

/** Make only the first letter lower-case */
export const deCapitalize = (str: string) => `${str.charAt(0).toLowerCase() + str.slice(1)}`

/** Capitalize the string */
export const capitalize = (str: string) => `${str.charAt(0).toUpperCase() + str.slice(1)}`

/** Replace 'a' with 'the' */
export const toThe = (str: string) => str.replace(/\b[Aa]n?\b/g, "the")

/** add a or an depending on the string */
export const aAn = (str: string) =>
  ["a", "e", "i", "o", "u"].includes(str.charAt(0).toLowerCase()) ? `an ${str}` : `a ${str}`

/** remove a or an from the front of a string */
export const deAAn = (str: string) => str.replace(/^[Aa]n?\s+/, "")

/** to singular */
export const singularize = (word: string) => {
  const exceptions: { [key: string]: string } = {
    sphinxes: "sphinx",
  }

  const singular = exceptions[word] ?? word.replace(/ves$/, "f").replace(/s$/, "")
  return singular
}

/** to plural */
export const pluralize = (count: number, word: string): string => {
  if (count === 1 || isNaN(count)) return word
  if (word === "some gold") {
    if (count === 2) return "gold"
    return "a lot of gold"
  }

  // non-count mass items will not start with a/an
  if (deAAn(word) === word) return word

  // Realistically, the count never rises above 4 and never drops below 2
  const countword = ["zero", "one", "two", "three", "four", "five", "six"][count]

  // Realistically, the only word that will ever be pluralized is "key"
  return `${countword} ${deAAn(word)}s`
}

/** comma list */
export const toList = (items: string[]): string => {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items[0]}, ${toList(items.slice(1))}`
}

/** Create inventory message */
export const inventoryMessage = (inventory?: string[]) => {
  if (!inventory) return ""
  const keySort = (a: string, b: string) => (a.endsWith("key") ? -1 : b.endsWith("key") ? 1 : 0) // keys should always be the first item listed
  const itemCount = inventory
    .map((item) => item.toLowerCase())
    .sort(keySort)
    .reduce((acc: { [key: string]: number }, curr: string) => ({ ...acc, [curr]: (acc[curr] || 0) + 1 }), {})
  const items = Object.entries(itemCount).map(([item, count]: [string, number]) => pluralize(count, item))
  return toList(items)
}

/** Do keys match keyholes */
export const doKeysMatchKeyholes = (keyholes: string, keys: string[]) => {
  if (keyholes.startsWith("a") && keys.length) return true
  if (keyholes.startsWith("two") && keys.length === 2) return true
  if (keyholes.startsWith("three") && keys.length === 3) return true
  if (keyholes.startsWith("four") && keys.length === 4) return true
  return false
}

const pastToPreset = (verb: string) => {
  switch (verb) {
    case "examined":
    case "stroked":
    case "shaken":
    case "solved":
    case "inhaled":
    case "breathed":
      return verb.slice(0, -1)
    case "lit":
      return "light"
    case "drank":
      return "drink"
    case "sat":
      return "sit"
    case "struck":
      return "strike"

    default:
      return verb.replace(/(ed)$/, "")
  }
}

export const curiousImperative = ({ feature, trigger, object }: { [key: string]: string }): string => {
  const directObject = object ? `the ${object}` : feature
  switch (trigger) {
    case "the candles on it are lit":
      return `Light the candles on ${toThe(directObject)}`
    case "a sacrifice is made":
      return `Make a sacrifice on ${toThe(directObject)}`
    case "the lever is pulled":
      return `Pull the lever of ${toThe(directObject)}`
    case "the knob is touched":
      return `Open ${toThe(directObject)}`
    case "a coin is dropped into it":
      return `Drop a coin into ${toThe(directObject)}`
    case "struck hard":
      return `Strike the ${object} hard`

    default: {
      const [past, preposition] = trigger.split(" ")
      const verb = pastToPreset(past)
      const addSpace = (str: string) => (str ? `${str} ` : "")
      return `${capitalize(verb)} ${addSpace(preposition)}${toThe(directObject)}`
    }
  }
}

export const curiousMessage = ({ trigger, action, feature, object }: { [key: string]: string }): string => {
  const imperative = curiousImperative({ feature, action, trigger, object })
  const actionResult = action.replace(/a person/, "you").replace(/\bhis\b/, "your")
  if (trigger === "the knob is touched") return `When you touch the knob, ${toThe(feature)} ${actionResult}`
  return `When you ${deCapitalize(imperative)}, it ${actionResult}.`
}

/**
 * Deterministic RNG based on seed
 */
export class RandomNumberGenerator {
  private static instance: RandomNumberGenerator
  private seed: number

  private static readonly a: number = 1664525
  private static readonly c: number = 1013904223
  private static readonly m: number = 2 ** 32

  private constructor(seed: number) {
    this.seed = seed
  }

  /** Designed to be called once per dungeon, setting a seed makes the pseudorandom output deterministic.*/
  public static setSeed(seed: number): void {
    RandomNumberGenerator.instance = new RandomNumberGenerator(seed)
  }

  public static getInstance(): RandomNumberGenerator {
    if (!RandomNumberGenerator.instance) {
      throw new Error("Call RandomNumberGenerator.setSeed(<seed>) before getInstance()")
    }
    return RandomNumberGenerator.instance
  }

  public static hasInstance = (): boolean => !!RandomNumberGenerator.instance

  public getNext(): number {
    this.seed = (RandomNumberGenerator.a * this.seed + RandomNumberGenerator.c) % RandomNumberGenerator.m
    return this.seed / RandomNumberGenerator.m
  }

  public nextInt(min: number, max: number): number {
    return min + Math.floor(this.getNext() * (max - min))
  }
}

const bossAdj = [
  "serpent",
  "viper",
  "spider",
  "raven",
  "dread",
  "mad",
  "shadow",
  "dark",
  "blood",
  "cursed",
  "iron",
  "golden",
  "diamond",
  "jade",
  "storm",
  "fire",
  "ice",
  "void",
  "purple",
  "black",
  "red",
  "white",
  "vampire",
  "undead",
  "zombie",
  "silent",
  "moon",
  "immortal",
  "shadow",
  "fallen",
  "obsidian",
  "scarlet",
  "great",
  "one-eyed",
  "lich",
  "amber",
  "leper",
  "grey",
  "blind",
  "demon",
  "blasphemous",
]

const bossNoun = [
  "king",
  "queen",
  "prince",
  "emperor",
  "lord",
  "lady",
  "baron",
  "magus",
  "savant",
  "titan",
  "god",
  "dragon",
  "one",
  "master",
  "general",
  "beast",
  "knight",
  "witch",
  "lady",
  "reaper",
  "messiah",
  "priest",
  "oracle",
]

const angels = ["seraph", "cherub", "ophan", "potentate", "archangel", "angel"]
/**
    Alu: Akkadian, 2000-1000 BCE, malevolent spirits associated with disease and illness
    Aswang: Filipino, pre-colonial era, shapeshifting demon who preys on pregnant women and children
    Churel: South Asian, pre-Islamic era, female ghost or demon who died during childbirth and preys on children and men
    Dybbuk, Jewish folklore, 16th century - a malevolent spirit that possesses a living person.
    Ekimmu (Assyrian/Babylonian, 1350-610 BCE): ghosts of those who were not buried properly, said to cause disease and plague.
    Empusa (Greek, 8th-4th century BCE): a demoness who preyed on young men, often depicted with one leg made of bronze and the other of an ass.
    Empusa: Greek, 5th century BCE, shapeshifting female demon who preys on men
    Gallu (Babylonian, 2000-1000 BCE): demons associated with the underworld and often depicted with wings and talons.
    Gidim (Sumerian/Babylonian, 4000-2000 BCE): spirits of the dead who wandered the earth, often associated with disease and misfortune.
    Imp, European, Medieval Europe, A mischievous, often malevolent spirit, similar to a fairy, that is said to be able to shape shift and cause chaos. Lilin, Jewish folklore, 5th century BC - a class of female demons who prey on men and babies.
    Incubus: Medieval Europe, 12th century CE, male demon who seduces women in their dreams
    Jinn: Islamic, 7th century CE, supernatural creatures with free will who can be benevolent or malevolent
    Kappa (Japanese, pre-7th century CE): a water spirit that kidnapped and drowned children and livestock, often depicted with a beak-like mouth and a bowl-like depression on the top of its head.
    Keres (Greek, 8th-4th century BCE): spirits of violent or cruel death, often associated with war and battlefields.
    Lamia (Greek, 8th-4th century BCE): a child-eating demoness, often depicted with a serpent's tail and multiple breasts.
    Lemure, Roman, Ancient Rome, A malevolent spirit or ghost of the deceased who was not properly buried or who was murdered, causing them to become restless and vengeful.
    Lilu (Akkadian, 2334-2154 BCE): malevolent night spirits that caused disease and death, often associated with sexual desire and nocturnal emissions.
    Mara, Buddhist and Hindu mythology, 1st century AD - a demon that brings nightmares and sleep paralysis.
    Mormo (Greek, 8th-4th century BCE): a female vampire who attacked children and infants, often depicted with a grotesque appearance and disheveled hair.
    Nuckelavee, Scottish folklore, 16th century - a malevolent spirit that is half-human and half-horse.
    Oni, Japanese folklore, 7th century - a type of malevolent spirit or demon that causes trouble and misfortune.
    Rakshasa: Hindu, pre-400 BCE, shapeshifting demon who preys on humans and eats human flesh
    Rusalka, Slavic mythology, pre-Christian era - a female water spirit that drowns people.
    Strix (Roman, 753 BCE-476 CE): a bird-like demoness that drank the blood of infants and young children.
    Succubus (European, Middle Ages): a demon that preyed on sleeping men, often depicted as a female with bat wings and a serpent's tail.
    Tengu (Japanese, pre-7th century CE): bird-like spirits that caused mischief and chaos, often depicted with long noses and wings.
    Utukki (Babylonian, 2000-1000 BCE): a group of malevolent spirits that caused various afflictions, such as disease, possession, and misfortune.
    Wendigo, Native American mythology, pre-colonial era - a malevolent spirit associated with cannibalism and winter.
    Yōkai: Japanese, pre-8th century CE, a class of supernatural beings that includes malevolent spirits and demons
    */

const demons = [
  "alu",
  "aswang",
  "churel",
  "dybbuk",
  "ekimmu",
  "empusa",
  "empusa",
  "gallu",
  "gidim",
  "imp",
  "incubus",
  "jinn",
  "kappa",
  "keres",
  "lamia",
  "lemure",
  "lilu",
  "mara",
  "mormo",
  "nuckelavee",
  "oni",
  "rakshasa",
  "rusalka",
  "strix",
  "succubus",
  "tengu",
  "utukki",
  "wendigo",
  "yōkai",
]

const religiousElites = [
  "acolyte",
  "novitiate",
  "cleric",
  "monk",
  "paladin",
  "preacher",
  "prophet",
  "templar",
  "zealot",
]

const royalElites = [
  "duke",
  "earl",
  "marquess",
  "baron",
  "viscount",
  "prince",
  "count",
  "archduke",
  "chancellor",
  "admiral",
  "commander",
  "captain",
  "lieutenant",
  "general",
  "colonel",
  "major",
  "captain",
  "lieutenant",
  "sergeant",
  "knight",
]
const magusEliteClass: string[] = [
  "acolyte",
  "apprentice",
  "cultist",
  "enchanter",
  "invoker",
  "mage",
  "magician",
  "occultist",
  "prodigy",
  "sage",
  "seer",
  "sorcerer",
  "spellbinder",
  "thaumaturge",
  "warlock",
  "wizard",
  "necromancer",
  "conjuror",
]

const powerfulBeingsElite = [
  "champion",
  "exarch",
  "sentinel",
  "oracle",
  "vindicator",
  "arbiter",
  "prodigy",
  "paragon",
  "zealot",
  "scion",
  "crusader",
  "harbinger",
  "mystic",
  "ascendant",
  "paladin",
]

const militaryElite = [
  "berserker",
  "champion",
  "crusader",
  "exemplar",
  "gladiator",
  "myrmidon",
  "paladin",
  "templar",
  "warden",
  "warrior",
]

export const getEliteNoun = (bossNoun?: string) => {
  const format = (arr: string[]) => capitalize(randomElement(arr))
  switch (bossNoun) {
    // Royalty bosses
    case "king":
    case "queen":
    case "prince":
    case "emperor":
      return format(royalElites)

    // Magic-user bosses
    case "magus":
    case "savant":
    case "witch":
      return format(magusEliteClass)

    // God boss
    case "god":
      return format(angels)

    // Powerful being bosses
    case "titan":
    case "dragon":
    case "reaper":
      return format(powerfulBeingsElite)

    // Military bosses
    case "lord":
    case "lady":
    case "baron":
    case "general":
    case "knight":
      return format(militaryElite)

    // Religious figure bosses
    case "messiah":
    case "oracle":
    case "priest":
      return format(religiousElites)

    // Default case for unrecognized boss types
    default:
      return randomElement(demons)
  }
}

const raiders = ["orc", "goblin", "hobgoblin", "kobold", "gnoll", "pirate", "bandit", "cultist", "thug"]

export const randomRaider = (() => {
  let raider: string
  return (reset?: boolean) => {
    if (raider === undefined || reset === true) {
      // Generate a new random value on the first call
      raider = randomElement(raiders)
    }
    return raider
  }
})()

export const randomBossName = () => `${capitalize(randomElement(bossAdj))} ${capitalize(randomElement(bossNoun))}`

const beastAdj = ["huge", "giant", "terrifying", "fearsome", "undead"]
const monsterAdj = [
  "venomous",
  "mutant",
  "man-eating",
  "albino",
  "blood-sucking",
  "spectral",
  "soul-eating",
  "intelligent",
  "fire-breathing",
  "invisible",
]

const monsterNoun = [
  "dragon",
  "basilisk",
  "manticore",
  "beholder",
  "sphinx",
  "chimera",
  "hydra",
  "wyvern",
  "wyrm",
  "ogre",
]

export const isMonster = (name: string) => name && monsterNoun.some((noun) => name.includes(noun))
export const hasMonsterAttributes = (name: string) => name && monsterAdj.some((adj) => name.includes(adj))

export const randomMonsterName = (beast?: string) => {
  if (beast && !isMonster(beast)) {
    // if there's a beast, then it's going to be a "big, scary beast"
    const bigAdj = randomElement(beastAdj)
    const monAdj = hasMonsterAttributes(beast) ? "" : `${randomElement(monsterAdj)} `
    const name = `${monAdj}${beast}`
    const monsterName = bigAdj ? `${bigAdj}, ${name}` : name
    return aAn(monsterName)
  }
  // otherwise it's rarely going to be a "spectral monster" and even more rarely a "big, spectral monster"
  const monster = beast ?? monsterNoun[Math.floor(determineRandomValue() * monsterNoun.length)]
  const monsterRandom = getRandomNumber()
  if (monsterRandom <= 0.01) {
    const bigAdj = randomElement(beastAdj)
    const monAdj = hasMonsterAttributes(monster) ? "" : `${randomElement(monsterAdj)} `
    const name = `${monAdj}${monster}`
    const monsterName = bigAdj ? `${bigAdj}, ${name}` : name
    return aAn(monsterName)
  } else if (monsterRandom <= 0.1) {
    const monAdj = hasMonsterAttributes(monster) ? "" : `${randomElement(monsterAdj)} `
    const monsterName = `${monAdj}${monster}`
    return aAn(monsterName)
  } else return aAn(monster)
}
export const isWeapon = (item: string) =>
  [
    "axe",
    "blade",
    "dagger",
    "flail",
    "glaive",
    "halberd",
    "hammer",
    "javelin",
    "katana",
    "mace",
    "rapier",
    "scimitar",
    "spear",
    "staff",
    "sword",
  ].some((weapon) => new RegExp(`\\b${weapon}\\b`).test(item))

export const isArmor = (item: string) =>
  [
    "breastplate",
    "cape",
    "chainmail",
    "cloak",
    "helm",
    "leather armor",
    "mantle",
    "robe",
    "scale mail",
    "scarf",
    "shield",
  ].some((armor) => item.match(new RegExp(`/\\b${armor}\\b/`)))

export const isMagic = (item: string) =>
  [
    "amulet",
    "ball",
    "blade",
    "book",
    "bow",
    "cape",
    "carpet",
    "censer",
    "coin",
    "compass",
    "cube",
    "doll",
    "eldritch",
    "enchanted",
    "flask",
    "flute",
    "gem",
    "grimoire",
    "holy",
    "horn",
    "hourglass",
    "knife",
    "lamp",
    "lantern",
    "life stealing",
    "lightning",
    "looking glass",
    "magic",
    "mysterious",
    "needle",
    "orb",
    "potion",
    "quill",
    "relic",
    "rod",
    "scroll",
    "skull",
    "slaying",
    "smiting",
    "spellbook",
    "staff",
    "stone",
    "strange",
    "tablet",
    "tarot deck",
    "tome",
    "uncanny",
    "unholy",
    "vengeance",
    "venom",
    "vorpal",
    "wand",
    "weird",
  ].some((magic) => item.match(new RegExp(`\\b${magic}\\b`)))

export const getRandomNumber = (): number => RandomNumberGenerator.getInstance().getNext()

/** Return a random value and the same random value each time until
 * calling determineRandomValue(true) */
export const determineRandomValue = (() => {
  let value: number
  return (reset?: boolean) => {
    if (value === undefined || reset === true) {
      value = getRandomNumber()
    }
    return value
  }
})()
