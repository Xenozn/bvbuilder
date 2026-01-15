#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const program = new Command();
program.name('bvbuilder').version('1.2.0');

const pluralize = (str) => str.endsWith('s') ? str : `${str}s`;

// --- FONCTIONS DE GÉNÉRATION PARTAGÉES ---

async function createRoute(name, version, needAuth) {
    const fileName = `${name}Routes.js`;
    const dirPath = path.join(process.cwd(), 'src', version, 'routes');
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const pluralName = pluralize(name);

    const content = `const express = require('express');
const router = express.Router();
const ${name}Controller = require('../controllers/${name}Controller');
${needAuth ? 'const authMiddleware = require("../../middlewares/authMiddleware");' : ''}

/**
 * @openapi
 * /api/${version}/${pluralName}:
 *   get:
 *     summary: Récupérer la liste des ${pluralName}
 *     tags:
 *       - ${className}s
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Numéro de page pour la pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Nombre d’éléments par page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "exemple"
 *         description: Terme de recherche
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 total_records:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/${className}'
 *       500:
 *         description: Erreur serveur
 */

router.get('/', ${needAuth ? 'authMiddleware, ' : ''}${name}Controller.getAll${pluralize(className)});

module.exports = router;`;

    writeFile(dirPath, fileName, content);
}

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
};`;
    writeFile(dirPath, fileName, content);
}

async function createModel(name, version) {
    const fileName = `${name}Model.js`;
    const dirPath = path.join(process.cwd(), 'src', version, 'models');
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const tableName = pluralize(name.toLowerCase());

    const content = `const db = require('../../config/db');

const ${className} = {
    findAllPaging: async ({ search, limit, offset }) => {
        let sql = "SELECT * FROM ${tableName} WHERE 1=1";
        const params = [];
        if (search) { sql += " AND name LIKE ?"; params.push(\`%\${search}%\`); }
        sql += " LIMIT ? OFFSET ?";
        params.push(limit, offset);
        const [rows] = await db.query(sql, params);
        return rows;
    },
    countAll: async ({ search }) => {
        let sql = "SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1";
        const params = [];
        if (search) { sql += " AND name LIKE ?"; params.push(\`%\${search}%\`); }
        const [[{ total }]] = await db.query(sql, params);
        return total;
    }
};
module.exports = ${className};`;

    writeFile(dirPath, fileName, content);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME
        });
        await connection.execute(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`name\` VARCHAR(255) NOT NULL, \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;`);
        console.log(`\x1b[34m🛢️  Table "${tableName}" prête.\x1b[0m`);
        await connection.end();
    } catch (err) { console.log("Erreur DB:", err.message); }
}

// --- COMMANDES CLI ---

// Commande FULL (Les trois en même temps)
program
    .command('all')
    .argument('<name>', 'Nom de la ressource')
    .argument('[version]', 'Version', 'v1')
    .description('Génère Model, Controller et Route en une seule commande')
    .action(async (name, version) => {
        const inquirer = (await import('inquirer')).default;
        const { needAuth } = await inquirer.prompt([{ type: 'confirm', name: 'needAuth', message: 'Auth requise pour la route ?', default: false }]);

        console.log(`\n\x1b[35m🛠️  Génération complète pour : ${name} (${version})\x1b[0m`);
        await createModel(name, version);
        createController(name, version);
        await createRoute(name, version, needAuth);
        console.log(`\x1b[35m✨ Terminé !\x1b[0m\n`);
    });

program
    .command('route')
    .argument('<name>', 'Nom')
    .argument('[version]', 'Version', 'v1')
    .action(async (name, version) => {
        const inquirer = (await import('inquirer')).default;
        const { needAuth } = await inquirer.prompt([{ type: 'confirm', name: 'needAuth', message: 'Auth ?', default: false }]);
        await createRoute(name, version, needAuth);
    });

program
    .command('controller')
    .argument('<name>', 'Nom')
    .argument('[version]', 'Version', 'v1')
    .action((name, version) => createController(name, version));

program
    .command('model')
    .argument('<name>', 'Nom')
    .argument('[version]', 'Version', 'v1')
    .action((name, version) => createModel(name, version));

// Utilitaire
function writeFile(dirPath, fileName, content) {
    const filePath = path.join(dirPath, fileName);
    fs.ensureDirSync(dirPath);
    fs.writeFileSync(filePath, content);
    console.log(`\x1b[32m✅ Créé : ${path.relative(process.cwd(), filePath)}\x1b[0m`);
}

program.parse(process.argv);