const jwt = require('jsonwebtoken');
const config = require('../config');

const SECRET = config.jwtSecret; // store in AWS Secrets Manager in prod

const signToken = (user) => {
  return jwt.sign({ uid: user.uid, email: user.email, firstname: user.firstname, lastname: user.lastname, gender: user.gender }, SECRET, { expiresIn: '1h' });
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { signToken, verifyToken };
