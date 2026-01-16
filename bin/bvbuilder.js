#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const { Command } = require('commander');
let inquirer = require('inquirer');
if (inquirer.default) inquirer = inquirer.default;


const createRoute = require('../lib/createRoute');
const createController = require('../lib/createController');
const createModel = require('../lib/createModel');

const program = new Command();
program.name('bvbuilder').version('1.3.0');

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

program.parse(process.argv);

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
