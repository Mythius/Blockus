// add to package.json
// "start": ".\\node_modules\\electron\\dist\\electron.exe ."
// npx electron-builder

const { app, BrowserWindow } = require('electron');

const name = "";



function createWindow () {
  let win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true
    },
    icon: __dirname + '/site/icon.png'
  })

  win.loadFile('site/index.html')

  win.setMenu(null);
}

app.on('ready', createWindow)

/*

  package.json

  "build":{
    "win": {
      "icon": "site/icon.png"
    }
  }


*/