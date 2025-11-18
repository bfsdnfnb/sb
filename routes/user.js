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

  // Filter videos based on scheduled and expiry dates (all dates in UTC)
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
            title: item.title,
            // inherit scheduling from the playlist entry
            scheduledStartDate: v.scheduledStartDate || null,
            expiryDate: v.expiryDate || null
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
// Accept JSON and text payloads (sendBeacon sends text/plain)
router.post('/track-time', express.text({ type: '*/*' }), async (req, res) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  let timeSpent = 0;

  try {
    if (!req.body) {
      // No body at all
      timeSpent = 0;
    } else if (typeof req.body === 'string') {
      // Could be JSON string (from sendBeacon) or a plain number string
      try {
        const parsed = JSON.parse(req.body);
        timeSpent = parsed && parsed.timeSpent ? parsed.timeSpent : (Number(req.body) || 0);
      } catch (e) {
        // Not JSON, try parse as number
        timeSpent = Number(req.body) || 0;
      }
    } else if (typeof req.body === 'object') {
      // Already parsed (express.json)
      timeSpent = req.body.timeSpent || 0;
    }

    timeSpent = parseInt(timeSpent) || 0;

    await UserVisit.findOneAndUpdate(
      { ipAddress },
      { $inc: { totalTimeSpent: timeSpent } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating time:', err);
    res.json({ success: false });
  }
});

module.exports = router;
