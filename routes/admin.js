const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const Video = require("../models/Video");
const Message = require('../models/Message');
const UserVisit = require('../models/UserVisit');
const Settings = require('../models/Settings');


// Middleware
function isAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/admin/login");
} 

router.get("/login", (req, res) => {
  res.render("adminLogin");
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = await bcrypt.compare(
    password,
    process.env.ADMIN_PASSWORD_HASH
  );

  if (validUser && validPass) {
    req.session.admin = true;
    req.flash('success', 'Logged in successfully!');
    res.redirect("/admin/dashboard");
  } else {
    req.flash('error', 'Invalid login');
    res.redirect("/admin/login");
  }
});

router.get('/dashboard', isAdmin, async (req, res) => {
  const videos = await Video.find();
  const message = await Message.findOne();
  const userVisits = await UserVisit.find().sort({ lastVisit: -1 }).limit(50);
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ defaultTitlePrefix: 'Video', lastVideoNumber: 0 });
  }
  res.render('adminDashboard', { videos, message, userVisits, settings });
});


router.post("/add", isAdmin, async (req, res) => {
  let { youtubeUrl, type, title, scheduledStartDate, expiryDate } = req.body; // Get scheduling fields
  
  // Get settings and auto-increment title if using default
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ defaultTitlePrefix: '3000', lastVideoNumber: 3000 });
  }
  
  // If title is a number matching the expected next value, auto-increment
  const expectedTitle = String(settings.lastVideoNumber + 1);
  if (title.trim() === expectedTitle) {
    settings.lastVideoNumber += 1;
    title = String(settings.lastVideoNumber);
    await settings.save();
  }

  let youtubeId = null;
  if (type === "video") {
    const match = youtubeUrl.match(
      /(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/
    );
    youtubeId = match ? match[1] : null;
  } else if (type === "playlist") {
    const match = youtubeUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    youtubeId = match ? match[1] : null;
  }

  if (!youtubeId) {
    req.flash('error', 'Invalid YouTube URL.');
    return res.redirect("/admin/dashboard");
  }
  
  // Build video object with scheduling dates (now required)
  const videoData = { title, youtubeId, type };
  
  // Client sends UTC ISO string (e.g., "2025-11-18T13:00:00.000Z" for IST 18:30)
  // new Date() correctly parses ISO and stores as Date in MongoDB (UTC internally)
  if (scheduledStartDate && scheduledStartDate.trim() !== '') {
    videoData.scheduledStartDate = new Date(scheduledStartDate);
    console.log('Scheduled Start saved:', videoData.scheduledStartDate.toISOString(), 
                '(IST:', videoData.scheduledStartDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
  } else {
    req.flash('error', 'Scheduled start date is required.');
    return res.redirect("/admin/dashboard");
  }
  
  if (expiryDate && expiryDate.trim() !== '') {
    videoData.expiryDate = new Date(expiryDate);
    console.log('Expiry saved:', videoData.expiryDate.toISOString(),
                '(IST:', videoData.expiryDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
  } else {
    req.flash('error', 'Expiry date is required.');
    return res.redirect("/admin/dashboard");
  }
  
  // Validate expiry is after start
  if (videoData.expiryDate <= videoData.scheduledStartDate) {
    req.flash('error', 'Expiry date must be after scheduled start date.');
    return res.redirect("/admin/dashboard");
  }
  
  await Video.create(videoData);
  req.flash('success', 'Video/Playlist added!');
  res.redirect("/admin/dashboard");
});

router.post("/delete/:id", isAdmin, async (req, res) => {
  await Video.findByIdAndDelete(req.params.id);
  req.flash('success', 'Deleted successfully!');
  res.redirect("/admin/dashboard");
});

router.post('/update-message', isAdmin, async (req, res) => {
  const { content } = req.body;
  const existing = await Message.findOne();
  if (existing) {
    existing.content = content;
    existing.updatedAt = new Date();
    await existing.save();
  } else {
    await Message.create({ content });
  }
  req.flash('success', 'Message updated!');
  res.redirect('/admin/dashboard');
});

router.post('/update-title-prefix', isAdmin, async (req, res) => {
  const { titlePrefix } = req.body;
  const startNumber = parseInt(titlePrefix) || 3000;
  let settings = await Settings.findOne();
  if (settings) {
    settings.defaultTitlePrefix = String(startNumber);
    settings.lastVideoNumber = startNumber;
    await settings.save();
  } else {
    await Settings.create({ defaultTitlePrefix: String(startNumber), lastVideoNumber: startNumber });
  }
  req.flash('success', 'Starting number updated!');
  res.redirect('/admin/dashboard');
}); 

module.exports = router;
