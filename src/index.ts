import { Dungeon } from "../script/dungeon";
import { parseDungeon } from "../script/parseDungeon"
import { game, StructuredOut } from "../script/gameLoop";

const INSTRUCTIONS = "Press 'q' to quit. Press 'x' to search. Press the arrow keys or 'w' 'a' 's' or 'd' to move around."

const loadFiles = (
  dungeonName: string,
  onProgress?: (progress: number) => void,
): Promise<[string, Dungeon]> => {
  const imageUrl: string = `dungeons/${dungeonName}.svg`
  const jsonDataUrl: string = `dungeons/${dungeonName}.json`

  return Promise.all([
    fetch(imageUrl),
    fetch(jsonDataUrl),
  ]).then(async (responses) => {
    const [imageResponse, jsonResponse] = responses;
    if (!imageResponse.ok) {
      throw new Error(`Failed to load image file: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    if (!jsonResponse.ok) {
      throw new Error(`Failed to load JSON file: ${jsonResponse.status} ${jsonResponse.statusText}`);
    }
    const imageData = await imageResponse.text();
    const jsonData = await jsonResponse.json();
    const gameSection = document.querySelector("section#game")
    gameSection.classList.remove("hide")

    const menuSection = document.querySelector("section#menu")
    menuSection.classList.add("hide")
    return [imageData, jsonData];
  });
};

const startButton = document.getElementById('start-button');
const onProgress = (value: number) => console.info(`progress: ${value}`)

const displayMap = (svgData: string): SVGElement => {
  const mapContainer = document.querySelector("div#map-container") as HTMLDivElement;
  mapContainer.innerHTML = svgData;
  const svg = mapContainer.querySelector("svg")
  svg.querySelector("rect").setAttribute("fill", "#000000")
  return svg
}

const getBaseMapLayer = () => {
  const baseMapLayer = document.querySelector("#dungeon-map")
  if (baseMapLayer) return baseMapLayer
  const svgEl = document.querySelector('#map-container svg');
  const gTransform = svgEl.querySelector(`g[transform]`)
  const gDungeon = gTransform.querySelector('g:nth-of-type(2)')
  gDungeon.setAttribute("id", "dungeon-map")
  return gDungeon
}

/** Returns an array of paths that correspond to the dungeon rooms and
 * doors. The index of the element corresponds to that room or door's id */
const getSVGPaths = () => {
  const gDungeon = getBaseMapLayer();
  const pathNodes = gDungeon.querySelectorAll('path');
  const paths = Array.from(pathNodes).slice(2)
  return paths
}

const addMaskLayerToMap = (svg: SVGElement): void => {
  const dungeonMap = svg.querySelector("g[transform]")
  dungeonMap.setAttribute("mask", "url(#map-mask)")
  const mapMask = document.createElementNS('http://www.w3.org/2000/svg', "mask")
  mapMask.setAttribute("id", "map-mask")
  mapMask.setAttribute("fill", "#FFFFFF")
  dungeonMap.parentNode.insertBefore(mapMask, dungeonMap)
}

const addAvatarLayer = (svg: SVGElement): void => {
  const dungeonLayer = svg.querySelector("g[transform]")
  const dungeonTransform = dungeonLayer.getAttribute("transform")
  const avatarLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  avatarLayer.setAttribute("transform", dungeonTransform)
  avatarLayer.setAttribute("id", "avatar-layer")
  dungeonLayer.insertAdjacentElement('afterend', avatarLayer)
  const avatar = document.getElementById("avatar-icon").cloneNode(true) as SVGElement
  avatar.setAttribute('id', 'avatar')
  avatarLayer.appendChild(avatar);
}

const revealPathFunc = (paths: SVGPathElement[]) => (id: number) => {
  const pathId = `room-${id}`
  if (document.getElementById(pathId)) return paths[id];
  const dAttr = paths[id].getAttribute("d")
  const mask = document.getElementById("map-mask") as unknown as SVGClipPathElement

  if (mask) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", dAttr);
    path.setAttribute("fill", "#FFFFFF");
    path.setAttribute("id", pathId)
    mask.appendChild(path);
  }
  return paths[id]
}

const moveAvatar = (d: string) => {
  const [cx, cy] = getMidPoint(d)
  const xOffset = -50
  const yOffset = -40
  const avatar = document.getElementById("avatar") as unknown as SVGCircleElement
  avatar.setAttribute('x', `${cx + xOffset}`);
  avatar.setAttribute('y', `${cy + yOffset}`)
  const a = avatar.getBoundingClientRect();

  const { bottom, height, left, right, top, width, x, y } = a
  console.log({ bottom, height, left, right, top, width, x, y })
}

const centerAvatar = () => {

}

const unique = (uq: string[], c: string) => uq.some(u => u === c) ? uq : [...uq, c]
const getCoords = (d: string) => d.split(" ").filter(e => e !== "M" && e !== "L" && e !== "").reduce(unique, []).map(e => e.split(",").map(c => parseInt(c)))
const getMidPoint = (d: string) => getCoords(d).reduce(([sumX, sumY]: [number, number], [x, y]: [number, number]) => [sumX + x, sumY + y], [0, 0]).map(avg => avg / getCoords(d).length);

const printMessage = (message: string, type: string = "message") => {
  const messageScroll = document.getElementById("message-scroll")
  const messageP = document.createElement("p") as HTMLParagraphElement
  messageP.classList.add(type)
  messageP.innerHTML = message
  messageScroll.appendChild(messageP)
  messageScroll.scrollTop = messageScroll.scrollHeight
}

const presentResultFunc = (revealPath: (id: number) => SVGPathElement) => (result: StructuredOut) => {
  if (result.action !== "init" && result.action !== "unknown") printMessage(result.action, "action")
  const message = result.message.replace(/\n/g, "<br>")
  printMessage(message)

  if (result.error) {
    switch (result.error) {
      case "syntax":
        printMessage(`Unknown input. ${INSTRUCTIONS}`, "error")
        break;

      default:
        printMessage(`Unknown error. ${INSTRUCTIONS}`, "error")
        break;
    }
  }

  const description = result.description.replace(/\n/g, "<br>")
  printMessage(description, "description")


  const roomId = result.room
  const path: SVGPathElement = revealPath(roomId)
  moveAvatar(path.getAttribute("d"))
  result.exits.forEach(exit => revealPath(exit.door.id))
}
const modifyMapSvg = (svg: SVGElement) => {
  const gTransform = svg.querySelector(`g[transform]`)

  // unrotate map
  const transform = gTransform.getAttribute("transform")
  const unRotatedTransform = transform.replace(/rotate\(.*\)/, "rotate(0 0 0)")
  gTransform.setAttribute("transform", unRotatedTransform)

  const siblingLayer = gTransform.nextElementSibling
  // Remove non-map layers
  if (siblingLayer) {
    siblingLayer.remove()
    modifyMapSvg(svg)
  }
}

const gameLoop = async ([mapSvgData, dungeonData]: [string, Dungeon]) => {
  // init ui
  const svg = displayMap(mapSvgData)
  addMaskLayerToMap(svg);
  modifyMapSvg(svg);
  addAvatarLayer(svg)

  // init dungeon
  const dungeon = parseDungeon(dungeonData)
  const paths = getSVGPaths()
  const revealPath = revealPathFunc(paths)
  const presentResult = presentResultFunc(revealPath)


  const inputToGame = game(dungeon)

  const initResult = inputToGame('INIT')
  presentResult(initResult)
  printMessage(INSTRUCTIONS)


  const getNextResult = async (): Promise<StructuredOut> => {

    let onKeyDownListener


    const getNextInput = () => new Promise<string>(resolve => {
      onKeyDownListener = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        const mapping: { [key: string]: string } = { a: "w", w: "n", d: "e", s: "s", arrowup: "n", arrowdown: "s", arrowleft: "w", arrowright: "e" }
        const mappedKey = mapping[key] ?? key
        resolve(mappedKey)
      }
      document.addEventListener('keydown', onKeyDownListener, { once: true })
    })


    const key = await getNextInput()
    if (key === '#') getSVGPaths().forEach((_, i) => revealPath(i))

    const result = inputToGame(key)
    presentResult(result)

    if (result.end && result.action !== "quit") {
      printMessage("You attempt to leave the dungeon. Press 'q' to quit.")
    }

    if (result.end && result.action === "quit") {
      document.removeEventListener('keydown', onKeyDownListener)
      return result
    } else {
      return getNextResult()
    }
  }

  return getNextResult()
}

const startGame = async () => {
  const dungeonMenu = document.getElementById("dungeon-select") as HTMLSelectElement
  const selectedDungeon = dungeonMenu.value
  const gameDataFiles = await loadFiles(selectedDungeon, onProgress)
  const result = await gameLoop(gameDataFiles)
  return gameEnd(result)
}



const gameEnd = (result: StructuredOut) => {
  const gameSection = document.querySelector("section#game")
  gameSection.classList.add("hide")

  const menuSection = document.querySelector("section#menu")
  menuSection.classList.remove("hide")
}


startButton.addEventListener('click', startGame)
