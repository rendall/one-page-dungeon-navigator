import { Exit, Room } from "./dungeon"

/**
 * Deterministic RNG based on seed
 */
class RandomNumberGenerator {
  private static instance: RandomNumberGenerator;
  private state: number;

  private constructor(seed: number) {
    this.state = seed;
  }

  public static setSeed(seed: number): void {
    if (!RandomNumberGenerator.instance) {
      RandomNumberGenerator.instance = new RandomNumberGenerator(seed);
    }
    else throw new Error("Call RandomNumberGenerator.setSeed(<seed>) only once")
  }

  public static getInstance(): RandomNumberGenerator {
    if (!RandomNumberGenerator.instance) throw new Error("Call RandomNumberGenerator.setSeed(<seed>) before getInstance()")
    return RandomNumberGenerator.instance;
  }

  public getNext(): number {
    const x = Math.sin(this.state++) * 10000;
    return x - Math.floor(x);
  }
}

/**TODO: Set this based on map seeds */
RandomNumberGenerator.setSeed(12345)

export const getRandomNumber = (): number => RandomNumberGenerator.getInstance().getNext();


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
export const aAn = (str: string) => (["aeiou"].includes(str.charAt(0).toLowerCase()) ? `an ${str}` : `a ${str}`)

/** remove a or an from the front of a string */
export const deAAn = (str: string) => str.replace(/^[Aa]n?\s+/, "")

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
