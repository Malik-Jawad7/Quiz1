const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

// ========== ENV VARIABLES ==========
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_system';
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi-institute-quiz-secret-key-2024';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========== CORS CONFIGURATION ==========
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins during development
    if (!origin || NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://frontend-mocha-ten-85.vercel.app',
      'https://frontend-axeda0cz9-khalids-projects-3de9ee65.vercel.app',
      'https://frontend-9mu71kfeg-khalids-projects-3de9ee65.vercel.app',
      /\.vercel\.app$/
    ];
    
    if (allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return pattern === origin;
    })) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ========== MIDDLEWARE ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Add headers for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://frontend-mocha-ten-85.vercel.app',
    'https://frontend-axeda0cz9-khalids-projects-3de9ee65.vercel.app',
    'https://frontend-9mu71kfeg-khalids-projects-3de9ee65.vercel.app',
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// ========== DATABASE CONNECTION ==========
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

connectDB();

// ========== SCHEMAS & MODELS ==========
const UserSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true, index: true },
  category: { type: String, index: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

const QuestionSchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['html','css','javascript','react','node','mongodb','express','mern','python','fullstack'], 
    required: true,
    index: true 
  },
  questionText: { type: String, required: true },
  options: [{ 
    text: String, 
    isCorrect: { type: Boolean, default: false }, 
    optionIndex: Number 
  }],
  marks: { type: Number, default: 1, min: 1, max: 10 },
  difficulty: { type: String, default: 'medium', enum: ['easy','medium','hard'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 10 },
  maxMarks: { type: Number, default: 100 },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);

// ========== INITIAL CONFIG ==========
const initializeConfig = async () => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
      console.log('✅ Default config initialized');
    }
  } catch (err) {
    console.log('⚠️ Error initializing config:', err.message);
  }
};
initializeConfig();

// ========== ADMIN TOKEN MIDDLEWARE ==========
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Not authorized as admin' });

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ========== ROUTES ==========

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Quiz API Running', 
    status: 'OK', 
    timestamp: new Date(),
    environment: NODE_ENV,
    cors: 'Enabled',
    allowedOrigins: ['http://localhost:5173', 'https://*.vercel.app']
  });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected', 
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Get Config (Public)
app.get('/api/config', async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
    }
    res.json({ 
      success: true, 
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        maxMarks: config.maxMarks
      }
    });
  } catch (err) {
    console.log('❌ Get config error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch config', 
      error: err.message 
    });
  }
});

// Register User (SIMPLIFIED - without validation)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    // Manual validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, roll number, and category are required'
      });
    }
    
    let user = await User.findOne({ rollNumber });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number already exists' 
      });
    }

    user = new User({ 
      name, 
      rollNumber, 
      category: category.toLowerCase() 
    });
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Registration successful', 
      user: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.log('📝 Registration error:', err.message);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: err.message 
    });
  }
});

// Get Questions
app.get('/api/user/questions/:category', async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    const config = await Config.findOne();
    const questions = await Question.find({ category }).limit(config.totalQuestions || 10);
    
    // Shuffle questions and options for fairness
    const shuffledQuestions = questions
      .sort(() => 0.5 - Math.random())
      .map(q => ({
        ...q.toObject(),
        options: q.options.sort(() => 0.5 - Math.random())
      }));
    
    res.json({ 
      success: true, 
      questions: shuffledQuestions, 
      timeLimit: config.quizTime || 30,
      totalQuestions: shuffledQuestions.length
    });
  } catch (err) {
    console.log('📝 Get questions error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions', 
      error: err.message 
    });
  }
});

