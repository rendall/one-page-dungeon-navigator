/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Dungeon, Action, exitDirections, Exit, isEnemy } from "../lib/dungeon"
import { parseDungeon } from "../lib/parseDungeon"
import { game, GameOutput, GameResult } from "../lib/gameLoop"
import { tallyArray, addCount, toThe } from "../lib/utilties"

const INSTRUCTIONS = `
<p class="instructions">Navigate the dungeon by pressing the buttons below, using the arrow keys, or pressing the following keys:</p>
<ul>
  <li>To move up, or north, press <span>w</span> or <span>up arrow</span></li>
  <li>To move right, or east, press <span>d</span> or <span>right arrow</span></li>
  <li>To move down, or south, press <span>s</span> or <span>down arrow</span></li>
  <li>To move left, or west, press <span>a</span> or <span>left arrow</span></li>
  <li>To search for secrets, press <span>x</span></li>
  <li>To attack, press <span>v</span></li>
  <li>To use curious features in a room, press <span>u</span></li>
  <li>To quit to main menu, press <span>q</span></li>
  <!--<li>To view entire dungeon, press <span>#</span></li>-->
  <li>To move through a specific exit, press its corresponding <span>number</span> key, assigned in a clockwise direction starting with <span>1</span> to the north west.</li>
  <li>To check your status, press <span>i</span></li>
  <li>To view these instructions again, press <span>?</span></li>
</ul>
<hr/>`

const loadFiles = (dungeonName: string): Promise<[string, Dungeon]> => {
  const imageUrl = `dungeons/${dungeonName}.svg`
  const jsonDataUrl = `dungeons/${dungeonName}.json`

  return Promise.all([fetch(imageUrl), fetch(jsonDataUrl)]).then(async (responses) => {
    const [imageResponse, jsonResponse] = responses
    if (!imageResponse.ok) {
      throw new Error(`Failed to load image file: ${imageResponse.status} ${imageResponse.statusText}`)
    }
    if (!jsonResponse.ok) {
      throw new Error(`Failed to load JSON file: ${jsonResponse.status} ${jsonResponse.statusText}`)
    }
    const imageData = await imageResponse.text()
    const jsonData = await jsonResponse.json()
    const gameSection = document.querySelector("section#game")
    gameSection.classList.remove("hide")

    const menuSection = document.querySelector("section#menu")
    menuSection.classList.add("hide")
    return [imageData, jsonData]
  })
}

const startButton = document.getElementById("start-button")

const displayMap = (svgData: string, mapContainer: HTMLDivElement): SVGElement => {
  mapContainer.innerHTML = svgData
  return mapContainer.querySelector("svg")
}

/** Returns an array of paths that correspond to the dungeon rooms and
 * doors. The index of the element corresponds to that room or door's id */
const getSVGPaths = (svg: SVGElement) => {
  const gDungeon = svg.querySelector("#dungeon-map")
  const pathNodes = gDungeon.querySelectorAll("path")
  const paths = Array.from(pathNodes).slice(2)
  return paths
}

/** A higher-order function.
 * @returns (id:number) => SVGPathElement - accepts a room id and unmasks its shape
 */
const revealRoomFunc = (paths: SVGPathElement[], mask: SVGMaskElement) => (id: number) => {
  const pathId = `room-${id}`
  if (document.getElementById(pathId)) return paths[id]

  const dAttr = paths[id].getAttribute("d")

  if (mask) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", dAttr)
    path.setAttribute("fill", "#FFFFFF")
    path.setAttribute("id", pathId)
    mask.appendChild(path)
  }
  return paths[id]
}

/** Move the avatar to the center point of the shape represented by "d"
 * @param d:string - The path param
 */
const moveAvatar = (d: string) => {
  const [cx, cy] = getMidPoint(d)
  const avatar = document.getElementById("avatar") as unknown as SVGCircleElement
  const xOffset = -parseInt(avatar.getAttribute("width")) / 2
  const yOffset = -parseInt(avatar.getAttribute("height")) / 2
  avatar.setAttribute("x", `${cx + xOffset}`)
  avatar.setAttribute("y", `${cy + yOffset}`)
  centerAvatar()
}

