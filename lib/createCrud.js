const fs = require('fs-extra');
const path = require('path');
const mysql = require('mysql2/promise');

async function createCrud(name, version) {
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const tableName = `${name}s`;

    // 1. GENERATION DU MODEL
    const modelContent = `const db = require('../../config/db');

const ${className} = {
    findAllPaging: async ({ search, limit, offset }) => {
        let sql = "SELECT * FROM ${tableName} WHERE 1=1";
        const params = [];
        if (search) {
            sql += " AND name LIKE ?";
            params.push(\`%\${search}%\`);
        }
        sql += " LIMIT ? OFFSET ?";
        params.push(limit, offset);
        const [rows] = await db.query(sql, params);
        return rows;
    },

    countAll: async ({ search }) => {
        let sql = "SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1";
        const params = [];
        if (search) {
            sql += " AND name LIKE ?";
            params.push(\`%\${search}%\`);
        }
        const [[{ total }]] = await db.query(sql, params);
        return total;
    },

    findById: async (id) => {
        const [rows] = await db.query("SELECT * FROM ${tableName} WHERE id = ?", [id]);
        return rows[0] || null;
    },

    create: async (data) => {
        const [result] = await db.query("INSERT INTO ${tableName} SET ?", [data]);
        return result.insertId;
    },

    update: async (id, data) => {
        await db.query("UPDATE ${tableName} SET ? WHERE id = ?", [data, id]);
        return true;
    },

    delete: async (id) => {
        const [result] = await db.query("DELETE FROM ${tableName} WHERE id = ?", [id]);
        return result.affectedRows > 0;
    }
};

module.exports = ${className};`;

    // 2. GENERATION DU CONTROLLER
    const controllerContent = `const ${className} = require('../models/${name}Model');

exports.getAll = async (req, res) => {
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
            current_page: page,
            total_pages: Math.ceil(total / limit),
            data: rows
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const item = await ${className}.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Non trouvé" });
        res.status(200).json({ status: "success", data: item });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const id = await ${className}.create(req.body);
        res.status(201).json({ status: "success", data: { id, ...req.body } });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        await ${className}.update(req.params.id, req.body);
        res.status(200).json({ status: "success", message: "Mis à jour" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};
exports.delete = async (req, res) => {
    try {
        const deleted = await ${className}.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Non trouvé" });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};
`;


    // 3. GENERATION DE LA ROUTE (Swagger inclus)
    const routeContent = `const express = require('express');
const router = express.Router();
const ${name}Controller = require('../controllers/${name}Controller');

/**
 * @swagger
 * /api/${version}/${tableName}:
 *   get:
 *     summary: Récupérer la liste des ${tableName} avec pagination et filtres
 *     tags: [${className}s]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Nombre d’éléments par page
 *     responses:
 *       200:
 *         description: Liste paginée des ${tableName}
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
 *                   example: 100
 *                 current_page:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 3
 *                       name:
 *                         type: string
 *                         example: test name
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-15T18:11:48.000Z"
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/', ${name}Controller.getAll);

/**
 * @swagger
 * /api/${version}/${tableName}/{id}:
 *   get:
 *     summary: Récupérer un ${name} par ID
 *     tags: [${className}s]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ${tableName} trouvé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: ${tableName} non trouvé
 */
router.get('/:id', ${name}Controller.getById);


/**
 * @swagger
 * components:
 *   schemas:
 *     ${className}s:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Name"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
 
 
/**
 * @swagger
 * /api/${version}/${tableName}:
 *   post:
 *     summary: Créer un nouveau ${name}
 *     tags:
 *       - ${className}s
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${tableName}s'
 *           example:
 *             name: "Mon nouveau ${name}"
 *     responses:
 *       201:
 *         description: ${name} créé avec succès
 *       401:
 *         description: Non authentifié
 *       400:
 *         description: Requête invalide
 */
router.post('/', ${name}Controller.create);

 
/**
 * @swagger
 * /api/${version}/${tableName}/{id}:
 *   put:
 *     summary: Mettre à jour un ${name}
 *     description: |
 *       Permet de modifier un ${name} existant.
 *     tags:
 *       - ${className}s
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant de l’${name}
 *         schema:
 *           type: integer
 *           example: 12
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nouveau name de l’${name}
 *                 example: "Name."
 *     responses:
 *       200:
 *         description: ${tableName} mis à jour avec succès
 *       403:
 *         description: Accès refusé (droits insuffisants)
 *       404:
 *         description: ${tableName} introuvable
 */
router.put('/:id', ${name}Controller.update);

 
 /**
 * @swagger
 * /api/${version}/${tableName}/{id}:
 *   delete:
 *     summary: Supprimer un ${tableName}
 *     tags: [${className}s]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du ${tableName} à supprimer
 *     responses:
 *       204:
 *         description: Supprimé
 *       404:
 *         description: ${tableName} non trouvé
 */
router.delete('/:id', ${name}Controller.delete);

module.exports = router;
`;



    // ÉCRITURE DES FICHIERS
    const basePath = path.join(process.cwd(), 'src', version);
    await fs.ensureDir(path.join(basePath, 'models'));
    await fs.ensureDir(path.join(basePath, 'controllers'));
    await fs.ensureDir(path.join(basePath, 'routes'));

    await fs.writeFile(path.join(basePath, 'models', `${name}Model.js`), modelContent);
    await fs.writeFile(path.join(basePath, 'controllers', `${name}Controller.js`), controllerContent);
    await fs.writeFile(path.join(basePath, 'routes', `${name}Routes.js`), routeContent);

    // CRÉATION DE LA TABLE SI POSSIBLE
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME
        });
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);

        await connection.end();
    } catch (e) { console.log("⚠️ Table non créée (Vérifiez la DB)"); }
}

module.exports = createCrud;