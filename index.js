const { resolve, basename } = require('path');
const {
    app, Menu, Tray, dialog,
} = require('electron');

const { spawn } = require('child_process');
const fixPath = require('fix-path');
const fs = require('fs');

const Store = require('electron-store');
const { shell } = require('electron')
const AutoLaunch = require('auto-launch');


//TODO: Implementar identificação de container docker em executação.
//const { Docker } = require('node-docker-api');
//const docker = new Docker({ socketPath: '/var/run/docker.sock' });

fixPath();

const schema = {
    services: {
        type: 'string',
    },
};

const endpointRepositoryOnline = 'https://bitbucket.org/freterapido/'

let mainTray = {};

if (app.dock) {
    app.dock.hide();
}

const store = new Store({ schema });

function getLocale() {
    return JSON.parse(fs.readFileSync(resolve(__dirname, 'lang/en.json')));
}

function render(tray = mainTray) {
    const storedProjects = store.get('services');
    const services = storedProjects ? JSON.parse(storedProjects) : [];
    const locale = getLocale();

    const itemsx = services.map(({ name, path }) => ({
        label: name,
        submenu: [
            {
                label: locale.open,
                click: () => {
                    spawn('code', [path], { shell: true });
                },
            },
            {
                label: locale.folder,
                click: async () => {
                    await shell.showItemInFolder(path + '/' + name)
                },
            },
            {
                label: locale.repository,
                click: async () => {
                    await shell.openExternal(endpointRepositoryOnline + name)
                },
            },
            {
                label: locale.start,
                click: () => {
                    console.log("Start Project Command")
                },
            },
            {
                label: locale.stop,
                click: () => {
                    console.log("Finish Project Command")
                },
            },
        ],
    }));

    // Como são muitos microserviços, não consegui uma maneira de colocar um scroll na janela quando 
    // listo todos junts, a solução provisória foi colocar em grupos de 15 e lista em submenu.
    //TODO: Listar os serviços de uma forma melhor, e mais bem distribuida, talvez categorizando por tipo de projeto.
    var a = itemsx, chunk
    var arrayOfArrays = [];
    while (a.length > 0) {
        chunk = a.splice(0, 15)
        arrayOfArrays.push({
            label: "services",
            menu: chunk
        });
    }

    const items = arrayOfArrays.map(({ label, menu }, index) => ({
        label: label,
        submenu: menu,
    }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: locale.add,
            click: () => {
                const result = dialog.showOpenDialog({ properties: ['openDirectory'] });

                if (!result) return;
                const [path] = result;

                fs.readdir(path, (err, sub) => {
                    if (!err) {
                        var subPath, subName = ""
                        var lists = []

                        sub.map(sub => {
                            subPath = path + '/' + sub
                            subName = basename(subPath);
                            // Lista somente diretorios que possuem a arquivo "Makefile"
                            // foi uma forma que encontrei de não listar pasta que não são serviços
                            if (fs.existsSync(subPath + "/Makefile")) {
                                lists.push({
                                    path: subPath,
                                    name: subName,
                                })
                            }
                        });

                        store.set('services', JSON.stringify(lists))
                    }
                    render();
                });

                render();
            },
        },
        {
            type: 'separator',
        },
        ...items,
        {
            type: 'separator',
        },
        {
            type: 'normal',
            label: locale.close,
            role: 'quit',
            enabled: true,
        },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', tray.popUpContextMenu);
}

// Habilita auto inicializar com o sistema
var autoLauncher = new AutoLaunch({
    name: "ManagerMicroServiceTray"
});

autoLauncher.isEnabled().then(function(isEnabled) {
  if (isEnabled) return;
   autoLauncher.enable();
}).catch(function (err) {
  throw err;
});

app.on('ready', () => {
    mainTray = new Tray(resolve(__dirname, 'icon.png'));
    render(mainTray);
});