/** Set the top, left coordinates of the map svg to place the
 * avatar in the center of the map-container */
const centerAvatar = () => {
  const avatar = document.getElementById("avatar")
  const mapContainer = document.querySelector("#map-container")
  const svg = mapContainer.querySelector("svg")

  const mapBound = mapContainer.getBoundingClientRect()
  const avatarBound = avatar.getBoundingClientRect()
  const svgBound = svg.getBoundingClientRect()

  const targetX = mapBound.width / 2 // this is the midpoint of the map-container
  const avatarX = avatarBound.width / 2 + avatarBound.left // this is the midpoint of the avatar which should move to targetX
  const xOffset = targetX - avatarX
  const svgLeft = `${svgBound.left + xOffset}px`

  const targetY = mapBound.height / 2 + mapBound.top // this is the midpoint of the map-container
  const avatarY = avatarBound.height / 2 + avatarBound.top // this is the midpoint of the avatar which should move to targetY
  const yOffset = targetY - avatarY
  const svgTop = `${svgBound.top + yOffset}px`

  svg.style.left = svgLeft
  svg.style.top = svgTop
}

/** A function used in an `array.reduce` that returns the input
 * array stripped of duplicates */
const unique = <T>(uq: T[], c: T) => (uq.some((u) => u === c) ? uq : [...uq, c])

/** Output an array of [x,y] coordinates representing the vertices of an svg "d" attribute */
const getCoords = (d: string) =>
  d
    .split(" ")
    .filter((e) => e !== "M" && e !== "L" && e !== "")
    .reduce(unique, [])
    .map((e) => e.split(",").map((c: string) => parseInt(c)))
const getMidPoint = (d: string) =>
  getCoords(d)
    .reduce(([sumX, sumY]: [number, number], [x, y]: [number, number]) => [sumX + x, sumY + y], [0, 0])
    .map((avg: number) => avg / getCoords(d).length)

const updateMessageScroll = () => {
  const messageScroll = document.getElementById("message-scroll")
  messageScroll.scrollTop = messageScroll.scrollHeight
}

const printMessage = (message: string, type = "message") => {
  const messageScroll = document.getElementById("message-scroll")
  switch (type) {
    case "init":
      messageScroll.innerHTML = message
      break
    case "html":
      messageScroll.insertAdjacentHTML("beforeend", message)
      break
    default: {
      const messageP = document.createElement("p") as HTMLParagraphElement
      messageP.classList.add(type)
      messageP.innerHTML = message
      messageScroll.appendChild(messageP)
      if (/You go (east|north|south|west)/.test(message)) printMessage("<hr/>", "html")
      break
    }
  }
}

const addTouchControls = (result: GameOutput) => {
  const exits = result.exits
  const turn = result.turn
  const enemies = result.agents
    .filter(isEnemy)
    .filter((enemy) => !enemy.statuses.includes("dead"))
    .sort((a, b) => b.id - a.id)
  const messageScroll = document.getElementById("message-scroll")
  const ul = document.createElement("ul") as HTMLUListElement
  ul.classList.add("controls")
  const createCommandLi = (text: string, command: string) => {
    const li = document.createElement("li") as HTMLLIElement
    li.textContent = text
    li.classList.add("control")
    li.dataset.command = command
    li.dataset.turn = turn.toString() // Adding `turn` here enables old controls to be invalidated
    return li
  }
  exits.forEach((exit, i) => {
    const command = exit.to === "outside" ? "q" : (i + 1).toString()
    const li = createCommandLi(`${exit.description}${command === "q" ? " (quit)" : ""}`, command)
    ul.appendChild(li)
  })

  result.imperatives?.forEach(([text]: [string, string]) => {
    const li = createCommandLi(text, "u")
    ul.appendChild(li)
  })

  if (!result.statuses?.includes("searched")) {
    const searchLi = createCommandLi("You can also search", "x")
    ul.appendChild(searchLi)
  }

  enemies.forEach((enemy) => {
    const li = createCommandLi(`Attack ${toThe(enemy.name)}`, `attack ${enemy.id}`)
    ul.appendChild(li)
  })

  messageScroll.appendChild(ul)
}

