import { Dungeon } from "../script/dungeon"
import { parseDungeon } from "../script/parseDungeon"
import { game, GameOutput } from "../script/gameLoop"

const INSTRUCTIONS =
  "Press 'q' to quit. Press 'x' to search. Press the arrow keys or 'w' 'a' 's' or 'd' to move around."

const loadFiles = (dungeonName: string, onProgress?: (progress: number) => void): Promise<[string, Dungeon]> => {
  const imageUrl: string = `dungeons/${dungeonName}.svg`
  const jsonDataUrl: string = `dungeons/${dungeonName}.json`

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
const onProgress = (value: number) => console.info(`progress: ${value}`)

const displayMap = (svgData: string): SVGElement => {
  const mapContainer = document.querySelector("div#map-container") as HTMLDivElement
  mapContainer.innerHTML = svgData
  const svg = mapContainer.querySelector("svg")
  svg.setAttribute("id", "dungeon-svg")
  svg.querySelector("rect").removeAttribute("fill") // the background of the dungeon should be controlled by the page
  return svg
}

const getBaseMapLayer = () => {
  const baseMapLayer = document.querySelector("#dungeon-map")
  if (baseMapLayer) return baseMapLayer
  const svgEl = document.querySelector("#dungeon-svg")
  const gTransform = svgEl.querySelector("#dungeon-layer") ?? svgEl.querySelector(`g[transform]`)
  const gDungeon = gTransform.querySelector("g:nth-of-type(2)")
  gDungeon.setAttribute("id", "dungeon-map")
  return gDungeon
}

/** Returns an array of paths that correspond to the dungeon rooms and
 * doors. The index of the element corresponds to that room or door's id */
const getSVGPaths = () => {
  const gDungeon = getBaseMapLayer()
  const pathNodes = gDungeon.querySelectorAll("path")
  const paths = Array.from(pathNodes).slice(2)
  return paths
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

const revealPathFunc = (paths: SVGPathElement[]) => (id: number) => {
  const pathId = `room-${id}`
  if (document.getElementById(pathId)) return paths[id]
  const dAttr = paths[id].getAttribute("d")
  const mask = document.getElementById("map-mask") as unknown as SVGClipPathElement

  if (mask) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", dAttr)
    path.setAttribute("fill", "#FFFFFF")
    path.setAttribute("id", pathId)
    mask.appendChild(path)
  }
  return paths[id]
}

const moveAvatar = (d: string) => {
  const [cx, cy] = getMidPoint(d)
  const avatar = document.getElementById("avatar") as unknown as SVGCircleElement
  const xOffset = -parseInt(avatar.getAttribute("width")) / 2
  const yOffset = -parseInt(avatar.getAttribute("height")) / 2
  avatar.setAttribute("x", `${cx + xOffset}`)
  avatar.setAttribute("y", `${cy + yOffset}`)
  centerAvatar()
}

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

const unique = (uq: string[], c: string) => (uq.some((u) => u === c) ? uq : [...uq, c])
const getCoords = (d: string) =>
  d
    .split(" ")
    .filter((e) => e !== "M" && e !== "L" && e !== "")
    .reduce(unique, [])
    .map((e) => e.split(",").map((c) => parseInt(c)))
const getMidPoint = (d: string) =>
  getCoords(d)
    .reduce(([sumX, sumY]: [number, number], [x, y]: [number, number]) => [sumX + x, sumY + y], [0, 0])
    .map((avg) => avg / getCoords(d).length)

const printMessage = (message: string, type: string = "message") => {
  const messageScroll = document.getElementById("message-scroll")
  if (type === "clear") {
    messageScroll.innerHTML = message
    return
  }
  const messageP = document.createElement("p") as HTMLParagraphElement
  messageP.classList.add(type)
  messageP.innerHTML = message
  messageScroll.appendChild(messageP)
  messageScroll.scrollTop = messageScroll.scrollHeight
}

const presentResultFunc = (revealPath: (id: number) => SVGPathElement) => (result: GameOutput) => {
  switch (result.action) {
    case "init":
      const [title, subtitle] = result.message.split("\n")
      printMessage(`<h1 class="title">${title}</h1><p class="story">${subtitle}</p>`, "clear")
      break
    case "quit":
    case "unknown":
      break // Do not print these messages. They will be handled below.
    default:
      const message = result.message.replace(/\n/g, "<br>")
      printMessage(result.action, "action")
      if (message.startsWith("You leave the dungeon")) printMessage("You consider leaving.")
      else printMessage(message)
      break
  }
  if (result.error) {
    switch (result.error) {
      case "syntax":
        printMessage(`Unknown input. ${INSTRUCTIONS}`, "error")
        break

      default:
        printMessage(`Unknown error. ${INSTRUCTIONS}`, "error")
        break
    }
  }

  const description = result.description.replace(/\n/g, "<br>")
  printMessage(description, "description")

  const roomId = result.room
  const path: SVGPathElement = revealPath(roomId)
  moveAvatar(path.getAttribute("d"))
  result.exits.forEach((exit) => revealPath(exit.door.id))
}

const getSvgViewBox = (svg: SVGElement) => {
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

  const viewBox = `${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`

  return viewBox
}

const normalizeMapSvg = (svg: SVGElement) => {
  const gTransform = svg.querySelector(`g[transform]`)
  gTransform.setAttribute("id", "dungeon-layer")

  let siblingLayer

  do {
    siblingLayer = gTransform.nextElementSibling
    if (siblingLayer) {
      siblingLayer.remove()
    }
  } while (siblingLayer)

  const viewBox = getSvgViewBox(svg)

  const widthHeights = Array.from(svg.querySelectorAll("[width], [height]"))

    ;[...widthHeights, svg].forEach((g) => {
      g.removeAttribute("width")
      g.removeAttribute("height")
      g.setAttribute("viewBox", viewBox)
    })

  const mapContainer = document.getElementById("map-container")
  const width = mapContainer.getBoundingClientRect().width

  svg.style.width = `${width}px`

  Array.from(svg.querySelectorAll("[transform]")).forEach((e) => e.removeAttribute("transform"))
}

const gameLoop = async ([mapSvgData, dungeonData]: [string, Dungeon]) => {
  // init ui
  const svg = displayMap(mapSvgData)
  normalizeMapSvg(svg)
  addMaskLayerToMap(svg)
  addAvatarLayer(svg)

  // init dungeon
  const dungeon = parseDungeon(dungeonData)
  const paths = getSVGPaths()
  const revealPath = revealPathFunc(paths)
  const presentResult = presentResultFunc(revealPath)

  const inputToGame = game(dungeon)

  const initResult = inputToGame("INIT")
  presentResult(initResult)
  printMessage(INSTRUCTIONS)

  const getNextResult = async (): Promise<GameOutput> => {
    let onKeyDownListener
    const getNextInput = () =>
      new Promise<string>((resolve) => {
        onKeyDownListener = (event: KeyboardEvent) => {
          const key = event.key.toLowerCase()
          const isValidKey = /^[a-z#0-9]$/.test(key) || key.startsWith("arrow")

          if (!isValidKey) {
            event.preventDefault()
            getNextInput().then(resolve)
          } else {
            const mapping: { [key: string]: string } = {
              a: "w",
              w: "n",
              d: "e",
              s: "s",
              arrowup: "n",
              arrowdown: "s",
              arrowleft: "w",
              arrowright: "e",
            }
            const mappedKey = mapping[key] ?? key
            resolve(mappedKey)
          }
        }
        document.addEventListener("keydown", onKeyDownListener, { once: true })
      })

    const key = await getNextInput()
    if (key === "#") getSVGPaths().forEach((_, i) => revealPath(i))

    const result = inputToGame(key)
    presentResult(result)

    if (result.end && result.action !== "quit") {
      printMessage("You attempt to leave the dungeon. Press 'q' to quit.")
    }

    if (result.end && result.action === "quit") {
      document.removeEventListener("keydown", onKeyDownListener)
      return result
    } else {
      return getNextResult()
    }
  }

  return getNextResult()
}

const getSelectedDungeon = (selectId: string) => {
  const select = document.getElementById(selectId) as HTMLSelectElement
  if (select.value !== "") return select.value
  const options = select.querySelectorAll("option")
  const randomOption = options[Math.floor(Math.random() * options.length)]
  return randomOption.value
}

const startGame = async () => {
  const selectedDungeon = getSelectedDungeon("dungeon-select")
  const gameDataFiles = await loadFiles(selectedDungeon, onProgress)
  const result = await gameLoop(gameDataFiles)
  return gameEnd(result)
}

const gameEnd = (result: GameOutput) => {
  const gameSection = document.querySelector("section#game")
  gameSection.classList.add("hide")

  const menuSection = document.querySelector("section#menu")
  menuSection.classList.remove("hide")
}

startButton.addEventListener("click", startGame)
startGame()
