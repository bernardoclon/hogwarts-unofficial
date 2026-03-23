Hooks.once('ready', () => {
  console.log('Hogwarts | Initializing');

  // Register settings
  game.settings.register('hogwarts', 'moduleActive', {
    name: 'Module Active',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => {
      if (value) {
        createCompendiumFolders();
      } else {
        // Optionally, you can add logic here to handle module deactivation
        // For simplicity, we won't remove the compendium folders now
      }
    }
  });
});

Hooks.once('ready', async function() {
  console.log('Hogwarts | Ready');

  // Create folders if module is active
  if (game.settings.get('hogwarts', 'moduleActive')) {
    createCompendiumFolders();
  }
});

// Function to create compendium folders
async function createCompendiumFolders() {
  const folderName = "Hogwarts";
  let folder = game.folders.contents.find(f => f.name === folderName && f.type === "Compendium");
  if (!folder) {
    folder = await Folder.create({
      name: folderName,
      type: "Compendium",
      sorting: "m",
      color: "#371f00"
    });
  }

  // Move packs into the folder
  const packsToMove = [
    "hogwarts.hechizos",
    "hogwarts.actores",
    "hogwarts.objetos"
    ];

  for (const packId of packsToMove) {
    let pack = game.packs.get(packId);
    if (pack) {
      await pack.configure({ folder: folder.id });
    }
  }
}

// Hook into module enable/disable
Hooks.on('controlToken', () => {
  let activeModules = game.modules.filter(m => m.active).map(m => m.id);
  game.settings.set('hogwarts', 'moduleActive', activeModules.includes('hogwarts'));
});