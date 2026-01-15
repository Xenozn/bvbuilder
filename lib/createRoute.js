const path = require('path');
const { writeFile, pluralize } = require('./utils');

async function createRoute(name, version, needAuth) {
    const fileName = `${name}Routes.js`;
    const dirPath = path.join(process.cwd(), 'src', version, 'routes');
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const pluralName = pluralize(name);
    const routeVar = `${name}Controller`;

    const content = `const express = require('express');
const router = express.Router();
const ${routeVar} = require('../controllers/${name}Controller');
${needAuth ? 'const authMiddleware = require("../../middlewares/authMiddleware");' : ''}

/**
 * @openapi
 * /api/${version}/${pluralName}:
 *   get:
 *     summary: Récupérer la liste des ${pluralName}
 *     tags:
 *       - ${className}s
 *     responses:
 *       '200':
 *         description: Succès
 *       '500':
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/${version}/${pluralName}:
 *   get:
 *     summary: Récupérer la liste des ${pluralName} avec pagination et filtres
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
 *         description: Liste paginée des ${pluralName}
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
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Name
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/${version}/${pluralName}/{id}:
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
 *         description: ${className} trouvé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: ${className} non trouvé
 */
router.get('/', ${needAuth ? 'authMiddleware, ' : ''}${routeVar}.getAll${pluralize(className)});
router.get('/:id', ${needAuth ? 'authMiddleware, ' : ''}${routeVar}.get${className}ById);

module.exports = router;`;

    writeFile(dirPath, fileName, content);
}

module.exports = createRoute;
