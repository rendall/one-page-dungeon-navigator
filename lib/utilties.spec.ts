import { inventoryMessage, isArmor, isMagic, isWeapon, expandTally, RandomNumberGenerator } from "./utilties"

describe("inventoryMessage()", () => {
  it("should count ordinary items", () => {
    expect(inventoryMessage(["an apple", "a banana"])).toBe("an apple and a banana")
    expect(inventoryMessage(["an apple", "a banana", "a pear", "an ocelot"])).toBe(
      "an apple, a banana, a pear and an ocelot"
    )
    expect(inventoryMessage(["an apple", "an ocelot", "a pear", "an ocelot"])).toBe("an apple, two ocelots and a pear")
    expect(inventoryMessage(["a pear", "a pear", "a pear", "a pear"])).toBe("four pears")
    expect(inventoryMessage(["an apple", "an apple", "a banana", "a pear"])).toBe("two apples, a banana and a pear")
  })
  it("should list keys first", () => {
    expect(inventoryMessage(["an apple", "a banana", "a pear", "an ocelot", "a key"])).toBe(
      "a key, an apple, a banana, a pear and an ocelot"
    )
    expect(inventoryMessage(["an apple", "an ocelot", "a pear", "an ocelot", "a brass key", "a brass key"])).toBe(
      "two brass keys, an apple, two ocelots and a pear"
    )
    expect(inventoryMessage(["an apple", "a pear", "a pear", "a star-shaped key", "a pear", "a star-shaped key"])).toBe(
      "two star-shaped keys, an apple and three pears"
    )
  })
  it("should combine non-count items", () => {
    expect(inventoryMessage(["rations", "rations", "rations"])).toBe("rations")
    expect(
      inventoryMessage(["rations", "rations", "rations", "gems", "gems", "arrows", "candles", "candles", "candles"])
    ).toBe("rations, gems, arrows and candles")
    expect(inventoryMessage(["some gold", "some gold"])).toBe("gold")
    expect(inventoryMessage(["some gold", "some gold", "some gold", "rations", "a key"])).toBe(
      "a key, a lot of gold and rations"
    ) // this could use an oxford comma!
    expect(inventoryMessage(["love", "mud", "mud", "blood", "sand", "love", "love", "sand", "sand"])).toBe(
      "love, mud, blood and sand"
    )
  })

  describe("it should work work with real data", () => {
    const expectations = [
      [["a weird, ice-cold to touch axe", "an iron key"], "an iron key and a weird, ice-cold to touch axe"],
      [
        [
          "a silver dice",
          "a looking glass of haunting",
          "a map of the halls",
          "a rapier",
          "some gold",
          "a breastplate",
          "a scale mail",
          "some gold",
        ],
        "a silver dice, a looking glass of haunting, a map of the halls, a rapier, gold, a breastplate and a scale mail",
      ],
      [["a bat-shaped key", "a bat-shaped key"], "two bat-shaped keys"],
      [
        ["an enchanted knife", "some gold", "a hammer", "a key", "a leather armor", "a key", "a silver medallion"],
        "two keys, an enchanted knife, some gold, a hammer, a leather armor and a silver medallion",
      ],
      [
        ["some gold", "a key", "a key", "a bottle of wine", "a robe"],
        "two keys, some gold, a bottle of wine and a robe",
      ],
      [
        ["a key", "a strange, vibrating chainmail", "an uncanny, slightly humming idol"],
        "a key, a strange, vibrating chainmail and an uncanny, slightly humming idol",
      ],
      [
        ["an uncanny, ice-cold to touch object", "some gold", "rations", "a scale mail"],
        "an uncanny, ice-cold to touch object, some gold, rations and a scale mail",
      ],
      [
        [
          "unnaturally heavy breastplate",
          "a lamp",
          "a blood-stained flail",
          "a silver key",
          "an uncanny, covered with carvings dice",
          "some gold",
        ],
        "a silver key, unnaturally heavy breastplate, a lamp, a blood-stained flail, an uncanny, covered with carvings dice and some gold",
      ],
      [["gems", "a weird, vibrating chain", "a silver key"], "a silver key, gems and a weird, vibrating chain"],
      [
        ["a key", "a key", "a lamp", "a key", "a weird, unnaturally heavy object"],
        "three keys, a lamp and a weird, unnaturally heavy object",
      ],
      [
        [
          "a knife of resurection",
          "some gold",
          "a crowbar",
          "a vorpal mace",
          "a shield",
          "a strange, whispering halberd",
        ],
        "a knife of resurection, some gold, a crowbar, a vorpal mace, a shield and a strange, whispering halberd",
      ],
      [["a lamp", "a key", "a key", "a holy box"], "two keys, a lamp and a holy box"],
      [
        ["a lantern of intellect", "some gold", "gems", "a blood-stained sword", "candles"],
        "a lantern of intellect, some gold, gems, a blood-stained sword and candles",
      ],
      [
        ["some gold", "candles", "a scale mail", "a key", "a jewel-encrusted comb", "a mysterious, vibrating object"],
        "a key, some gold, candles, a scale mail, a jewel-encrusted comb and a mysterious, vibrating object",
      ],
      [
        ["lockpicks", "a bronze ring", "a gem of binding", "a key", "a leather armor", "some gold"],
        "a key, lockpicks, a bronze ring, a gem of binding, a leather armor and some gold",
      ],
      [
        ["a leather armor", "gems", "a crowbar", "a spear", "a brass key"],
        "a brass key, a leather armor, gems, a crowbar and a spear",
      ],
      [
        ["translucent helm", "some gold", "a long sword", "a scarf", "a mysterious, whispering object", "a key"],
        "a key, translucent helm, some gold, a long sword, a scarf and a mysterious, whispering object",
      ],
      [
        [
          "gems",
          "an iron key",
          "a weird, unnaturally light scale mail",
          "an iron key",
          "a javelin",
          "a chainmail",
          "an iron key",
          "an iron key",
        ],
        "four iron keys, gems, a weird, unnaturally light scale mail, a javelin and a chainmail",
      ],
      [
        ["lockpicks", "a fish-shaped key", "gems", "a fish-shaped key", "a fish-shaped key"],
        "three fish-shaped keys, lockpicks and gems",
      ],
      [
        ["a copper key", "a mysterious, unnaturally heavy medallion", "a copper key", "a copper key"],
        "three copper keys and a mysterious, unnaturally heavy medallion",
      ],
      [
        ["an orb of protection", "a leather armor", "a key", "a key", "a key", "a key", "a magic censer"],
        "four keys, an orb of protection, a leather armor and a magic censer",
      ],
      [
        ["an eldritch coin", "a crowbar", "a silver key", "an eldritch coin"],
        "a silver key, two eldritch coins and a crowbar",
      ],
      [
        ["some gold", "a vorpal spear", "a magic hourglass", "a cloak", "gems", "rations", "some gold"],
        "gold, a vorpal spear, a magic hourglass, a cloak, gems and rations",
      ],
    ]
    test.each(expectations)("%s should be %s", (items, expected) => {
      expect(inventoryMessage(items as string[])).toBe(expected)
    })
  })

  describe("it should combine and count all items ", () => {
    const doubledExpectation = [
      [
        ["a translucent helm", "some gold", "a long sword", "a scarf", "a mysterious, whispering object", "a key"],
        "two keys, two translucent helms, gold, two long swords, two scarves and two mysterious, whispering objects",
      ],
      [
        ["a copper key", "a mysterious, unnaturally heavy medallion", "a copper key", "a copper key"],
        "six copper keys and two mysterious, unnaturally heavy medallions",
      ],
      [
        ["an orb of protection", "a leather armor", "a key", "a key", "a key", "a key", "a magic censer"],
        "eight keys, two orbs of protection, two leather armors and two magic censers",
      ],
      [
        ["some gold", "a vorpal spear", "a magic hourglass", "a cloak", "gems", "rations", "some gold"],
        "a lot of gold, two vorpal spears, two magic hourglasses, two cloaks, gems and rations",
      ],
    ]
    test.each(doubledExpectation)("doubled %s should be %s", (items, expected) => {
      const double = [...items, ...items]
      expect(inventoryMessage(double as string[])).toBe(expected)
    })
  })
})

