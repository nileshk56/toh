const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const competitionRoutes = require('./routes/competitions');

const app = express();
app.use(bodyParser.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/competitions', competitionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Competitions service running on port ${PORT}`));

module.exports = app;
