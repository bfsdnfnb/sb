const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Added title
  youtubeId: String,
  type: { type: String, enum: ['video', 'playlist'] },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);
