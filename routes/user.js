const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const Message = require('../models/Message');
const ytpl = require('ytpl');

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;
  const total = await Video.countDocuments();
  const videosRaw = await Video.find().sort({ addedAt: -1 }).skip(skip).limit(limit);
  const message = await Message.findOne();
  const totalPages = Math.ceil(total / limit);

  // Expand playlists into their videos
  let videos = [];
  for (const v of videosRaw) {
    if (v.type === 'playlist') {
      try {
        const playlist = await ytpl(v.youtubeId, { pages: 1 });
        playlist.items.forEach(item => {
          videos.push({
            type: 'video',
            youtubeId: item.id,
            title: item.title
          });
        });
      } catch (e) {
        // If playlist fetch fails, show as playlist
        videos.push(v);
      }
    } else {
      videos.push(v);
    }
  }

  res.render('index', { videos, message, page, totalPages });
});

module.exports = router;