// Submit Quiz (SIMPLIFIED - without validation)
app.post('/api/user/submit', async (req, res) => {
  try {
    const { userId, answers, category } = req.body;
    
    // Manual validation
    if (!userId || !category) {
      return res.status(400).json({
        success: false,
        message: 'User ID and category are required'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const questions = await Question.find({ category: category.toLowerCase() });
    let marksObtained = 0;
    let totalMarks = 0;

    questions.forEach(q => {
      const userAnswer = answers[q._id];
      const correctOption = q.options.find(o => o.isCorrect);
      if (userAnswer && correctOption && correctOption.text === userAnswer.selected) {
        marksObtained += q.marks || 1;
      }
      totalMarks += q.marks || 1;
    });

    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const config = await Config.findOne();
    const passed = percentage >= (config.passingPercentage || 40);

    Object.assign(user, { 
      score: marksObtained, 
      marksObtained, 
      totalMarks, 
      percentage, 
      passed 
    });
    await user.save();

    res.json({ 
      success: true, 
      score: marksObtained, 
      totalMarks, 
      percentage: percentage.toFixed(2), 
      passed,
      user: {
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category
      }
    });
  } catch (err) {
    console.log('📝 Submit quiz error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz', 
      error: err.message 
    });
  }
});

// Admin Login (SIMPLIFIED)
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ 
        username, 
        role: 'admin', 
        isAdmin: true 
      }, JWT_SECRET, { 
        expiresIn: '24h' 
      });
      
      res.json({ 
        success: true, 
        token,
        user: {
          username,
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch (err) {
    console.log('❌ Admin login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Get All Questions (Admin)
app.get('/api/admin/questions', verifyAdminToken, async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      questions,
      total: questions.length
    });
  } catch (err) {
    console.log('❌ Get questions error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions' 
    });
  }
});

// Add Question (Admin) - SIMPLIFIED
app.post('/api/admin/questions', verifyAdminToken, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category, question text, and options are required' 
      });
    }

    const question = new Question({ 
      category, 
      questionText, 
      options, 
      marks: marks || 1, 
      difficulty: difficulty || 'medium' 
    });
    await question.save();
    
    res.json({ 
      success: true, 
      message: 'Question added successfully', 
      question 
    });
  } catch (err) {
    console.log('❌ Add question error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add question' 
    });
  }
});

// Update Question (Admin)
app.put('/api/admin/questions/:id', verifyAdminToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }
    
    Object.assign(question, req.body, { updatedAt: new Date() });
    await question.save();
    
    res.json({ 
      success: true, 
      message: 'Question updated successfully', 
      question 
    });
  } catch (err) {
    console.log('❌ Update question error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update question' 
    });
  }
});

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', verifyAdminToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }
    
    await Question.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Question deleted successfully',
      deletedId: req.params.id
    });
  } catch (err) {
    console.log('❌ Delete question error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete question' 
    });
  }
});

// Get Config (Admin)
app.get('/api/admin/config', verifyAdminToken, async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await new Config().save();
    }
    
    res.json({ 
      success: true, 
      config 
    });
  } catch (err) {
    console.log('❌ Get admin config error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch config' 
    });
  }
});

// Update Config (Admin) - SIMPLIFIED
app.put('/api/admin/config', verifyAdminToken, async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config(req.body);
    } else {
      Object.assign(config, req.body, { updatedAt: new Date() });
    }
    
    await config.save();
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully', 
      config 
    });
  } catch (err) {
    console.log('❌ Update config error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update configuration' 
    });
  }
});

// Get All Results (Admin)
app.get('/api/admin/results', verifyAdminToken, async (req, res) => {
  try {
    const results = await User.find().sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      results,
      total: results.length
    });
  } catch (err) {
    console.log('❌ Get results error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results' 
    });
  }
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Result not found' 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Result deleted successfully',
      deletedUser: {
        name: user.name,
        rollNumber: user.rollNumber
      }
    });
  } catch (err) {
    console.log('❌ Delete result error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete result' 
    });
  }
});

// Get User by ID
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: user.score,
        marksObtained: user.marksObtained,
        totalMarks: user.totalMarks,
        percentage: user.percentage,
        passed: user.passed,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.log('📝 Get user error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user', 
      error: err.message 
    });
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ========== SERVER ==========
if (process.env.VERCEL) {
  module.exports = app; // For Vercel serverless
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for origins: http://localhost:5173, https://*.vercel.app`);
    console.log(`📁 Environment: ${NODE_ENV}`);
  });
}