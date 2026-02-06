const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 详细的CORS配置
const corsOptions = {
  origin: (origin, callback) => {
    // 允许的origin列表
    const allowedOrigins = [
      'https://quiz2-iota-one.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175'
    ];
    
    // 对于开发环境，允许没有origin的请求（如Postman、curl）
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // 检查origin是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  maxAge: 86400, // 24小时
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// 应用CORS中间件
app.use(cors(corsOptions));

// 显式处理OPTIONS预检请求
app.options('*', cors(corsOptions));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Headers:', req.headers);
  next();
});

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database: quiz_system');
  initializeDatabase();
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
});

// Database schemas
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
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
  submittedAt: { type: Date, default: Date.now }
});

const registrationSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  registeredAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
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

// JWT Secret
const JWT_SECRET = 'shamsi_institute_secret_key_2024';

// Initialize Database
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Clear existing admin and create fresh
    await Admin.deleteMany({ username: 'admin' });
    console.log('🗑️ Cleared existing admin user');
    
    // Create new admin with fresh hash
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('🔐 Created hash for password: admin123');
    
    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@shamsi.edu.pk',
      role: 'superadmin'
    });
    
    console.log('✅ Default admin created (username: admin, password: admin123)');

    // Check if config exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }

    // NO SAMPLE QUESTIONS - Database starts empty
    const questionCount = await Question.countDocuments();
    console.log(`📊 Total questions in database: ${questionCount}`);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Middleware to verify JWT token
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
      message: 'Invalid token'
    });
  }
};

// ==================== ROUTES ====================

// Root endpoint with detailed CORS headers
app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/register',
      adminLogin: 'POST /admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories'
    },
    cors: {
      allowedOrigins: corsOptions.origin.toString(),
      methods: corsOptions.methods,
      credentials: corsOptions.credentials
    }
  });
});

// Health check with CORS headers
app.get('/api/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    success: true,
    message: '✅ Server is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage()
  });
});

// Debug endpoint to check admin
app.get('/admin/debug', async (req, res) => {
  try {
    const admins = await Admin.find({});
    
    res.json({
      success: true,
      adminCount: admins.length,
      admins: admins.map(a => ({
        username: a.username,
        email: a.email,
        role: a.role,
        hasPassword: !!a.password
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin Login with CORS - FIXED VERSION
app.post('/admin/login', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt:', username);
    
    // TEMPORARY FIX: Hardcoded credentials for testing
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'admin-id-001',
          username: 'admin', 
          role: 'superadmin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          username: 'admin',
          role: 'superadmin'
        }
      });
    }
    
    // Check in database (fallback)
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
      message: 'Server error',
      error: error.message
    });
  }
});

// Register student with CORS
app.post('/api/register', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { name, rollNumber, category } = req.body;
    
    console.log('📝 Registration attempt:', { name, rollNumber, category });
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 3 characters long'
      });
    }
    
    if (!/^\d+$/.test(rollNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Roll number must contain only numbers'
      });
    }
    
    // Check if category has questions
    const questionCount = await Question.countDocuments({ category: category.toLowerCase() });
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: `No questions available for "${category}" category.`,
        availableCategories: await Question.distinct('category')
      });
    }
    
    // Save registration
    const registration = new Registration({
      name,
      rollNumber: `SI-${rollNumber}`,
      category: category.toLowerCase()
    });
    
    await registration.save();
    
    console.log('✅ Registration successful for:', name);
    
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

