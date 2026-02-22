const AWS = require('aws-sdk');
const config = require('../config');

const dynamo = new AWS.DynamoDB.DocumentClient({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  //endpoint: config.aws.endpoint // if local, points to localhost
});

module.exports = dynamo;
