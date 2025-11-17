const mongoose = require('mongoose');

const userVisitSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true, unique: true },
  userAgent: { type: String },
  firstVisit: { type: Date, default: Date.now },
  lastVisit: { type: Date, default: Date.now },
  totalTimeSpent: { type: Number, default: 0 }, // in seconds
  visitCount: { type: Number, default: 1 }
});

module.exports = mongoose.model('UserVisit', userVisitSchema);