// Get quiz questions with CORS
app.get('/api/quiz/questions/:category', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { category } = req.params;
    
    console.log('📚 Fetching questions for category:', category);
    
    let questions = [];
    let config = { quizTime: 30, passingPercentage: 40, totalQuestions: 50 };
    
    questions = await Question.find({ category: category.toLowerCase() });
    
    const dbConfig = await Config.findOne();
    if (dbConfig) {
      config = dbConfig;
    }
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for ${category} category. Please contact administrator.`
      });
    }
    
    // Shuffle questions and limit based on config
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    const limitedQuestions = shuffledQuestions.slice(0, Math.min(config.totalQuestions, shuffledQuestions.length));
    
    res.json({
      success: true,
      questions: limitedQuestions.map(q => ({
        ...q._doc,
        options: q.options.map(opt => ({ text: opt.text, isCorrect: false })) // Hide correct answers
      })),
      count: limitedQuestions.length,
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions
      }
    });
    
  } catch (error) {
    console.error('Get quiz questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});

// Submit quiz with CORS - FIXED VERSION
app.post('/api/quiz/submit', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    console.log('📊 Quiz submission received:', req.body);
    
    const { 
      rollNumber, 
      name, 
      category, 
      score, 
      percentage, 
      totalQuestions, 
      correctAnswers, 
      attempted,
      passingPercentage,
      passed,
      cheatingDetected,
      isAutoSubmitted
    } = req.body;
    
    // Validate required fields
    if (!rollNumber || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: rollNumber, name, category'
      });
    }
    
    console.log('📝 Processing quiz result:', {
      name,
      rollNumber,
      category,
      score,
      percentage,
      totalQuestions,
      correctAnswers
    });
    
    // Get or create config for passing percentage
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
    }
    
    // Use the provided passingPercentage or get from config
    const finalPassingPercentage = passingPercentage || config.passingPercentage;
    const finalPassed = percentage >= finalPassingPercentage;
    
    // Format roll number with SI- prefix
    const formattedRollNumber = rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`;
    
    // Save to database - FIXED FIELDS
    const user = new User({
      name,
      rollNumber: formattedRollNumber,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      totalMarks: totalQuestions || 0,
      obtainedMarks: score || 0,
      correctAnswers: correctAnswers || 0,
      totalQuestions: totalQuestions || 0,
      attempted: attempted || 0,
      passingPercentage: finalPassingPercentage,
      passed: finalPassed,
      cheatingDetected: cheatingDetected || false,
      isAutoSubmitted: isAutoSubmitted || false,
      submittedAt: new Date()
    });
    
    await user.save();
    
    console.log('✅ Quiz result saved successfully for:', name);
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: user.score,
        percentage: user.percentage,
        totalQuestions: user.totalQuestions,
        correctAnswers: user.correctAnswers,
        attempted: user.attempted,
        passingPercentage: user.passingPercentage,
        passed: user.passed,
        submittedAt: user.submittedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get categories with CORS
app.get('/api/categories', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
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

// Get config with CORS
app.get('/api/config', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    let config = {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    const dbConfig = await Config.findOne();
    if (dbConfig) {
      config = dbConfig;
    }
    
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

// Update config (admin only) with CORS
app.put('/api/config', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    let config = await Config.findOne();
    
    if (config) {
      config.quizTime = quizTime || config.quizTime;
      config.passingPercentage = passingPercentage || config.passingPercentage;
      config.totalQuestions = totalQuestions || config.totalQuestions;
      config.updatedAt = new Date();
      await config.save();
    } else {
      config = await Config.create({
        quizTime: quizTime || 30,
        passingPercentage: passingPercentage || 40,
        totalQuestions: totalQuestions || 50
      });
    }
    
    res.json({
      success: true,
      message: 'Config updated successfully',
      config
    });
    
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating config',
      error: error.message
    });
  }
});

// === ADMIN ROUTES with CORS ===

// Dashboard stats with CORS
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
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

// Get all questions (admin) with CORS
app.get('/api/admin/questions', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { category, page = 1, limit = 100, search = '' } = req.query;
    
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

// Add question (admin) with CORS
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 valid options'
      });
    }
    
    const correctOptions = validOptions.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option is required'
      });
    }
    
    const question = new Question({
      category: category.toLowerCase(),
      questionText: questionText.trim(),
      options: validOptions,
      marks: marks || 1,
      difficulty: difficulty || 'medium'
    });
    
    await question.save();
    
    res.json({
      success: true,
      message: 'Question added successfully',
      question
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question',
      error: error.message
    });
  }
});

// Delete question (admin) with CORS
app.delete('/api/admin/questions/:id', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { id } = req.params;
    
    const question = await Question.findByIdAndDelete(id);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
});

// Get results (admin) with CORS
app.get('/api/admin/results', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
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

// Delete result (admin) with CORS
app.delete('/api/admin/results/:id', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { id } = req.params;
    
    const result = await User.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Result deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting result',
      error: error.message
    });
  }
});

// Delete all results (admin) with CORS
app.delete('/api/admin/results', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    await User.deleteMany({ submittedAt: { $ne: null } });
    
    res.json({
      success: true,
      message: 'All results deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting all results',
      error: error.message
    });
  }
});

// Get registrations (admin) with CORS
app.get('/api/admin/registrations', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const registrations = await Registration.find().sort({ registeredAt: -1 });
    
    res.json({
      success: true,
      registrations,
      count: registrations.length
    });
    
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
});

// Initialize database (for testing) with CORS
app.get('/api/init-db', verifyToken, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    await initializeDatabase();
    res.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    console.error('Init database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing database',
      error: error.message
    });
  }
});

// Reset admin endpoint (for emergencies)
app.post('/admin/reset', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({
      success: true,
      message: 'Admin reset successfully. Use username: admin, password: admin123'
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 Handler with CORS
app.use((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/',
      '/api/health',
      '/api/register',
      '/admin/login',
      '/api/quiz/questions/:category',
      '/api/quiz/submit',
      '/api/config',
      '/api/categories',
      '/api/admin/dashboard',
      '/api/admin/questions',
      '/api/admin/results',
      '/api/admin/registrations'
    ]
  });
});

// Error handling middleware with CORS
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: ' + err.message,
      origin: req.headers.origin,
      allowedOrigins: corsOptions.origin.toString()
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Backend URL: http://localhost:${PORT}`);
  console.log(`🌐 Production URL: https://backend-one-taupe-14.vercel.app`);
  console.log(`✅ CORS enabled for origins:`);
  console.log(`   - https://quiz2-iota-one.vercel.app`);
  console.log(`   - http://localhost:3000`);
  console.log(`   - http://localhost:5173`);
  console.log(`   - http://127.0.0.1:5173`);
  console.log(`📡 Ready to accept requests...`);
});