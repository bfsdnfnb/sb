// Cleanup test videos
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Video = require('./models/Video');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\nCleaning up test videos...');
    
    const result = await Video.deleteMany({ title: { $regex: '^TEST -' } });
    console.log(`✅ Deleted ${result.deletedCount} test video(s)\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

cleanup();
