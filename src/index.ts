import { Dungeon } from "../script/dungeon";
import { parseDungeon } from "../script/parseDungeon"
import { game, StructuredOut } from "../script/gameLoop";

const loadFiles = (
  dungeonName:string,
  onProgress?: (progress: number) => void,
): Promise<[string, Dungeon]> => {
  const imageUrl: string = `dungeons/${dungeonName}.svg`
  const jsonDataUrl: string = `dungeons/${dungeonName}.json`

  onProgress(0)

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
    onProgress(100)
    const gameSection = document.querySelector("section#game")
    gameSection.classList.remove("hide")

    const menuSection = document.querySelector("section#menu")
    menuSection.classList.add("hide")
    return [imageData, jsonData];
  });
};



const startButton = document.getElementById('start-button');
const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
const onProgress = (progressBar: HTMLProgressElement) => (progressValue: number) => progressBar.value = progressValue

/** Likely the png must be downloaded rather than linked to */
const displayMap = (svgData: string): SVGElement => {
  const mapContainer = document.querySelector("div#map-container") as HTMLDivElement;
  mapContainer.innerHTML = svgData;
  const svg = mapContainer.querySelector("svg")
  svg.querySelector("rect").setAttribute("fill", "#000000")
  return svg
}

const getBaseMapLayer = () => {
  const svgEl = document.querySelector('#map-container svg');
  const gTransform = svgEl.querySelector(`g[transform]`)
  const gDungeon = gTransform.querySelector('g:nth-of-type(2)')
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
  dungeonMap.setAttribute("clip-path", "url(#map-mask)")
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', "clipPath")
  clipPath.setAttribute("id", "map-mask")
  clipPath.setAttribute("fill", "#FFFFFF")
  dungeonMap.appendChild(clipPath)

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
    path.setAttribute("fill", "#ff0000");
    path.setAttribute("id", pathId)
    mask.appendChild(path);
  }
  return paths[id]
}

const moveAvatar = (d: string) => {
  const [x, y] = getMidPoint(d)
  const xOffset = -50
  const yOffset = -40
  const avatar = document.getElementById("avatar") as unknown as SVGCircleElement
  avatar.setAttribute('x', `${x + xOffset}`);
  avatar.setAttribute('y', `${y + yOffset}`)

}
const unique = (uq: string[], c: string) => uq.some(u => u === c) ? uq : [...uq, c]
const getCoords = (d: string) => d.split(" ").filter(e => e !== "M" && e !== "L" && e !== "").reduce(unique, []).map(e => e.split(",").map(c => parseInt(c)))
const getMidPoint = (d: string) => getCoords(d).reduce(([sumX, sumY]: [number, number], [x, y]: [number, number]) => [sumX + x, sumY + y], [0, 0]).map(avg => avg / getCoords(d).length);

const presentResultFunc = (revealPath: (id: number) => SVGPathElement) => (result: StructuredOut) => {
  const messageScroll = document.getElementById("message-scroll")
  const messageP = document.createElement("p") as HTMLParagraphElement
  const message = result.message.replace(/\n/g, "<br>")
  messageP.classList.add("message")
  messageP.innerHTML = message
  messageScroll.appendChild(messageP)

  if (result.error) {
    const errorP = document.createElement("p") as HTMLParagraphElement
    errorP.classList.add("error")
    switch (result.error) {
      case "syntax":
        errorP.textContent = "Unknown input. Use 'x' to search. Use wasd or the arrow keys to move around."
        break;

      default:
        errorP.textContent = "Unknown error."
        break;
    }

    messageScroll.appendChild(errorP)

  }

  const descriptionP = document.createElement("p") as HTMLParagraphElement
  const description = result.description.replace(/\n/g, "<br>")
  descriptionP.classList.add("description")
  descriptionP.innerHTML = description

  messageScroll.appendChild(descriptionP)
  messageScroll.scrollTop = messageScroll.scrollHeight

  const roomId = result.room
  const path: SVGPathElement = revealPath(roomId)
  moveAvatar(path.getAttribute("d"))
  result.exits.forEach(exit => revealPath(exit.door.id))
}
const removeNonMapLayers = (svg: SVGElement) => {
  const gTransform = svg.querySelector(`g[transform]`)
  const siblingLayer = gTransform.nextElementSibling
  if (siblingLayer) {
    siblingLayer.remove()
    removeNonMapLayers(svg)
  }
}

const gameLoop = async ([mapSvgData, dungeonData]: [string, Dungeon]) => {
  const svg = displayMap(mapSvgData)
  addMaskLayerToMap(svg);
  removeNonMapLayers(svg);
  addAvatarLayer(svg)

  const dungeon = parseDungeon(dungeonData)

  const paths = getSVGPaths()

  const revealPath = revealPathFunc(paths)
  const presentResult = presentResultFunc(revealPath)

  const inputToGame = game(dungeon)
  const initResult = inputToGame('INIT')
  presentResult(initResult)



  const getNextResult = async (): Promise<StructuredOut> => {

    let onKeyDownListener


    const getNextInput = () => new Promise<string>(resolve => {
      onKeyDownListener = (event:KeyboardEvent) => {
        const key = event.key.toLowerCase()
        const mapping: { [key: string]: string } = { a: "w", w: "n", d: "e", s: "s", arrowup: "n", arrowdown: "s", arrowleft: "w", arrowright: "e" }
        const mappedKey = mapping[key] ?? key
        resolve(mappedKey)
      }
      document.addEventListener('keydown', onKeyDownListener, { once: true })
    })


    const key = await getNextInput()
    const result = inputToGame(key)
    presentResult(result)

    if (result.end) {
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

  const gameDataFiles = await loadFiles(selectedDungeon, onProgress(progressBar))
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


// startButton.addEventListener('click', () => loadFiles(onProgress).then(gameLoop).then(gameEnd))
// loadFiles((progress) => console.info(`loading progress: ${progress}%`)).then(onFilesLoad)

