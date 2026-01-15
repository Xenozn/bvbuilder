const path = require('path');
const mysql = require('mysql2/promise');
const { writeFile, pluralize } = require('./utils');

async function createModel(name, version) {
    const fileName = `${name}Model.js`;
    const dirPath = path.join(process.cwd(), 'src', version, 'models');
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const tableName = pluralize(name.toLowerCase());

    // Contenu du fichier model
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
    },
    findById: async (id) => {
        const query = \`SELECT * FROM ${tableName} WHERE id = ?\`;
        const [rows] = await db.query(query, [id]);
        if (!rows.length) return null;
        return rows[0];
    }
};

module.exports = ${className};
`;

    writeFile(dirPath, fileName, content);

    // Créer la table
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
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

        console.log(`🛢️  Table "${tableName}" prête.`);
        await connection.end();
    } catch (err) {
        console.log("Erreur DB:", err.message);
    }
}

module.exports = createModel;