let lastRoomId = -1

const presentResultFunc = (revealRoom: (id: number) => SVGPathElement) => (result: GameOutput) => {
  const { action, turn } = result
  switch (action) {
    case "init": {
      const [title, subtitle] = result.message.split("\n")
      printMessage(`<h1 class="title">${title}</h1><p class="story">${subtitle}</p>`, "init")
      printMessage(INSTRUCTIONS)
      break
    }
    case "quit":
    // eslint-disable-next-line no-fallthrough
    case "noop":
      // eslint-disable-next-line no-empty
      break
    default: {
      const message = result.message.replace(/\n/g, "<br>")
      printMessage(message)
      break
    }
  }
  if (result.error) {
    switch (result.error) {
      case "syntax":
        printMessage(`<p class="error">Unknown input.<p>${INSTRUCTIONS}`, "html")
        break

      default:
        printMessage(`<p class="error">Unknown error.<p>${INSTRUCTIONS}`, "html")
        break
    }
  }

  const roomId = result.room
  const description = result.description.trim().replace(/\n/g, "<br>")

  const isRoomChanged = roomId !== lastRoomId
  lastRoomId = roomId
  if (isRoomChanged) printMessage(description, "description")
  result.agents.filter((agent) => agent.message).forEach((agent) => printMessage(agent.message, "agent-message"))

  addTouchControls(result)

  const path: SVGPathElement = revealRoom(roomId)
  moveAvatar(path.getAttribute("d"))
  result.exits.forEach((exit) => revealRoom(exit.door.id))

  if (turn > 2) requestAnimationFrame(updateMessageScroll)
}

const getSvgBounds = (svg: SVGElement) => {
  const paths = svg.querySelectorAll("path")
  type Bound = {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }

  const reduceToBound = (bound: Bound, [x, y]: [number, number]): Bound => {
    const boundleft = bound.left ?? x
    const boundright = bound.right ?? x
    const boundtop = bound.top ?? y
    const boundbottom = bound.bottom ?? y

    const left = boundleft > x ? x : boundleft
    const right = boundright < x ? x : boundright
    const top = boundtop > y ? y : boundtop
    const bottom = boundbottom < y ? y : boundbottom

    return { left, right, top, bottom }
  }

  const bounds = Array.from(paths)
    .map((path) => path.getAttribute("d"))
    .flatMap((d) => d.match(/[\d.-]*,[\d.-]*/g))
    .map((point) => point.split(",").map((p) => parseFloat(p)))
    .reduce(reduceToBound, {})

  return bounds
}

