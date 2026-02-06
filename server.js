const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ==================== CONFIGURATION ====================
const PORT = process.env.PORT || 5000;

// Use environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_institute_secret_key_2024';

// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
console.log('🔗 Attempting MongoDB Connection...');

// Improved MongoDB connection with better error handling
const connectDB = async () => {
  try {
    // Clear any existing connections first
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
      return;
    }

    // Close any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log('📡 Connecting with URI:', MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@'));
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout to 30 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database Name:', mongoose.connection.db?.databaseName || 'Unknown');
    console.log('📈 Connection State:', getConnectionState());
    
    // Setup connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB Disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Reconnected');
    });
    
    // Initialize database
    await initializeDatabase();
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.error('💡 Error Details:', {
      name: error.name,
      code: error.code,
      message: error.message
    });
    
    // If it's an authentication error, check credentials
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('🔑 Authentication Error: Please check MongoDB username/password');
    }
    
    // If it's a network error
    if (error.name === 'MongoNetworkError') {
      console.error('🌐 Network Error: Check your internet connection and MongoDB Atlas network access');
    }
    
    console.log('🔄 Retrying connection in 10 seconds...');
    setTimeout(connectDB, 10000);
  }
};

// Helper function to get connection state
const getConnectionState = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
};

// Start the connection
connectDB();

// ==================== DATABASE SCHEMAS ====================
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
}, { timestamps: true });

const registrationSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

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
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create models
const User = mongoose.model('User', userSchema);
const Registration = mongoose.model('Registration', registrationSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// ==================== DATABASE INITIALIZATION ====================
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Database not connected, skipping initialization');
      return;
    }
    
    // Check if admin exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      console.log('✅ Default admin created');
      console.log('   👤 Username: admin');
      console.log('   🔑 Password: admin123');
    } else {
      console.log('✅ Admin already exists');
    }
    
    // Check if config exists
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
    
    // Get counts
    const questionCount = await Question.countDocuments();
    const userCount = await User.countDocuments();
    const adminCount = await Admin.countDocuments();
    const registrationCount = await Registration.countDocuments();
    
    console.log('📊 Database Statistics:');
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Registrations: ${registrationCount}`);
    console.log(`   Admins: ${adminCount}`);
    
    console.log('✅ Database initialization complete');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ==================== MIDDLEWARE ====================
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
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Database status middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected. Please try again later.',
      databaseStatus: getConnectionState()
    });
  }
  next();
};

// ==================== ROUTES ====================

// Root endpoint with database status
app.get('/', (req, res) => {
  const dbStatus = getConnectionState();
  const isConnected = dbStatus === 'connected';
  
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.0.0',
    database: isConnected ? 'Connected ✅' : `Disconnected ❌ (${dbStatus})`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: 'GET /api/health',
      dbStatus: 'GET /api/db-status',
      register: 'POST /api/register',
      adminLogin: 'POST /admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories',
      adminDashboard: 'GET /api/admin/dashboard (protected)',
      resetAdmin: 'POST /admin/reset'
    }
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const dbStatus = getConnectionState();
    const isConnected = dbStatus === 'connected';
    
    let stats = {};
    if (isConnected) {
      stats = {
        questions: await Question.countDocuments(),
        users: await User.countDocuments(),
        registrations: await Registration.countDocuments(),
        admins: await Admin.countDocuments(),
        configs: await Config.countDocuments()
      };
    }
    
    res.json({
      success: true,
      database: {
        status: dbStatus,
        connected: isConnected,
        connectionString: MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@'),
        stats: stats
      },
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      database: {
        status: getConnectionState(),
        connected: false,
        error: error.message
      }
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getConnectionState();
  const isConnected = dbStatus === 'connected';
  
  res.json({
    success: true,
    message: '✅ Server is running',
    database: isConnected ? 'Connected' : `Disconnected (${dbStatus})`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    console.log('🔐 Admin login attempt for:', username);
    
    // Always allow default admin credentials even if DB is not connected
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'default-admin-id',
          username: 'admin', 
          role: 'superadmin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful (default credentials)',
        token,
        user: {
          username: 'admin',
          role: 'superadmin'
        }
      });
    }
    
    // If DB is connected, check in database
    if (mongoose.connection.readyState === 1) {
      const admin = await Admin.findOne({ username });
      
      if (admin) {
        const validPassword = await bcrypt.compare(password, admin.password);
        if (validPassword) {
          const token = jwt.sign(
            { 
              id: admin._id, 
              username: admin.username, 
              role: admin.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          console.log('✅ Admin login successful:', username);
          
          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
              username: admin.username,
              role: admin.role
            }
          });
        }
      }
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
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

// Register Student
app.post('/api/register', checkDBConnection, async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
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
    
    // Check if already registered
    const existingRegistration = await Registration.findOne({ 
      $or: [
        { rollNumber: `SI-${rollNumber}` },
        { name: new RegExp(`^${name}$`, 'i') }
      ]
    });
    
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Student already registered'
      });
    }
    
    // Save registration
    const registration = new Registration({
      name,
      rollNumber: `SI-${rollNumber}`,
      category: category.toLowerCase()
    });
    
    await registration.save();
    
    console.log('✅ Registration successful:', name);
    
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
app.get('/api/quiz/questions/:category', checkDBConnection, async (req, res) => {
  try {
    const { category } = req.params;
    const lowercaseCategory = category.toLowerCase();
    
    console.log('📚 Fetching questions for category:', lowercaseCategory);
    
    // Get questions
    const questions = await Question.find({ category: lowercaseCategory });
    
    if (questions.length === 0) {
      // Return empty questions instead of error
      return res.json({
        success: true,
        questions: [],
        count: 0,
        config: {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50
        },
        message: 'No questions available for this category. Please contact admin.'
      });
    }
    
    // Get config
    const config = await Config.findOne() || {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    // Shuffle and limit questions
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    const limitedQuestions = shuffledQuestions.slice(0, Math.min(config.totalQuestions, shuffledQuestions.length));
    
    // Hide correct answers for students
    const safeQuestions = limitedQuestions.map(q => ({
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
      questions: safeQuestions,
      count: safeQuestions.length,
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
app.post('/api/quiz/submit', checkDBConnection, async (req, res) => {
  try {
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
    
    // Validation
    if (!rollNumber || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
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
      isAutoSubmitted: isAutoSubmitted || false
    });
    
    await user.save();
    
    console.log('✅ Quiz submitted successfully:', name);
    
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
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// Get Config
app.get('/api/config', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      const config = await Config.findOne() || {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      };
      
      return res.json({
        success: true,
        config
      });
    }
    
    // Return default config if DB not connected
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      message: 'Using default config (database not connected)'
    });
    
  } catch (error) {
    console.error('Get config error:', error);
    res.json({
      success: false,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      message: 'Using default config (error)'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
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
      
      return res.json({
        success: true,
        categories
      });
    }
    
    // Return default categories if DB not connected
    res.json({
      success: false,
      categories: [
        { value: 'html', label: 'HTML', questionCount: 0 },
        { value: 'css', label: 'CSS', questionCount: 0 },
        { value: 'javascript', label: 'JavaScript', questionCount: 0 },
        { value: 'react', label: 'React.js', questionCount: 0 },
        { value: 'node', label: 'Node.js', questionCount: 0 }
      ],
      message: 'Using default categories (database not connected)'
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.json({
      success: false,
      categories: [
        { value: 'html', label: 'HTML', questionCount: 0 },
        { value: 'css', label: 'CSS', questionCount: 0 },
        { value: 'javascript', label: 'JavaScript', questionCount: 0 },
        { value: 'react', label: 'React.js', questionCount: 0 },
        { value: 'node', label: 'Node.js', questionCount: 0 }
      ],
      message: 'Using default categories (error)'
    });
  }
});

// ==================== ADMIN PROTECTED ROUTES ====================

// Dashboard Stats
app.get('/api/admin/dashboard', verifyToken, checkDBConnection, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalAttempts = await User.countDocuments();
    const totalRegistrations = await Registration.countDocuments();
    
    let averageScore = 0;
    let passRate = 0;
    
    const results = await User.find();
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
    
    const todayRegistrations = await Registration.countDocuments({ 
      registeredAt: { $gte: today } 
    });
    
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40 };
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        totalRegistrations,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        todayAttempts,
        todayRegistrations,
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
app.get('/api/admin/questions', verifyToken, checkDBConnection, async (req, res) => {
  try {
    const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
    
    let query = {};
    if (category !== 'all') {
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
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
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
app.post('/api/admin/questions', verifyToken, checkDBConnection, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    // Validation
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

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', verifyToken, checkDBConnection, async (req, res) => {
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
app.get('/api/admin/results', verifyToken, checkDBConnection, async (req, res) => {
  try {
    const results = await User.find()
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
app.delete('/api/admin/results/:id', verifyToken, checkDBConnection, async (req, res) => {
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
app.delete('/api/admin/results', verifyToken, checkDBConnection, async (req, res) => {
  try {
    await User.deleteMany({});
    
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

// Update Config (Admin)
app.put('/api/config', verifyToken, checkDBConnection, async (req, res) => {
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

// Reset Admin
app.post('/admin/reset', async (req, res) => {
  try {
    // Only reset if DB is connected
    if (mongoose.connection.readyState === 1) {
      // Delete existing admin
      await Admin.deleteMany({ username: 'admin' });
      
      // Create new admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      
      return res.json({
        success: true,
        message: 'Admin reset successfully. Use username: admin, password: admin123'
      });
    }
    
    res.json({
      success: false,
      message: 'Database not connected. Cannot reset admin.'
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Registrations (Admin)
app.get('/api/admin/registrations', verifyToken, checkDBConnection, async (req, res) => {
  try {
    const registrations = await Registration.find()
      .sort({ registeredAt: -1 });
    
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

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('✅ CORS enabled for all origins');
  console.log('📡 MongoDB Status:', getConnectionState());
  console.log('⚙️  Environment:', process.env.NODE_ENV || 'development');
});