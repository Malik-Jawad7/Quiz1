// test-mongodb.js
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...');

const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

async function test() {
  try {
    console.log('Trying to connect...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    console.log('✅ SUCCESS! Connected to MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('Test completed!');
    
  } catch (error) {
    console.log('❌ FAILED! Error:', error.message);
    console.log('Error name:', error.name);
    console.log('Error code:', error.code);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 IP whitelist issue in MongoDB Atlas');
    }
    if (error.message.includes('bad auth')) {
      console.log('💡 Wrong username/password');
    }
  }
}

test();
