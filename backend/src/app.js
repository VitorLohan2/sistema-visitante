const express = require('express');
const cors = require('cors');
const path = require('path');
const { errors } = require('celebrate');
const routes = require('./routes');

const app = express();

/*const allowedOrigins = [
  'https://sistema-visitante.vercel.app', // substitua pela URL correta da Vercel
  'http://localhost:3000'            // útil para desenvolvimento local
];*/

app.use(cors({
  origin: '*',/*allowedOrigins*/
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));
app.use(routes);
app.use(errors());

// Middleware para tratar rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Rota não encontrada' })
});

module.exports = app;
