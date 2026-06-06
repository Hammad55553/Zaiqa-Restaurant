const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

function copyFolderRecursiveSync(from, to, exclude = []) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  fs.readdirSync(from).forEach((element) => {
    if (exclude.includes(element)) return;

    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);

    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderRecursiveSync(fromPath, toPath, exclude);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

// 1. Clean existing build folders
console.log('🧹 Cleaning previous preparation directories...');
deleteFolderRecursive(path.join(__dirname, 'server'));
deleteFolderRecursive(path.join(__dirname, 'web-dist'));

// 2. Copy server folder (excluding node_modules and database file to prevent override)
console.log('📦 Copying server files (excluding node_modules and active pos.db)...');
copyFolderRecursiveSync(
  path.join(__dirname, '../server'),
  path.join(__dirname, 'server'),
  ['node_modules', 'pos.db', 'pos.db-journal', 'pos.db-wal']
);

// 3. Copy web assets folder
console.log('📦 Copying compiled web frontend assets...');
copyFolderRecursiveSync(
  path.join(__dirname, '../web/dist'),
  path.join(__dirname, 'web-dist')
);

console.log('✨ Build preparation complete!');
