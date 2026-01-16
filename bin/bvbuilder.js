#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const { Command } = require('commander');
let inquirer = require('inquirer');
if (inquirer.default) inquirer = inquirer.default;


const createRoute = require('../lib/createRoute');
const createController = require('../lib/createController');
const createModel = require('../lib/createModel');

const program = new Command();
program.name('bvbuilder').version('1.3.0');
program
    .command('init')
    .description('Initialise le projet (Configuration .env et base de données)')
    .action(async () => {
        const rootDir = process.cwd();
        const sourceEnv = path.join(rootDir, '.env.example');
        const destEnv = path.join(rootDir, '.env');

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'dbName',
                message: 'Quel est le nom de votre base de données à initialiser ?',
                suffix: ' (Une nouvelle base de données sera créée sous ce nom)',
                default: 'bv_express_db',
                validate: (input) => input.trim() !== '' ? true : 'Le nom ne peut pas être vide.'
            }
        ]);

        const selectedDbName = answers.dbName;

        if (fs.existsSync(sourceEnv)) {
            let envContent = fs.readFileSync(sourceEnv, 'utf8');
            if (envContent.includes('DB_NAME=')) {
                envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=${selectedDbName}`);
            } else {
                envContent += `\nDB_NAME=${selectedDbName}`;
            }
            fs.writeFileSync(destEnv, envContent);
            console.log(`✅ Fichier .env mis à jour avec DB_NAME=${selectedDbName}`);
        }

        require('dotenv').config({ path: destEnv });

        try {
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASS || 'root',
                multipleStatements: true
            });

            console.log(`🔨 Création de la base de données "${selectedDbName}"...`);
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${selectedDbName}\`;`);
            await connection.query(`USE \`${selectedDbName}\`;`);

            const sqlPath = path.join(__dirname, '../createUser.sql');
            if (fs.existsSync(sqlPath)) {
                const sqlQuery = fs.readFileSync(sqlPath, 'utf8');
                await connection.query(sqlQuery);
                console.log('🚀 Table "users" créée et données initiales insérées !');
            }

            await connection.end();
            console.log('✨ Initialisation terminée avec succès.');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation :', error.message);
        }
    });

program
    .command('crud')
    .argument('<name>')
    .argument('[version]', 'v1')
    .description('Génère un CRUD complet (Model, Controller, Route) sans auth')
    .action(async (name, version) => {
        const createCrud = require('../lib/createCrud');
        await createCrud(name, version);
        console.log(`🚀 CRUD pour "${name}" généré avec succès dans src/${version} !`);
    });


program
    .command('all')
    .argument('<name>')
    .argument('[version]', 'v1')
    .description('Génère Model, Controller et Route')
    .action(async (name, version) => {
        const { needAuth } = await inquirer.prompt([{ type: 'confirm', name: 'needAuth', message: 'Auth requise ?', default: false }]);
        await createModel(name, version);
        createController(name, version);
        await createRoute(name, version, needAuth);
        console.log('✨ Terminé !');
    });

program
    .command('route')
    .argument('<name>')
    .argument('[version]', 'v1')
    .action(async (name, version) => {
        const { needAuth } = await inquirer.prompt([{ type: 'confirm', name: 'needAuth', message: 'Auth ?', default: false }]);
        await createRoute(name, version, needAuth);
    });

program
    .command('controller')
    .argument('<name>')
    .argument('[version]', 'v1')
    .action((name, version) => createController(name, version));

program
    .command('model')
    .argument('<name>')
    .argument('[version]', 'v1')
    .action((name, version) => createModel(name, version));

program.parse(process.argv);
