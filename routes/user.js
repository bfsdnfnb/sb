const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const Message = require('../models/Message');

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;
  const total = await Video.countDocuments();
  const videos = await Video.find().sort({ addedAt: -1 }).skip(skip).limit(limit);
  const message = await Message.findOne();
  const totalPages = Math.ceil(total / limit);
  res.render('index', { videos, message, page, totalPages });
});

module.exports = router;
