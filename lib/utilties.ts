import { Exit, Room } from "./dungeon"

/**
 * Composes one or more functions together and returns a new function that applies each function in order
 * to the previous function's result.
 *
 * @template T - The type of the input and output of the composed functions
 * @param {T} initValue - The initial value to pass to the first function in the composition
 * @param {...((i: T) => T)[]} funcs - An array of functions to compose
 * @returns {T} - The result of applying each function in order to the previous function's result
 */
export const compose =
  <T>(...funcs: ((i: T) => T)[]) =>
    (initValue: T): T =>
      funcs.reduce<T>((all: T, f) => f(all), initValue)

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

/** Durstenfeld shuffle */
export const shuffleArray = <T>(array: T[]): T[] =>
  array.reverse().reduce(
    (acc, _, i) => {
      const j = Math.floor(getRandomNumber() * (i + 1))
        ;[acc[i], acc[j]] = [acc[j], acc[i]]
      return acc
    },
    [...array]
  )
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

export const hasProperty = (obj: unknown, property: string) => Object.prototype.hasOwnProperty.call(obj, property)

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
  if (count === 1) return word
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
class RandomNumberGenerator {
  private static instance: RandomNumberGenerator
  private state: number

  private constructor(seed: number) {
    this.state = seed
  }

  public static setSeed(seed: number): void {
    if (!RandomNumberGenerator.instance) {
      RandomNumberGenerator.instance = new RandomNumberGenerator(seed)
    } else throw new Error("Call RandomNumberGenerator.setSeed(<seed>) only once")
  }

  public static getInstance(): RandomNumberGenerator {
    if (!RandomNumberGenerator.instance)
      throw new Error("Call RandomNumberGenerator.setSeed(<seed>) before getInstance()")
    return RandomNumberGenerator.instance
  }

  public getNext(): number {
    const x = Math.sin(this.state++) * 10000
    return x - Math.floor(x)
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
  "bishop",
  "cardinal",
  "cleric",
  "deacon",
  "divine",
  "evangelist",
  "hermit",
  "missionary",
  "monk",
  "nun",
  "paladin",
  "preacher",
  "prophet",
  "saint",
  "templar",
  "theologian",
  "vicar",
  "zealot",
  "exorcist",
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
  "paladin",
  "cavalier",
  "templar",
  "crusader",
  "champion",
  "lancer",
  "hussar",
  "halberdier",
  "pikeman",
  "dragoon",
  "horseman",
  "squire",
  "myrmidon",
  "warden",
  "exemplar",
]

export const getEliteNoun = (bossNoun?: string) => {
  switch (bossNoun) {
    // Royalty bosses
    case "king":
    case "queen":
    case "prince":
    case "emperor":
      return randomElement(royalElites)

    // Magic-user bosses
    case "magus":
    case "savant":
    case "witch":
      return randomElement(magusEliteClass)

    // God boss
    case "god":
      return randomElement(angels)

    // Powerful being bosses
    case "titan":
    case "dragon":
    case "reaper":
      return randomElement(powerfulBeingsElite)

    // Military bosses
    case "lord":
    case "lady":
    case "baron":
    case "general":
    case "knight":
      return randomElement(militaryElite)

    // Religious figure bosses
    case "messiah":
    case "oracle":
    case "priest":
      return randomElement(religiousElites)

    // Default case for unrecognized boss types
    default:
      return randomElement(demons)
  }
}

const raiders = ["orc", "goblin", "hobgoblin", "kobold", "gnoll", "pirate", "bandit", "cultist", "thug", "ogre"]

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

const monsterNoun = ["dragon", "basilisk", "manticore", "beholder", "sphinx", "chimera", "hydra", "wyvern", "wyrm"]

export const isMonster = (name: string) => name && monsterNoun.some((noun) => name.includes(noun))
export const hasMonsterAttributes = (name: string) => name && monsterAdj.some((adj) => name.includes(adj))

export const randomMonsterName = (beast?: string) => {
  const bigAdj = isMonster(beast) ? undefined : randomElement(beastAdj)
  const monAdj = beast && hasMonsterAttributes(beast) ? "" : `${randomElement(monsterAdj)} `
  const name = `${monAdj}${beast ?? randomElement(monsterNoun)}`
  const monsterName = bigAdj ? `${bigAdj}, ${name}` : name
  return aAn(monsterName)
}
export const isWeapon = (item: string) =>
  [
    "axe",
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
  ].some((weapon) => item.match(new RegExp(`/\\b${weapon}\\b/`)))

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


/**TODO: Set this based on map seeds */
RandomNumberGenerator.setSeed(12345)

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
