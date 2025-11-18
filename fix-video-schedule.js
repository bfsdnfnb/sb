// Fix the existing video by adding schedule dates
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Video = require('./models/Video');

async function fixVideo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\nFixing video with schedule dates...\n');

    const video = await Video.findOne({ youtubeId: 'gKgUSEBC4nI' });
    
    if (!video) {
      console.log('❌ Video not found');
      return;
    }

    console.log(`Found video: "${video.title}"`);
    console.log('Current schedule:', {
      start: video.scheduledStartDate,
      expiry: video.expiryDate
    });

    // Set to 18:30 IST today (which is 13:00 UTC)
    const startIST = new Date('2025-11-18T13:00:00.000Z'); // 18:30 IST
    const expiryIST = new Date('2025-11-18T15:00:00.000Z'); // 20:30 IST

    video.scheduledStartDate = startIST;
    video.expiryDate = expiryIST;
    await video.save();

    console.log('\n✅ Video updated:');
    console.log('Start:', startIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Expiry:', expiryIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('\nThe video should now appear at 18:30 IST and disappear at 20:30 IST\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixVideo();