describe("keysRepeated()", () => {
  it("should return the expected value", () => {
    expect(expandTally({ a: 1, b: 2, c: 3 })).toEqual(["a", "b", "b", "c", "c", "c"])
  })
})

describe("Predicates", () => {
  const weapons = ["a vorpal scimitar", "a weird, sticky glaive", "a rusty axe"]
  test.each(weapons)("isWeapon(%s) is true", (weapon) => {
    expect(isWeapon(weapon)).toBe(true)
  })

  const armor = ["a helm", "a weird, transluscent shield"]
  test.each(armor)("isArmor(%s) is true", (armor) => {
    expect(isArmor(armor)).toBe(true)
  })

  const nonMagic = ["a helm", "a rusty axe"]
  test.each([...weapons, ...armor])("isMagic(%s)", (item) => {
    const expected = nonMagic.every((e) => e !== item)
    expect(isMagic(item)).toBe(expected)
  })
})
describe("RandomNumberGenerator", () => {
  test("is deterministic for the same seed", () => {
    RandomNumberGenerator.setSeed(42)
    const rng1 = RandomNumberGenerator.getInstance()
    const results1 = Array.from({ length: 5 }, () => rng1.getNext())

    RandomNumberGenerator.setSeed(42)
    const rng2 = RandomNumberGenerator.getInstance()
    const results2 = Array.from({ length: 5 }, () => rng2.getNext())

    expect(results1).toEqual(results2)
  })

  test("produces different results for different seeds", () => {
    RandomNumberGenerator.setSeed(42)
    const rng1 = RandomNumberGenerator.getInstance()
    const results1 = Array.from({ length: 5 }, () => rng1.getNext())

    RandomNumberGenerator.setSeed(24)
    const rng2 = RandomNumberGenerator.getInstance()
    const results2 = Array.from({ length: 5 }, () => rng2.getNext())

    expect(results1).not.toEqual(results2)
  })
})