/** Void function that alters the svg in a consistent way for display */
const normalizeMapSvg = (svg: SVGElement) => {
  const setSvgAttributes = (svg: SVGElement) => {
    svg.setAttribute("id", "dungeon-svg")
    const gTransform = svg.querySelector(`g[transform]`) as SVGGElement
    gTransform.setAttribute("id", "dungeon-layer")

    const gDungeon = gTransform.querySelector("g:nth-of-type(2)")
    gDungeon.setAttribute("id", "dungeon-map")

    svg.querySelector("rect").removeAttribute("fill") // the background of the dungeon should be controlled by the page

    // Fit the SVG's viewBox to its content
    const bounds = getSvgBounds(svg)
    const viewBox = `${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`

    // replace width, height properties with viewBox for all elements that have them
    const widthHeights = [...Array.from(svg.querySelectorAll("[width], [height]")), svg]
    widthHeights.forEach((g) => {
      g.removeAttribute("width")
      g.removeAttribute("height")
      g.setAttribute("viewBox", viewBox)
    })

    // remove transformations
    Array.from(svg.querySelectorAll("[transform]")).forEach((e) => e.removeAttribute("transform"))

    // This normalizes the apparent size of the rooms no matter the size of the map
    const width = bounds.right - bounds.left
    svg.style.width = `${width}px`
  }

  // remove non-map layers (notes, title, legends, etc)
  const removeNonMapLayers = (g: SVGGElement) => {
    const siblingLayer = g.nextElementSibling
    if (siblingLayer) {
      siblingLayer.remove()
      removeNonMapLayers(g)
    }
  }

  const addMaskLayerToMap = (svg: SVGElement): void => {
    const dungeonMap = svg.querySelector("#dungeon-layer")
    dungeonMap.setAttribute("mask", "url(#map-mask)")
    const mapMask = document.createElementNS("http://www.w3.org/2000/svg", "mask")
    mapMask.setAttribute("id", "map-mask")
    mapMask.setAttribute("fill", "#FFFFFF")
    dungeonMap.parentNode.insertBefore(mapMask, dungeonMap)
  }

  const addAvatarLayer = (svg: SVGElement): void => {
    const dungeonLayer = svg.querySelector("#dungeon-layer")
    const avatarLayer = document.createElementNS("http://www.w3.org/2000/svg", "g")
    avatarLayer.setAttribute("id", "avatar-layer")
    dungeonLayer.insertAdjacentElement("afterend", avatarLayer)
    const avatar = document.getElementById("avatar-icon").cloneNode(true) as SVGElement
    avatar.setAttribute("id", "avatar")
    avatarLayer.appendChild(avatar)
  }

  setSvgAttributes(svg)
  removeNonMapLayers(svg.querySelector("#dungeon-layer") as SVGGElement)
  addMaskLayerToMap(svg)
  addAvatarLayer(svg)
}

/** Map user input to gameLoop actions */
const getAction = (key: string): Action => {
  const mapping: { [key: string]: Action } = {
    arrowdown: "south",
    arrowleft: "west",
    arrowright: "east",
    arrowup: "north",
    a: "west",
    d: "east",
    i: "info",
    q: "quit",
    s: "south",
    u: "use",
    v: "attack",
    w: "north",
    x: "search",
  }
  if (/^\d$/.test(key)) return key as Action
  return mapping[key] ?? "noop"
}

const gameLoop = async ([mapSvgData, dungeonData]: [string, Dungeon]) => {
  // init ui
  const svgContainer = document.querySelector("div#map-container") as HTMLDivElement
  const svg = displayMap(mapSvgData, svgContainer)
  if (!svg) {
    throw new Error(`Svg data is corrupt in ${dungeonData.title}`)
  }
  normalizeMapSvg(svg)
  const resizeEventListener = () => centerAvatar()
  window.addEventListener("resize", resizeEventListener)

  // init essential display functions
  const paths = getSVGPaths(svg)
  const mask = svg.querySelector("#map-mask") as SVGMaskElement
  const revealRoom = revealRoomFunc(paths, mask)
  const presentResult = presentResultFunc(revealRoom)

  // init game loop functions
  const dungeon: Dungeon = parseDungeon(dungeonData)
  const inputToGame = game(dungeon)
  const initResult = inputToGame("init")
  presentResult(initResult)

  const getNextInput = async (): Promise<Action | string> => {
    const keyboardPromise = new Promise<Action | string>((resolve) => {
      const onKeyDownListener = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        const isValid = /^[a-z#?1-9]$/.test(key) || key.startsWith("arrow")
        if (!isValid) {
          event.preventDefault()
          getNextInput().then(resolve)
        } else resolve(key)
      }
      document.addEventListener("keydown", onKeyDownListener, { once: true })
    })

    const touchPromise = new Promise<Action | string>((resolve) => {
      // get the control elements
      const controlElements = document.querySelectorAll(".control")

      // add a touch event listener to each control element
      controlElements.forEach((control: HTMLElement) => {
        control.addEventListener(
          "click",
          (event) => {
            // prevent the default touch event behavior
            event.preventDefault()

            // once touched, remove the event listeners and classes from all exit elements
            controlElements.forEach((control: HTMLElement) => {
              control.removeEventListener("click", null)
            })
            // resolve the getNextInput promise with the exit direction
            resolve(control.dataset.command.toString())
          },
          { once: true }
        )
      })
    })
    return await Promise.race([keyboardPromise, touchPromise])
  }

  const innerGameLoop = async (oldResult: GameOutput): Promise<GameOutput> => {
    const oldTouchControls = document.querySelectorAll(".control")
    Array.from(oldTouchControls)
      .filter((oldControl: HTMLLIElement) => parseInt(oldControl.dataset.turn) < oldResult.turn)
      .forEach((oldControl: HTMLLIElement) => oldControl.remove())

    const input = await getNextInput()
    const isKey = input.length === 1 || input.startsWith("arrow")
    const action = isKey ? getAction(input) : input

    if (input === "#") paths.forEach((_, i) => revealRoom(i))
    else if (input === "?") printMessage(INSTRUCTIONS, "html")
    else if (action === "noop") {
      printMessage(`<p class="error">Unknown command '${input}'</p>${INSTRUCTIONS}`, "html")
    }

    const pressedOutKey = (input: string, exits: Exit[]) => {
      const isExitKey = isKey && exitDirections.some((direction) => action === direction)
      if (!isExitKey) return false
      const outExits = exits.filter((exit) => exit.to === "outside")
      if (!outExits) return false
      return outExits.some((exit) => exit.towards === action)
    }
    const isOutKeyPressed = pressedOutKey(input, oldResult.exits)
    if (isOutKeyPressed) printMessage("You attempt to leave the dungeon. Press 'q' to quit.")
    const inputAction = isOutKeyPressed ? "noop" : action

    const result: GameOutput = inputToGame(inputAction)
    presentResult(result)

    if (result.end) {
      window.removeEventListener("resize", resizeEventListener)
      return result
    } else {
      requestAnimationFrame(updateMessageScroll)
      return innerGameLoop(result)
    }
  }

  const finalGameOutput = (await innerGameLoop(initResult)) as GameResult
  return finalGameOutput
}

