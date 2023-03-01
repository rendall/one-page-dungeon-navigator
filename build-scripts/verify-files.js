const fs = require("fs")
const path = require("path")
const directoryPath = "./static/dungeons"
const parseDungeon = require("../script/parseDungeon")

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error(err)
    return
  }

  const svgFiles = files.filter((file) => path.extname(file) === ".svg")
  const jsonFiles = files.filter((file) => path.extname(file) === ".json")

  if (svgFiles.length !== jsonFiles.length)
    throw new Error(`Number of files do not match: ${svgFiles.length} svgs and ${jsonFiles.length} jsons`)

  svgFiles.forEach((file, i) => {
    fs.readFile(path.join(directoryPath, file), "utf-8", (err, data) => {
      if (err) {
        console.error(`${i} Error reading SVG file ${file}:`, err)
        return
      }

      // check that the file is not empty
      if (!data.trim()) {
        console.error(`${i} SVG file ${file} is empty`)
        return
      }

      // add any other SVG health checks here

      console.log(`${i} SVG file ${file} is healthy`)
    })
  })

  jsonFiles.forEach((file, i) => {
    fs.readFile(path.join(directoryPath, file), "utf-8", (err, data) => {
      if (err) {
        console.error(`${i} Error reading JSON file ${file}:`, err)
        return
      }

      try {
        // try to parse the file as JSON
        const json = JSON.parse(data)
        parseDungeon.parseDungeon(json)

        // add any other JSON health checks here

        console.log(`${i} JSON file ${file} is healthy`)
      } catch (e) {
        console.error(`${i} JSON file ${file} is invalid:`, e)
      }
    })
  })

  console.log(`${svgFiles.length} total number for each file type`)
})
