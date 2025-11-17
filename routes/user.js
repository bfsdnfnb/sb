const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const Message = require('../models/Message');
const UserVisit = require('../models/UserVisit');
const ytpl = require('ytpl');

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const now = new Date();

  // Track user visit
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  try {
    await UserVisit.findOneAndUpdate(
      { ipAddress },
      { 
        $set: { lastVisit: now, userAgent },
        $inc: { visitCount: 1 },
        $setOnInsert: { firstVisit: now }
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Error tracking visit:', err);
  }

  // Fetch all videos and playlists
  const videosRaw = await Video.find().sort({ addedAt: -1 });
  const message = await Message.findOne();

  // Filter videos based on scheduled and expiry dates
  const visibleVideos = videosRaw.filter(v => {
    // Check if video has started (scheduledStartDate is null or in the past)
    const hasStarted = !v.scheduledStartDate || v.scheduledStartDate <= now;
    // Check if video hasn't expired (expiryDate is null or in the future)
    const notExpired = !v.expiryDate || v.expiryDate > now;
    return hasStarted && notExpired;
  });

  // Expand playlists into their videos
  let videos = [];
  for (const v of visibleVideos) {
    if (v.type === 'playlist') {
      try {
        const playlist = await ytpl(v.youtubeId, { pages: Infinity });
        playlist.items.forEach(item => {
          videos.push({
            type: 'video',
            youtubeId: item.id,
            title: item.title
          });
        });
      } catch (e) {
        videos.push(v);
      }
    } else {
      videos.push(v);
    }
  }

  // Paginate the expanded videos array
  const total = videos.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedVideos = videos.slice((page - 1) * limit, page * limit);

  res.render('index', { videos: paginatedVideos, message, page, totalPages });
});

// Track time spent - endpoint to receive heartbeat updates
router.post('/track-time', async (req, res) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const { timeSpent } = req.body; // time in seconds
  
  try {
    await UserVisit.findOneAndUpdate(
      { ipAddress },
      { $inc: { totalTimeSpent: parseInt(timeSpent) || 0 } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating time:', err);
    res.json({ success: false });
  }
});

module.exports = router;
