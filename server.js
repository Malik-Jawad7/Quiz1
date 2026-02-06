const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ========== SIMPLE CONFIG ==========
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/';
const PORT = 5000;

console.log('🚀 Starting server...');

// CORS
app.use(cors());
app.use(express.json());

// ========== MONGODB CONNECTION ==========
console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB Connected!');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB Error:', err.message);
  console.error('❌ SOLUTION: Create user khalid with password khalid123 in MongoDB Atlas');
});

// ========== SIMPLE ROUTES ==========
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    state: mongoose.connection.readyState
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: mongoose.connection.readyState === 1,
    message: mongoose.connection.readyState === 1 ? 
      '🎉 MONGODB CONNECTED!' : 
      '❌ MongoDB not connected. Create user: khalid / khalid123',
    state: mongoose.connection.readyState
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🌐 Test: https://backend-one-taupe-14.vercel.app/`);
});