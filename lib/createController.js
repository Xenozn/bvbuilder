const path = require('path');
const { writeFile, pluralize } = require('./utils');

function createController(name, version) {
    const fileName = `${name}Controller.js`;
    const dirPath = path.join(process.cwd(), 'src', version, 'controllers');
    const className = name.charAt(0).toUpperCase() + name.slice(1);

    const content = `const ${className} = require('../models/${name}Model');


exports.getAll${pluralize(className)} = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const [rows, total] = await Promise.all([
            ${className}.findAllPaging({ limit, offset, search }),
            ${className}.countAll({ search })
        ]);

        res.status(200).json({
            status: "success",
            total_records: total,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

exports.get${className}ById = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await ${className}.findById(id);
        if (!item) return res.status(404).json({ message: "${className} non trouvé" });

        res.status(200).json({ status: "success", data: item });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};`;

    writeFile(dirPath, fileName, content);
}

module.exports = createController;
