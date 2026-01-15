const fs = require('fs-extra');
const path = require('path');

function pluralize(str) {
    return str.endsWith('s') ? str : `${str}s`;
}

function writeFile(dirPath, fileName, content) {
    const filePath = path.join(dirPath, fileName);
    fs.ensureDirSync(dirPath);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Créé : ${path.relative(process.cwd(), filePath)}`);
}

module.exports = { pluralize, writeFile };
