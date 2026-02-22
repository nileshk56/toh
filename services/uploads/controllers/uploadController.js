const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');
const config = require('../config');

const CACHE_CONTROL = 'public, max-age=31536000';

const createPresigned = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!config.s3.bucket) {
      return res.status(500).json({ message: 'S3 bucket is not configured' });
    }

    const { type, contentType } = req.body || {};
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ message: 'type is required' });
    }

    const s3 = new AWS.S3({
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey
    });

    const safeContentType = typeof contentType === 'string' && contentType.trim()
      ? contentType.trim()
      : 'image/jpeg';

    let key = '';
    let maxBytes = config.s3.listingMaxPhotoBytes;
    let requiredSize = null;
    let extraFields = {};
    let extraConditions = [];

    if (type === 'profile') {
      key = `users/${userId}/profile.jpg`;
      maxBytes = config.s3.profileMaxPhotoBytes;
      requiredSize = '250x250';
      extraFields = {
        'x-amz-meta-width': '250',
        'x-amz-meta-height': '250'
      };
      extraConditions = [
        ['eq', '$x-amz-meta-width', '250'],
        ['eq', '$x-amz-meta-height', '250']
      ];
    } else if (type === 'posts') {
      key = `posts/${userId}/${nanoid(10)}.jpg`;
      maxBytes = config.s3.listingMaxPhotoBytes;
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
    const presigned = await s3.createPresignedPost({
      Bucket: config.s3.bucket,
      Fields: {
        key,
        'Cache-Control': CACHE_CONTROL,
        'Content-Type': safeContentType,
        ...extraFields
      },
      Conditions: [
        ['content-length-range', 0, maxBytes],
        ['starts-with', '$Content-Type', 'image/'],
        ['eq', '$Cache-Control', CACHE_CONTROL],
        ...extraConditions
      ],
      Expires: 300
    });

    const fileUrl = `https://${config.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
console.log("configngk", fileUrl, config)

    res.json({
      upload: presigned,
      fileUrl,
      maxBytes,
      requiredSize
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createPresigned
};