const getSelectedDungeon = (selectId: string) => {
  const select = document.getElementById(selectId) as HTMLSelectElement
  if (select.value !== "") return select.value
  const options = select.querySelectorAll("option")
  const randomOption = options[Math.floor(Math.random() * options.length)]
  return randomOption.value
}

const deselectDungeon = () => {
  const selectElement = document.getElementById("dungeon-select") as HTMLSelectElement
  const optionElement = selectElement.options[selectElement.selectedIndex]
  if (optionElement) optionElement.selected = false
}

const startGame = async (startDungeon?: string) => {
  const selectedDungeon = startDungeon ?? getSelectedDungeon("dungeon-select")
  deselectDungeon()
  try {
    const gameDataFiles = await loadFiles(selectedDungeon)
    const result = await gameLoop(gameDataFiles)
    return gameEnd(result)
  } catch (error) {
    console.error(error)
  }
}

const tryRandom = () => {
  deselectDungeon()
  startGame()
}

let tryAgain: EventListener = () => startGame()

const showGameSummary = ({
  artifact,
  artifactFound,
  boss,
  defeatedBy,
  enemiesDefeated,
  moreSecrets,
  moreTreasures,
  title,
  treasuresFound,
  endResult,
}: GameResult): void => {
  const gameSummary = document.getElementById("game-summary")!
  const defeatGraphic = document.getElementById("defeat-graphic")!
  const victoryGraphic = document.getElementById("victory-graphic")!
  const escapeGraphic = document.getElementById("escape-graphic")!
  const gameResultElement = document.getElementById("game-result")!
  const defeatedByHeader = document.getElementById("defeated-by")!
  const defeatedByUL = document.getElementById("defeated-by-list")!
  const enemiesDefeatedUL = document.getElementById("enemies-defeated")!
  const treasuresFoundUL = document.getElementById("treasures-found")!
  const moreTreasuresSecrets = document.getElementById("more-treasures-secrets")!

  document.querySelectorAll(".game-result").forEach((item) => item.remove())

  gameResultElement.textContent =
    endResult === "victory"
      ? `Victory in The ${title}`
      : endResult === "defeat"
      ? `Defeat in The ${title}`
      : `Escape from The ${title}`

  // the three ending states are:
  // -victory (alive, and destroyed boss and/or all enemies)
  // -defeat (killed by enemy)
  // -escape (quit without victory)
  defeatGraphic.classList.add("hide")
  escapeGraphic.classList.add("hide")
  victoryGraphic.classList.add("hide")

  switch (endResult) {
    case "victory":
      victoryGraphic.classList.remove("hide")
      break
    case "defeat":
      defeatGraphic.classList.remove("hide")
      break
    case "escape":
      escapeGraphic.classList.remove("hide")
      break
  }

  if (endResult !== "defeat" && artifact) {
    const message = `You ${artifactFound ? "recovered" : "did not recover"} ${toThe(artifact)}${
      artifactFound ? "!" : ""
    }`
    const artifactResult = document.createElement("p")
    artifactResult.classList.add("game-result")
    artifactResult.innerText = message
    gameResultElement.insertAdjacentElement("afterend", artifactResult)
  }

  if (boss) {
    const message = endResult === "victory" ? `You defeated ${toThe(boss)}!` : `You did not defeat ${toThe(boss)}!`
    const bossResult = document.createElement("p")
    bossResult.classList.add("game-result")
    bossResult.innerText = message
    gameResultElement.insertAdjacentElement("afterend", bossResult)
  }

  const defeatedByList = defeatedBy
    ? tallyArray(defeatedBy).map(([count, enemy]) => (count === 1 ? enemy : addCount(count, enemy)))
    : []

  defeatedByHeader.textContent = endResult === "defeat" ? "You were defeated by:" : ""
  defeatedByUL.innerHTML = defeatedByList.map((enemy) => `<p>${enemy}</p>`).join("")

  const enemiesList = tallyArray(enemiesDefeated).map(([count, enemy]) =>
    count === 1 ? enemy : addCount(count, enemy)
  )

  enemiesDefeatedUL.innerHTML =
    enemiesList.length === 0 ? "<p>none</p>" : enemiesList.map((listItem: string) => `<p>${listItem}</p>`).join("")

  const treasuresList = tallyArray(treasuresFound).map(([count, treasure]) =>
    count === 1 ? treasure : addCount(count, treasure)
  )

  treasuresFoundUL.innerHTML = treasuresList.length
    ? treasuresList.map((treasure) => `<p>${treasure}</p>`).join("")
    : "<p>none</p>"

  if (endResult !== "defeat") {
    if (moreSecrets && moreTreasures)
      moreTreasuresSecrets.textContent = `There are more secrets and treasures to be discovered in The ${title}`
    else if (moreSecrets) moreTreasuresSecrets.textContent = `There are more secrets to be discovered in The ${title}`
    else if (moreTreasures)
      moreTreasuresSecrets.textContent = `There are more treasures to be discovered in The ${title}`
  }

  gameSummary.classList.remove("hide")

  const closeButton = document.getElementById("game-summary-close-button")

  closeButton.addEventListener("click", () => {
    gameSummary.classList.add("hide")
  })

  const tryAgainButton = document.getElementById("try-again")
  tryAgainButton.removeEventListener("click", tryAgain)
  tryAgain = () => {
    const filename = title.toLowerCase().replaceAll(" ", "_")
    startGame(filename)
  }
  tryAgainButton.addEventListener("click", tryAgain)

  const tryRandomButton = document.getElementById("try-random")
  tryRandomButton.removeEventListener("click", tryRandom)
  tryRandomButton.addEventListener("click", tryRandom)

  const content = document.querySelector(".game-summary-content")!
  content.addEventListener("click", (event) => {
    event.stopPropagation()
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const gameEnd = (result: GameResult) => {
  const gameSection = document.querySelector("section#game")
  gameSection.classList.add("hide")

  const menuSection = document.querySelector("section#menu")
  menuSection.classList.remove("hide")

  if (result.turn > 2) showGameSummary(result)
}

startButton.addEventListener("click", () => startGame())
startGame()
