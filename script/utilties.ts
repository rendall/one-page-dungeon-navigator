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
