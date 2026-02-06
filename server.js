const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ========== ENVIRONMENT VARIABLES ==========
// Clean connection string without appName parameter
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_institute_secret_key_2024_production';
const PORT = process.env.PORT || 5000;

// Debug log
console.log('🔧 Configuration loaded:');
console.log('- MONGODB_URI:', MONGODB_URI ? 'Set (masked)' : 'Not set');
console.log('- JWT_SECRET:', JWT_SECRET ? 'Set' : 'Not set');
console.log('- PORT:', PORT);

// ========== IMPROVED CORS CONFIGURATION ==========
const corsOptions = {
  origin: [
    'https://quiz2-iota-one.vercel.app',
    'https://quiz2-*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:8080'
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
  console.log(`\n📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('🌐 Origin:', req.headers.origin || 'Not specified');
  next();
});

// ========== IMPROVED MONGODB CONNECTION ==========
console.log('🔗 Initializing MongoDB connection...');

// Mongoose connection with better options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000,
  maxPoolSize: 5,
  minPoolSize: 1,
  retryWrites: true,
  w: 'majority'
};

// Track connection state
let isDbConnected = false;
let connectionRetries = 0;
const maxRetries = 3;

const connectDB = async () => {
  try {
    console.log(`🔄 Attempting MongoDB connection (Attempt ${connectionRetries + 1}/${maxRetries})...`);
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    // Hide password in logs for security
    const maskedUri = MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@');
    console.log(`🔗 Connecting to: ${maskedUri}`);
    
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    isDbConnected = true;
    connectionRetries = 0;
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📈 Host: ${mongoose.connection.host}`);
    console.log(`🚪 Port: ${mongoose.connection.port}`);
    
    // Verify connection with a ping
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
    return mongoose.connection;
    
  } catch (error) {
    connectionRetries++;
    console.error(`❌ MongoDB Connection Failed (Attempt ${connectionRetries}):`, error.message);
    
    if (connectionRetries >= maxRetries) {
      console.error('❌ Max connection retries reached. Server will run without database.');
      return null;
    }
    
    // Wait 5 seconds before retrying
    console.log(`🔄 Retrying in 5 seconds... (${connectionRetries}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectDB();
  }
};

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
  isDbConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  isDbConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
  isDbConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('🔁 Mongoose reconnected to MongoDB');
  isDbConnected = true;
});

// Initialize database connection
let dbConnection;
(async () => {
  dbConnection = await connectDB();
  if (dbConnection) {
    await initializeDatabase();
  }
})();

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
    if (!isDbConnected) {
      console.log('⚠️ Skipping database initialization - No database connection');
      return;
    }
    
    console.log('🔄 Initializing database...');
    
    // Create admin if doesn't exist
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
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

    // Check existing questions
    const questionCount = await Question.countDocuments();
    console.log(`📊 Total questions in database: ${questionCount}`);

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
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

// Database connection middleware
const checkDbConnection = (req, res, next) => {
  if (!isDbConnected) {
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
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.1.0',
    database: isDbConnected ? 'Connected ✅' : 'Disconnected ❌',
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
      categories: 'GET /api/categories',
      dbStatus: 'GET /api/db-status'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is running',
    database: isDbConnected ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    cors: {
      origin: req.headers.origin || 'Not specified',
      allowed: true
    },
    environment: process.env.NODE_ENV || 'development',
    mongooseState: mongoose.connection.readyState,
    isDbConnected: isDbConnected
  });
});

// Database status endpoint (safe version)
app.get('/api/db-status', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const stateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
    
    if (!isDbConnected) {
      return res.json({
        success: true,
        database: {
          connected: false,
          state: state,
          stateText: stateText,
          message: 'Database is not connected',
          retries: connectionRetries
        },
        environment: {
          mongodb_uri_set: !!process.env.MONGODB_URI,
          node_env: process.env.NODE_ENV || 'development'
        }
      });
    }

    // Try to get collections if database is connected
    let collections = [];
    try {
      collections = await mongoose.connection.db.listCollections().toArray();
    } catch (error) {
      console.log('⚠️ Could not list collections:', error.message);
    }

    const stats = {
      connectionState: state,
      stateText: stateText,
      collections: collections.map(c => c.name),
      userCount: await User.countDocuments().catch(() => 0),
      questionCount: await Question.countDocuments().catch(() => 0),
      registrationCount: await Registration.countDocuments().catch(() => 0),
      adminCount: await Admin.countDocuments().catch(() => 0),
      configExists: !!(await Config.findOne().catch(() => null))
    };

    res.json({
      success: true,
      database: {
        connected: true,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        ...stats
      },
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        mongodb_uri_set: !!process.env.MONGODB_URI
      }
    });
  } catch (error) {
    console.error('DB Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting database status',
      error: error.message,
      mongooseState: mongoose.connection.readyState,
      isDbConnected: isDbConnected
    });
  }
});

// Debug endpoint for environment variables
app.get('/api/debug-env', (req, res) => {
  // Mask sensitive info
  const maskedMongoUri = process.env.MONGODB_URI ? 
    'mongodb+srv://****:****@' + process.env.MONGODB_URI.split('@')[1] : 
    'Not set';
  
  res.json({
    success: true,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_SET: !!process.env.MONGODB_URI,
      MONGODB_URI_MASKED: maskedMongoUri,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      ADMIN_PASSWORD_SET: !!process.env.ADMIN_PASSWORD,
      PORT: process.env.PORT,
      // Show all env vars (non-sensitive)
      allVars: Object.keys(process.env).filter(key => 
        !key.toLowerCase().includes('secret') && 
        !key.toLowerCase().includes('password') &&
        !key.toLowerCase().includes('key') &&
        !key.toLowerCase().includes('token') &&
        !key.toLowerCase().includes('uri')
      ).sort()
    },
    mongoose: {
      readyState: mongoose.connection.readyState,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
      isConnected: isDbConnected,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    },
    timestamp: new Date().toISOString()
  });
});

// Test MongoDB connection directly
app.get('/api/test-mongo', async (req, res) => {
  try {
    // Force a simple query
    await mongoose.connection.db.admin().command({ ping: 1 });
    
    res.json({
      success: true,
      message: 'MongoDB is connected!',
      state: mongoose.connection.readyState,
      host: mongoose.connection.host,
      db: mongoose.connection.name,
      collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name))
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'MongoDB connection failed',
      error: error.message,
      state: mongoose.connection.readyState,
      isDbConnected: isDbConnected,
      connectionString: MONGODB_URI ? 'Set (masked)' : 'Not set'
    });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt for:', username);
    
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
        availableCategories: await Question.distinct('category').catch(() => [])
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
app.get('/api/quiz/questions/:category', checkDbConnection, async (req, res) => {
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
      _id: q._id,
      category: q.category,
      questionText: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks,
      difficulty: q.difficulty,
      createdAt: q.createdAt
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
app.post('/api/admin/questions', verifyToken, checkDbConnection, async (req, res) => {
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

// Get Registrations (Admin)
app.get('/api/admin/registrations', verifyToken, checkDbConnection, async (req, res) => {
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
      '/api/debug-env',
      '/api/test-mongo',
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
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    isDbConnected: isDbConnected
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Shamsi Institute Quiz System Backend');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Production URL: https://backend-one-taupe-14.vercel.app`);
  console.log(`✅ CORS configured for multiple origins`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Database: ${isDbConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`✅ MongoDB State: ${mongoose.connection.readyState}`);
  console.log('='.repeat(50));
  console.log('📋 Available endpoints:');
  console.log('   GET  /                    - API Info');
  console.log('   GET  /api/health          - Health Check');
  console.log('   GET  /api/debug-env       - Debug Environment');
  console.log('   GET  /api/test-mongo      - Test MongoDB');
  console.log('   POST /api/register        - Student Registration');
  console.log('   POST /admin/login         - Admin Login');
  console.log('   GET  /api/quiz/questions/:category - Get Questions');
  console.log('   POST /api/quiz/submit     - Submit Quiz');
  console.log('   GET  /api/config          - Get Config');
  console.log('   GET  /api/categories      - Get Categories');
  console.log('   GET  /api/db-status       - Database Status');
  console.log('='.repeat(50));
});