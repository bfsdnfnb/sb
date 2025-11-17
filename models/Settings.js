const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  defaultTitlePrefix: { type: String, default: 'Video' },
  lastVideoNumber: { type: Number, default: 0 }
});

module.exports = mongoose.model('Settings', settingsSchema);
