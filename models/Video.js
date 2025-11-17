const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Added title
  youtubeId: String,
  type: { type: String, enum: ['video', 'playlist'] },
  addedAt: { type: Date, default: Date.now },
  scheduledStartDate: { type: Date, default: null }, // When video becomes visible
  expiryDate: { type: Date, default: null } // When video stops being visible
});

module.exports = mongoose.model('Video', videoSchema);
 