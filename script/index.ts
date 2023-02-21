import type { Dungeon } from "./dungeon";
import { inspect } from "util";
import { readdir, readFile } from "fs";
import { extname, join as pathjoin } from "path";
import { createInterface } from "readline";
import { parseDungeon } from "./parseDungeon";



const jsonDirectory = "./dungeons";

const readJsonFilesDirectory = () =>
  new Promise<string[]>((resolve, reject) =>
    readdir(jsonDirectory, (err, files) => {
      if (err) {
        reject(`Error reading directory: ${err}`);
      } else {
        const jsonFiles = files.filter((file) => extname(file) === ".json");
        resolve(jsonFiles);
      }
    })
  );

const promptUser = (jsonFiles: string[]) =>
  new Promise<string>((resolve, reject) => {
    console.log("Choose a JSON file to load:");
    jsonFiles.forEach((file, index) => console.log(`${index + 1}. ${file}`));

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Enter the index number of the file you want to load: ",
      (answer) => {
        rl.close();
        const index = parseInt(answer) - 1;
        if (isNaN(index) || index < 0 || index >= jsonFiles.length) {
          reject("Invalid selection");
        } else {
          resolve(jsonFiles[index]);
        }
      }
    );
  });

const loadJsonFile = (fileName: string) =>
  new Promise<Dungeon>((resolve, reject) => {
    const filePath = pathjoin(jsonDirectory, fileName);
    readFile(filePath, (err, data) => {
      if (err) {
        reject(`Error reading file: ${err}`);
      } else {
        try {
          const jsonData = JSON.parse(data.toString()) as Dungeon;
          resolve(jsonData);
        } catch (e) {
          reject(`Error parsing JSON: ${e}`);
        }
      }
    });
  });

const gameLoop = (dungeon:Dungeon, gameState = {currentRoom:0}):void => {
  const currentRoom = dungeon.rooms?.find(room => room.id === gameState.currentRoom)

}

const app = () =>
  readJsonFilesDirectory()
    .then(promptUser)
    .then(loadJsonFile)
    .then((x) => parseDungeon(x))
    .then((dungeon) => {
      console.log(
        inspect(
          dungeon,
          { depth: 5, colors: true }
        )
      )
      return dungeon
    }).then(gameLoop)
    .catch((err) => {
      console.error(err);
    });

app();


