/** Run this command to insert all ./static/dungeons into ./src/index.html as options */
const fs = require("fs")
const path = require("path")

// Directory to search for SVG files
const directoryPath = "./static/dungeons"

// Return only a list of filenames that have both svg and json
const getMatchingFilenames = (dirPath) => {
  const filenames = fs
    .readdirSync(dirPath)
    .map((filename) => path.parse(filename).name)
    .reduce((all, filename) => (all.some((a) => a === filename) ? all : [...all, filename]), [])

  return filenames.filter((filename) => {
    const svgPath = `${dirPath}/${filename}.svg`
    const jsonPath = `${dirPath}/${filename}.json`
    const mdPath = `${dirPath}/${filename}.md`

    const allExists = fs.existsSync(svgPath) && fs.existsSync(jsonPath) && fs.existsSync(mdPath)

    if (!allExists) console.warn(`${filename} does not have all related files`)

    return allExists
  })
}
// Array to store filenames
const filenames = getMatchingFilenames(directoryPath)

// Sort filenames alphabetically
filenames.sort()

// Title Case
const titleCase = (str) => {
  const lowerCase = str.toLowerCase().replace(/_/g, " ")
  const exceptions = [
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "in",
    "nor",
    "of",
    "on",
    "or",
    "so",
    "the",
    "to",
    "up",
    "yet",
  ]
  const words = lowerCase.split(" ")
  for (let i = 0; i < words.length; i++) {
    if (i !== 0 && !exceptions.includes(words[i])) {
      words[i] = words[i][0].toUpperCase() + words[i].substring(1)
    } else {
      words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1)
    }
  }
  return words.join(" ")
}

// Generate HTML option tags from filenames
const options = filenames.map((filename, i) => {
  const name = path.parse(filename).name
  return `<option value="${name}">${titleCase(name)}</option>`
})

// Insert options into HTML file
const indexFilePath = "./src/index.html"
const indexFile = fs.readFileSync(indexFilePath, "utf-8")
const selectStartTag = '<select id="dungeon-select" size="XX" autofocus>'
const selectEndTag = "</select>"
const startIndex = indexFile.indexOf('<select id="dungeon-select"')
const endIndex = indexFile.indexOf(selectEndTag) + selectEndTag.length
const newSelect = selectStartTag.replace("XX", options.length) + options.join("\n") + selectEndTag
const newIndexFile = indexFile.slice(0, startIndex) + newSelect + indexFile.slice(endIndex)
fs.writeFileSync(indexFilePath, newIndexFile)
