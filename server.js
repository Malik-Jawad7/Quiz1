const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ========== ENVIRONMENT VARIABLES ==========
// SIMPLE CONNECTION STRING - NO EXTRA PARAMETERS
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system';

const JWT_SECRET = 'shamsi_institute_secret_key_2024_production';
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Shamsi Institute Quiz System...');
console.log('🔗 MongoDB URI (masked):', MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@'));

// ========== CORS CONFIGURATION ==========
const corsOptions = {
  origin: [
    'https://quiz2-iota-one.vercel.app',
    'https://quiz2-*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ========== SIMPLE MONGODB CONNECTION ==========
console.log('\n🔗 Connecting to MongoDB...');

// VERY SIMPLE CONNECTION - NO COMPLEX OPTIONS
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log(`📊 Database: ${mongoose.connection.name}`);
  console.log(`📍 Host: ${mongoose.connection.host}`);
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

// Connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

// Track connection state
const isDbConnected = () => mongoose.connection.readyState === 1;

// ========== DATABASE SCHEMAS ==========
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, index: true },
  category: String,
  score: Number,
  percentage: Number,
  totalMarks: Number,
  obtainedMarks: Number,
  correctAnswers: Number,
  totalQuestions: Number,
  attempted: Number,
  passingPercentage: Number,
  passed: Boolean,
  cheatingDetected: Boolean,
  isAutoSubmitted: Boolean,
  submittedAt: { type: Date, default: Date.now, index: true }
});

const registrationSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, index: true },
  category: String,
  registeredAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  category: { type: String, index: true },
  questionText: String,
  options: [{
    text: String,
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Registration = mongoose.model('Registration', registrationSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// ========== DATABASE INITIALIZATION ==========
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Create admin if doesn't exist
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      
      console.log(`✅ Admin user created`);
    } else {
      console.log('✅ Admin user already exists');
    }

    // Initialize config if not exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    } else {
      console.log('✅ Config already exists');
    }

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
  }
}

// Initialize after 3 seconds
setTimeout(async () => {
  if (isDbConnected()) {
    await initializeDatabase();
  }
}, 3000);

