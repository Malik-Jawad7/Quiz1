const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ========== CONFIGURATION ==========
// KHALID USER - SIMPLE CONNECTION
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system';

const JWT_SECRET = 'shamsi_institute_secret_key_2024_production';
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Shamsi Institute Quiz System...');
console.log('🔗 Using user: khalid');
console.log('📡 MongoDB URI (masked):', MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@'));

// ========== CORS ==========
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== MONGODB CONNECTION ==========
console.log('\n🔗 Connecting to MongoDB...');

// SIMPLE CONNECTION - NO COMPLEX SETTINGS
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log(`📊 Database: ${mongoose.connection.name}`);
  console.log(`📍 Host: ${mongoose.connection.host}`);
  console.log(`👤 Connected as: khalid`);
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.error('❌ Please check:');
  console.error('   1. MongoDB Atlas Network Access (0.0.0.0/0)');
  console.error('   2. User khalid password (khalid123)');
  console.error('   3. Internet connectivity');
});

// Connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

// ========== DATABASE SCHEMAS ==========
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  score: Number,
  percentage: Number,
  totalQuestions: Number,
  correctAnswers: Number,
  attempted: Number,
  passed: Boolean,
  submittedAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{ text: String, isCorrect: Boolean }],
  marks: { type: Number, default: 1 }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'admin' }
});

// Create models
const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);

// ========== ROUTES ==========

// Root endpoint
app.get('/', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System',
    version: '2.1.0',
    database: state === 1 ? 'Connected ✅' : 'Disconnected ❌',
    state: state,
    stateText: states[state] || 'unknown',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      adminLogin: 'POST /admin/login',
      register: 'POST /api/register',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    message: state === 1 ? '✅ Server & MongoDB running' : '✅ Server running (MongoDB disconnected)',
    database: state === 1 ? 'Connected' : 'Disconnected',
    state: state,
    stateText: states[state] || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test MongoDB connection
app.get('/api/test', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    
    if (state === 1) {
      // Test with ping command
      await mongoose.connection.db.admin().command({ ping: 1 });
      
      res.json({
        success: true,
        message: '🎉 CONGRATULATIONS! MongoDB is connected!',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        user: 'khalid',
        state: 'connected'
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB is ' + ['disconnected','connected','connecting','disconnecting'][state],
        state: state,
        suggestion: 'Check MongoDB Atlas settings for user khalid'
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: 'Error: ' + error.message,
      state: mongoose.connection.readyState
    });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login:', username);
    
    // Default admin credentials
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { username: 'admin', role: 'admin' }
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Student Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    console.log('📝 Registration:', { name, rollNumber, category });
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    // Save if DB connected
    if (mongoose.connection.readyState === 1) {
      const registration = new User({
        name,
        rollNumber: `SI-${rollNumber}`,
        category,
        score: 0,
        percentage: 0
      });
      
      await registration.save();
    }
    
    res.json({
      success: true,
      message: 'Registration successful',
      data: { name, rollNumber: `SI-${rollNumber}`, category }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('📚 Fetching questions for:', category);
    
    const questions = await Question.find({ category: category.toLowerCase() });
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for ${category}`
      });
    }
    
    // Shuffle and limit
    const shuffled = questions.sort(() => 0.5 - Math.random());
    const limited = shuffled.slice(0, 50);
    
    res.json({
      success: true,
      questions: limited.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options.map(opt => ({ text: opt.text })),
        marks: q.marks
      })),
      count: limited.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, name, category, score, percentage } = req.body;
    
    console.log('📊 Quiz submission:', { name, score, percentage });
    
    if (!rollNumber || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    const passed = percentage >= 40;
    
    // Save if DB connected
    if (mongoose.connection.readyState === 1) {
      const user = new User({
        name,
        rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
        category,
        score: score || 0,
        percentage: percentage || 0,
        passed,
        submittedAt: new Date()
      });
      
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        name,
        score,
        percentage,
        passed,
        submittedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Shamsi Institute Quiz System');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Production URL: https://backend-one-taupe-14.vercel.app`);
  console.log(`🔗 MongoDB State: ${mongoose.connection.readyState}`);
  console.log(`👤 MongoDB User: khalid`);
  console.log('='.repeat(50));
  console.log('📋 Test immediately:');
  console.log('   https://backend-one-taupe-14.vercel.app/');
  console.log('   https://backend-one-taupe-14.vercel.app/api/test');
  console.log('='.repeat(50));
});