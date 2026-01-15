const path = require('path');
const { writeFile, pluralize } = require('./utils');

function createController(name, version) {
    const fileName = `${name}Controller.js`;
    const dirPath = path.join(process.cwd(), 'src', version, 'controllers');
    const className = name.charAt(0).toUpperCase() + name.slice(1);

    const content = `const ${className} = require('../models/${name}Model');

exports.getAll${pluralize(className)} = async (req, res) => {
  res.status(200).json({ status: "success", data: [] });
};

exports.get${className}ById = async (req, res) => {
  res.status(200).json({ status: "success", data: null });
};`;

    writeFile(dirPath, fileName, content);
}

module.exports = createController;
