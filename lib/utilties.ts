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

/** Compare two arrays and return true if all elements of a are contained in b. Does not accommodate duplicates */
export const containsElementsOf = (a: unknown[], b: unknown[]): boolean => a.every((e) => b.includes(e))

/** Replace item in array with id */
export const replace = <T extends { id: number }>(e: T, arr: T[]) => arr.map((a) => (e.id === a.id ? e : a))

/** Remove duplicate elements */
export const unique = <T>(arr: T[]) => arr.reduce((out: T[], e: T) => (out.includes(e) ? out : [...out, e]), [])

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
