const express = require('express');
const config = require('./config');
const recoRoutes = require('./routes/recommendations');
const cors = require('cors');

const app = express();

app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/recommendations', recoRoutes);

app.listen(config.port, () =>
  console.log(`Reco service running on ${config.port}`)
);

module.exports = app; // for Lambda serverless integration
