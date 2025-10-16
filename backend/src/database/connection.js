const knex = require('knex');
const configuration = require('../../knexfile');

const environment = process.env.NODE_ENV === 'docker' ? 'docker' : (process.env.NODE_ENV || 'development');
const config = configuration[environment];

const connection = knex(config);

module.exports = connection;
