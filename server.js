const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ========== CONFIGURATION ==========
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/';
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Quiz System...');
console.log('🔗 MongoDB URI:', MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@'));

// CORS
app.use(cors());
app.use(express.json());

// ========== MONGODB CONNECTION WITH RETRY ==========
let isConnected = false;
let retryCount = 0;

const connectDB = async () => {
  try {
    retryCount++;
    console.log(`🔄 Connection attempt ${retryCount}...`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    isConnected = true;
    console.log('✅ MongoDB Connected!');
    console.log('📊 Database:', mongoose.connection.name);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (retryCount < 3) {
      console.log(`🔄 Retrying in 3 seconds...`);
      setTimeout(connectDB, 3000);
    }
  }
};

// Start connection
connectDB();

// Connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected');
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose error:', err.message);
  isConnected = false;
});

// ========== ROUTES ==========

// Root endpoint
app.get('/', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    message: 'Quiz System API',
    database: isConnected ? 'Connected ✅' : 'Disconnected ❌',
    state: state,
    stateText: states[state] || 'unknown',
    retryCount: retryCount
  });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    if (isConnected) {
      res.json({
        success: true,
        message: '✅ MongoDB Connected!',
        database: mongoose.connection.name,
        state: 'connected'
      });
    } else {
      res.json({
        success: false,
        message: '❌ MongoDB Not Connected',
        state: mongoose.connection.readyState,
        retryCount: retryCount
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: 'Error: ' + error.message
    });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Server started on port', PORT);
  console.log('='.repeat(50));
});