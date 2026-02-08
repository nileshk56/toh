const express = require('express');
const config = require('./config');
const recoRoutes = require('./routes/recommendations');

const app = express();

app.use(express.json());
app.use('/recommendations', recoRoutes);
app.use(function(req, res, next) {
    console.log("REQ",`${req.method} ${req.url}`);
    next();
});
app.listen(config.port, () =>
  console.log(`Tags service running on ${config.port}`)
);

module.exports = app; // for Lambda serverless integration
