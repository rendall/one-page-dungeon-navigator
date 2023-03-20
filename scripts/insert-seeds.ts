import { readFileSync, readdirSync, writeFileSync } from "fs"
import { join } from "path"

const mdFilesDirectory = "./static/dungeons"
const seedsOutputFile = "./lib/seeds.json"

// Read all .md files in the directory
const mdFiles = readdirSync(mdFilesDirectory).filter((filename) => filename.endsWith(".md"))

const seeds: Record<string, number> = {}

mdFiles.forEach((mdFile) => {
  const filePath = join(mdFilesDirectory, mdFile)
  const fileContent = readFileSync(filePath, "utf-8")
  const seedRegex = /seed=(\d+)/

  // Extract the seed value from the .md file
  const match = fileContent.match(seedRegex)
  if (match && match[1]) {
    const seed = parseInt(match[1], 10)
    const fileNameWithoutExtension = mdFile.replace(".md", "")
    seeds[fileNameWithoutExtension] = seed
  } else {
    console.warn(`No seed value found in ${mdFile}`)
  }
})

// Write the seeds to the output file
writeFileSync(seedsOutputFile, JSON.stringify(seeds, null, 2))
console.info(`Seeds saved to ${seedsOutputFile}`)
