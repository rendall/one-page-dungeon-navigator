import { spawn } from "child_process"
import { readdirSync, statSync, watchFile } from "fs"
import { join, extname } from "path"

const watchFolders = ["./src", "./scripts", "./lib"]

function runESLint() {
  const eslint = spawn("npx", ["eslint", ".", "--ext", ".ts"], {
    stdio: "inherit",
  })

  eslint.on("error", (error) => {
    console.error(`Failed to run ESLint: ${error.message}`)
  })
}

function clearTerminal() {
  const clearCommand = process.platform === "win32" ? "cls" : "clear"
  const clear = spawn(clearCommand, [], { stdio: "inherit" })

  clear.on("error", (error) => {
    console.error(`Failed to clear the terminal: ${error.message}`)
  })
}

function watchFolder(folderPath) {
  readdirSync(folderPath).forEach((file) => {
    const fullPath = join(folderPath, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      watchFolder(fullPath)
    } else if (extname(fullPath) === ".ts") {
      watchFile(fullPath, () => {
        console.info(`File changed: ${fullPath}`)
        clearTerminal()
        runESLint()
      })
    }
  })
}

console.info("Watching TypeScript files for changes...")
watchFolders.forEach((folder) => watchFolder(folder))
