const serverlessExpress = require('@vendia/serverless-express');
const app = require('./server'); // your Express app

exports.handler = serverlessExpress({ app });
