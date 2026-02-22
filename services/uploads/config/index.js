const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'default.env') });

// Load environment-specific file
const env = process.env.NODE_ENV || 'local';
const envFile = path.join(__dirname, `${env}.env`);

if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
}

// Export config
const config = {
  nodeEnv: process.env.NODE_ENV || 'local',
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined
  },
  jwtSecret: process.env.JWT_SECRET,
  s3: {
    //bucket: process.env.S3_BUCKET,
    bucket: process.env.S3_BUCKET || 'bmg',
    profileMaxPhotoBytes: Number(process.env.PROFILE_MAX_PHOTO_BYTES || 307200),
    listingMaxPhotoBytes: Number(process.env.LISTING_MAX_PHOTO_BYTES || 512000)
  }
};
console.log("UPLOAS",config);

module.exports = config;
