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
    settings = await Settings.create({ defaultTitlePrefix: 'Video', lastVideoNumber: 0 });
  }
  
  // If title matches the pattern (prefix + number), auto-increment
  const titlePattern = new RegExp(`^${settings.defaultTitlePrefix} (\\d+)$`);
  if (titlePattern.test(title)) {
    settings.lastVideoNumber += 1;
    title = `${settings.defaultTitlePrefix} ${settings.lastVideoNumber}`;
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
  
  // Build video object with optional scheduling dates
  const videoData = { title, youtubeId, type };
  if (scheduledStartDate && scheduledStartDate.trim() !== '') {
    // datetime-local input provides time in format: "YYYY-MM-DDTHH:mm"
    // When we create a Date object, it interprets this as local time (IST in your case)
    // and stores it as UTC in MongoDB, which is what we want
    videoData.scheduledStartDate = new Date(scheduledStartDate);
    console.log('Scheduled Start Date (IST input):', scheduledStartDate);
    console.log('Stored as UTC:', videoData.scheduledStartDate.toISOString());
    console.log('Will display as IST:', videoData.scheduledStartDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  }
  if (expiryDate && expiryDate.trim() !== '') {
    videoData.expiryDate = new Date(expiryDate);
    console.log('Expiry Date (IST input):', expiryDate);
    console.log('Stored as UTC:', videoData.expiryDate.toISOString());
    console.log('Will display as IST:', videoData.expiryDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
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
  let settings = await Settings.findOne();
  if (settings) {
    settings.defaultTitlePrefix = titlePrefix || 'Video';
    await settings.save();
  } else {
    await Settings.create({ defaultTitlePrefix: titlePrefix || 'Video', lastVideoNumber: 0 });
  }
  req.flash('success', 'Default title prefix updated!');
  res.redirect('/admin/dashboard');
}); 

module.exports = router;
