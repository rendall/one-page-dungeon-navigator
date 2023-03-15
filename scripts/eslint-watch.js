const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const watchFolders = ["./src", "./scripts", "./lib"]

function runESLint() {
  const eslint = spawn("npx", ["eslint", ".", "--ext", ".ts"], {
    stdio: "inherit",
  })

  eslint.on("error", (error) => {
    console.error(`Failed to run ESLint: ${error.message}`)
  })
}

function watchFolder(folderPath) {
  fs.readdirSync(folderPath).forEach((file) => {
    const fullPath = path.join(folderPath, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      watchFolder(fullPath)
    } else if (path.extname(fullPath) === ".ts") {
      fs.watchFile(fullPath, () => {
        console.log(`File changed: ${fullPath}`)
        runESLint()
      })
    }
  })
}

console.log("Watching TypeScript files for changes...")
watchFolders.forEach((folder) => watchFolder(folder))