// ========== MIDDLEWARES ==========
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Database connection middleware
const checkDbConnection = (req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// ========== ROUTES ==========

// Root endpoint
app.get('/', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.1.0',
    database: isDbConnected() ? 'Connected ✅' : 'Disconnected ❌',
    mongooseState: state,
    stateText: states[state] || 'unknown',
    timestamp: new Date().toISOString(),
    cors: {
      enabled: true,
      origin: 'Multiple origins configured'
    },
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      register: 'POST /api/register',
      adminLogin: 'POST /admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    message: isDbConnected() ? '✅ Server & DB running' : '✅ Server running (DB disconnected)',
    database: isDbConnected() ? 'Connected' : 'Disconnected',
    mongooseState: state,
    stateText: states[state] || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version
  });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    if (isDbConnected()) {
      // Test MongoDB
      await mongoose.connection.db.admin().command({ ping: 1 });
      
      res.json({
        success: true,
        message: '✅ MongoDB is connected and working!',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name))
      });
    } else {
      res.json({
        success: false,
        message: '❌ MongoDB not connected',
        state: mongoose.connection.readyState
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
    
    console.log('🔐 Admin login attempt:', username);
    
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Please try again later.'
      });
    }
    
    // Check in database
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username, 
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: admin.username,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// Student Registration
app.post('/api/register', checkDbConnection, async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    console.log('📝 Registration:', { name, rollNumber, category });
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    // Save registration
    const registration = new Registration({
      name,
      rollNumber: `SI-${rollNumber}`,
      category: category.toLowerCase()
    });
    
    await registration.save();
    
    console.log('✅ Registration successful');
    
    res.json({
      success: true,
      message: 'Registration successful',
      data: {
        name,
        rollNumber: `SI-${rollNumber}`,
        category: category.toLowerCase(),
        registeredAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Get Quiz Questions
app.get('/api/quiz/questions/:category', checkDbConnection, async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('📚 Fetching questions for:', category);
    
    const questions = await Question.find({ category: category.toLowerCase() });
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40, totalQuestions: 50 };
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for ${category} category.`
      });
    }
    
    // Shuffle questions
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    const limitedQuestions = shuffledQuestions.slice(0, Math.min(config.totalQuestions, shuffledQuestions.length));
    
    // Return questions
    const secureQuestions = limitedQuestions.map(q => ({
      _id: q._id,
      category: q.category,
      questionText: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks,
      difficulty: q.difficulty
    }));
    
    res.json({
      success: true,
      questions: secureQuestions,
      count: secureQuestions.length,
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions
      }
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', checkDbConnection, async (req, res) => {
  try {
    console.log('📊 Quiz submission received');
    
    const { 
      rollNumber, 
      name, 
      category, 
      score, 
      percentage, 
      totalQuestions, 
      correctAnswers, 
      attempted
    } = req.body;
    
    // Validate
    if (!rollNumber || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    const config = await Config.findOne() || { passingPercentage: 40 };
    const passed = percentage >= config.passingPercentage;
    
    // Save result
    const user = new User({
      name,
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      totalQuestions: totalQuestions || 0,
      correctAnswers: correctAnswers || 0,
      attempted: attempted || 0,
      passingPercentage: config.passingPercentage,
      passed: passed,
      submittedAt: new Date()
    });
    
    await user.save();
    
    console.log('✅ Quiz result saved');
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        name: user.name,
        rollNumber: user.rollNumber,
        score: user.score,
        percentage: user.percentage,
        passed: user.passed,
        submittedAt: user.submittedAt
      }
    });
    
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// Get Categories
app.get('/api/categories', checkDbConnection, async (req, res) => {
  try {
    const dbCategories = await Question.distinct('category');
    
    const categories = await Promise.all(
      dbCategories.map(async (category) => {
        const count = await Question.countDocuments({ category });
        return {
          value: category,
          label: category.charAt(0).toUpperCase() + category.slice(1),
          questionCount: count
        };
      })
    );
    
    res.json({
      success: true,
      categories
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get Config
app.get('/api/config', checkDbConnection, async (req, res) => {
  try {
    const config = await Config.findOne() || {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching config',
      error: error.message
    });
  }
});

// ========== ADMIN ROUTES ==========

// Dashboard Stats
app.get('/api/admin/dashboard', verifyToken, checkDbConnection, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
    
    let averageScore = 0;
    let passRate = 0;
    
    const results = await User.find({ submittedAt: { $ne: null } });
    if (results.length > 0) {
      const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
      averageScore = totalPercentage / results.length;
      
      const passedCount = results.filter(r => r.passed).length;
      passRate = (passedCount / results.length) * 100;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttempts = await User.countDocuments({ 
      submittedAt: { $gte: today } 
    });
    
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40 };
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        averageScore,
        passRate,
        todayAttempts,
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

// Get All Questions (Admin)
app.get('/api/admin/questions', verifyToken, checkDbConnection, async (req, res) => {
  try {
    const { category = 'all', page = 1, limit = 100, search = '' } = req.query;
    
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Question.countDocuments(query);
    
    res.json({
      success: true,
      questions,
      count: questions.length,
      total,
      page: parseInt(page)
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});

// Get Results (Admin)
app.get('/api/admin/results', verifyToken, checkDbConnection, async (req, res) => {
  try {
    const results = await User.find({ submittedAt: { $ne: null } })
      .sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
});

// ========== ERROR HANDLING ==========

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    url: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Shamsi Institute Quiz System Backend');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Production: https://backend-one-taupe-14.vercel.app`);
  console.log(`✅ MongoDB: ${isDbConnected() ? 'Connected ✅' : 'Disconnected ❌'}`);
  console.log(`✅ State: ${mongoose.connection.readyState}`);
  console.log('='.repeat(50));
  console.log('📋 Test Endpoints:');
  console.log('   GET  /              - API Info');
  console.log('   GET  /api/health    - Health Check');
  console.log('   GET  /api/test      - Test MongoDB');
  console.log('   POST /admin/login   - Admin Login');
  console.log('='.repeat(50));
});