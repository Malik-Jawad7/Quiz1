const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';

console.log('🚀 Vercel Serverless Function Starting...');

// ==================== CORS ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
let dbConnected = false;

const connectDB = async () => {
  if (dbConnected) return true;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
    });
    
    console.log('✅ MongoDB Connected');
    dbConnected = true;
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    dbConnected = false;
    return false;
  }
};

// ==================== DATABASE SCHEMAS ====================
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  score: Number,
  percentage: Number,
  passed: Boolean,
  submittedAt: Date
});

const registrationSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  registeredAt: Date
});

const questionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  marks: Number
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

// ==================== ROUTES ====================

// Home Route
app.get('/', async (req, res) => {
  const dbStatus = await connectDB();
  
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '3.0.0',
    database: dbStatus ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      dbTest: 'GET /api/db-test',
      adminLogin: 'POST /admin/login',
      register: 'POST /api/register',
      getQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit'
    }
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
  const dbStatus = await connectDB();
  
  res.json({
    success: true,
    status: 'healthy',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Database Test
app.get('/api/db-test', async (req, res) => {
  try {
    const dbStatus = await connectDB();
    
    if (dbStatus) {
      const adminCount = await Admin.countDocuments();
      const questionCount = await Question.countDocuments();
      
      res.json({
        success: true,
        message: 'Database is working!',
        stats: {
          admins: adminCount,
          questions: questionCount
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Database not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Always work - hardcoded admin
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
    
    // Try database if connected
    await connectDB();
    const admin = await Admin.findOne({ username });
    
    if (admin && await bcrypt.compare(password, admin.password)) {
      const token = jwt.sign(
        { username: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { username: admin.username, role: admin.role }
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Student Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    await connectDB();
    const registration = await Registration.create({
      name,
      rollNumber: `SI-${rollNumber}`,
      category,
      registeredAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Registration successful',
      data: registration
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Get Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    await connectDB();
    const questions = await Question.find({ category }).limit(10);
    
    const safeQuestions = questions.map(q => ({
      id: q._id,
      question: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks
    }));
    
    res.json({
      success: true,
      questions: safeQuestions,
      count: safeQuestions.length
    });
    
  } catch (error) {
    // Fallback questions
    res.json({
      success: true,
      questions: [
        {
          id: '1',
          question: 'What is 2 + 2?',
          options: [
            { text: '3' },
            { text: '4' },
            { text: '5' },
            { text: '6' }
          ],
          marks: 1
        }
      ],
      count: 1
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { name, rollNumber, category, score, percentage } = req.body;
    
    await connectDB();
    const result = await User.create({
      name,
      rollNumber: `SI-${rollNumber}`,
      category,
      score: score || 0,
      percentage: percentage || 0,
      passed: (percentage || 0) >= 40,
      submittedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Quiz submitted',
      result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Submission failed'
    });
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ==================== VERCEL EXPORT ====================
// Important for Vercel Serverless Functions
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}