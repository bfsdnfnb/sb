const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const Video = require("../models/Video");
const Message = require('../models/Message');


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
  res.render('adminDashboard', { videos, message });
});


router.post("/add", isAdmin, async (req, res) => {
  const { youtubeUrl, type, title } = req.body; // Get title from form

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
  await Video.create({ title, youtubeId, type }); // Save title
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

module.exports = router;
