const express = require('express');
const config = require('./config');
const tagRoutes = require('./routes/tagsRoutes');

const app = express();

app.use(express.json());
app.use('/tags', tagRoutes);

app.listen(config.port, () =>
  console.log(`Tags service running on ${config.port}`)
);

module.exports = app; // for Lambda serverless integration
