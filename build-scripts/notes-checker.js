const fs = require('fs');
const path = require('path');

const directoryPath = './static/dungeons/';
const deCap = (str) =>/(writing)/.test(str)? `some ${str.slice(2)}` : `${str.charAt(0).toLowerCase() + str.slice(1)}`
const hasVerb = (str) => /(holds|hides)/.test(str) ? "" : /^\w*s\s/.test(str) ? "are " : "is "
const hereIs = (containsDescription) => `Here ${hasVerb(containsDescription)}${deCap(containsDescription)}`
 
fs.readdir(directoryPath, function(err, files) {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach(function(file) {
    if (path.extname(file) === '.json') {
      const filePath = path.join(directoryPath, file);

      fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) {
          console.error('Error reading file:', err);
          return;
        }

        const json = JSON.parse(data);
        const notes = json.notes.map( note => note.text).map(hereIs);

        notes.forEach(function(note) {
          console.log(note);
        });
      });
    }
  });
});
