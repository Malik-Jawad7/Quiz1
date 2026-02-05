const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ========== FIXED CORS CONFIGURATION ==========
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      console.log('🌐 Request with no origin (server-to-server)');
      return callback(null, true);
    }
    
    console.log('🌐 Incoming request from origin:', origin);
    
    // Extensive list of allowed origins
    const allowedOrigins = [
      // Your main production frontend
      'https://quiz2-iota-one.vercel.app',
      
      // Vercel preview deployments (wildcard patterns)
      'https://quiz2-*.vercel.app',
      'https://*-quiz2.vercel.app',
      
      // Local development URLs
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175',
      'http://localhost:5176',
      'http://127.0.0.1:5176',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      
      // Common Vercel patterns
      'https://*.vercel.app',
      'http://*.vercel.app',
      
      // Development patterns
      'http://localhost:*',
      'http://127.0.0.1:*'
    ];
    
    // Function to check if origin matches any pattern
    const isOriginAllowed = (origin) => {
      for (const allowed of allowedOrigins) {
        if (allowed.includes('*')) {
          // Convert pattern to regex
          const pattern = allowed
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(origin)) {
            return true;
          }
        } else if (origin === allowed) {
          return true;
        }
      }
      return false;
    };
    
    // Check if origin is allowed
    if (isOriginAllowed(origin) || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') ||
        origin.includes('vercel.app')) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('✅ Allowed patterns:', allowedOrigins);
      callback(new Error(`CORS Error: Origin ${origin} not allowed`));
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
    'X-API-Key',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 ${timestamp} - ${req.method} ${req.url}`);
  console.log('🌐 Origin:', req.headers.origin);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database: quiz_system');
  initializeDatabase();
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
  console.error('💡 Check your MongoDB connection string and network connectivity');
});

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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_institute_secret_key_2024_production';

// ========== DATABASE INITIALIZATION ==========
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Clear and recreate admin user
    await Admin.deleteMany({ username: 'admin' });
    console.log('🗑️ Cleared existing admin user');
    
    // Create new admin with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    console.log('🔐 Created hash for password: admin123');
    
    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@shamsi.edu.pk',
      role: 'superadmin'
    });
    
    console.log('✅ Default admin created (username: admin, password: admin123)');

    // Initialize config if not exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }

    // Check existing questions
    const questionCount = await Question.countDocuments();
    console.log(`📊 Total questions in database: ${questionCount}`);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

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

// ========== ROUTES ==========

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.1.0',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    cors: {
      enabled: true,
      origin: 'Multiple origins configured'
    },
    endpoints: {
      health: 'GET /api/health',
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
  res.json({
    success: true,
    message: '✅ Server is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    cors: {
      origin: req.headers.origin || 'Not specified',
      allowed: true
    }
  });
});

// Debug endpoint
app.get('/admin/debug', async (req, res) => {
  try {
    const admins = await Admin.find({});
    const questions = await Question.countDocuments();
    const results = await User.countDocuments();
    
    res.json({
      success: true,
      stats: {
        admins: admins.length,
        questions: questions,
        results: results,
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
      },
      adminDetails: admins.map(a => ({
        username: a.username,
        hasPassword: !!a.password,
        role: a.role
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

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt for:', username);
    
    // Hardcoded credentials for emergency access
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'admin-emergency-001',
          username: 'admin', 
          role: 'superadmin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful (emergency access)',
        token,
        user: {
          username: 'admin',
          role: 'superadmin'
        }
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
app.post('/api/register', async (req, res) => {
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

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('📚 Fetching questions for category:', category);
    
    const questions = await Question.find({ category: category.toLowerCase() });
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40, totalQuestions: 50 };
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for ${category} category. Please contact administrator.`
      });
    }
    
    // Shuffle questions
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    const limitedQuestions = shuffledQuestions.slice(0, Math.min(config.totalQuestions, shuffledQuestions.length));
    
    // Return questions with isCorrect hidden for security
    const secureQuestions = limitedQuestions.map(q => ({
      ...q._doc,
      options: q.options.map(opt => ({ text: opt.text })) // Hide isCorrect from students
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
    console.error('Get quiz questions error:', error);
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
    console.log('📊 Quiz submission received');
    
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
    
    // Get config for passing percentage
    const config = await Config.findOne() || { passingPercentage: 40 };
    const finalPassingPercentage = passingPercentage || config.passingPercentage;
    const finalPassed = percentage >= finalPassingPercentage;
    
    // Format roll number
    const formattedRollNumber = rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`;
    
    // Save result
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
    
    console.log('✅ Quiz result saved for:', name);
    
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
      error: error.message
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
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
app.get('/api/config', async (req, res) => {
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

// Update Config (Admin only)
app.put('/api/config', verifyToken, async (req, res) => {
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

// ========== ADMIN ROUTES ==========

// Dashboard Stats
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
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
app.get('/api/admin/questions', verifyToken, async (req, res) => {
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

// Add Question (Admin)
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    const validOptions = options.filter(opt => opt.text && opt.text.trim() !== '');
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
      options: validOptions.map(opt => ({
        text: opt.text.trim(),
        isCorrect: Boolean(opt.isCorrect)
      })),
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

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', verifyToken, async (req, res) => {
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

// Get Results (Admin)
app.get('/api/admin/results', verifyToken, async (req, res) => {
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

// Delete Result (Admin)
app.delete('/api/admin/results/:id', verifyToken, async (req, res) => {
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

// Delete All Results (Admin)
app.delete('/api/admin/results', verifyToken, async (req, res) => {
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

// Get Registrations (Admin)
app.get('/api/admin/registrations', verifyToken, async (req, res) => {
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

// Initialize Database (Admin)
app.get('/api/init-db', verifyToken, async (req, res) => {
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

// Reset Admin (Emergency)
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

// Fix Questions Data (Admin)
app.post('/api/admin/fix-questions', verifyToken, async (req, res) => {
  try {
    const { category } = req.body;
    
    console.log(`🛠️ Fixing questions for category: ${category}`);
    
    const questions = await Question.find({ category: category.toLowerCase() });
    let fixedCount = 0;
    
    for (const question of questions) {
      const hasCorrect = question.options.some(opt => opt.isCorrect === true);
      if (!hasCorrect && question.options.length > 0) {
        // Set first option as correct (temporary fix)
        question.options[0].isCorrect = true;
        await question.save();
        fixedCount++;
        console.log(`✅ Fixed question: ${question.questionText.substring(0, 50)}...`);
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixedCount} questions for ${category}`,
      fixedCount
    });
    
  } catch (error) {
    console.error('Fix questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing questions',
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
      '/api/admin/registrations',
      '/api/admin/fix-questions'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global error:', err);
  
  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS Error',
      details: err.message,
      origin: req.headers.origin,
      allowedPatterns: [
        'https://quiz2-iota-one.vercel.app',
        'https://*.vercel.app',
        'http://localhost:*',
        'http://127.0.0.1:*'
      ]
    });
  }
  
  // General errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Shamsi Institute Quiz System Backend');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Production URL: https://backend-one-taupe-14.vercel.app`);
  console.log(`✅ CORS configured for multiple origins`);
  console.log(`✅ MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log('='.repeat(50));
  console.log('📋 Available endpoints:');
  console.log('   GET  /                    - API Info');
  console.log('   GET  /api/health          - Health Check');
  console.log('   POST /api/register        - Student Registration');
  console.log('   POST /admin/login         - Admin Login');
  console.log('   GET  /api/quiz/questions/:category - Get Questions');
  console.log('   POST /api/quiz/submit     - Submit Quiz');
  console.log('   GET  /api/config          - Get Config');
  console.log('   GET  /api/categories      - Get Categories');
  console.log('='.repeat(50));
});