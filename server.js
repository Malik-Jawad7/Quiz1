const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ==================== CONFIGURATION ====================
const PORT = process.env.PORT || 5000;

// Vercel pe environment variables ko handle karna
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

// ==================== MONGODB CONNECTION (VERCEL COMPATIBLE) ====================
console.log('🔗 Attempting MongoDB Connection...');
console.log('📡 Connection String (masked):', MONGODB_URI ? MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@') : 'Not found');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Vercel serverless environment ke liye optimized connection
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 30000);

// Vercel ke liye optimized connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  family: 4, // Use IPv4, skip IPv6
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 30000,
};

// Connection retry logic
let connectionAttempts = 0;
const MAX_RETRIES = 5;

const connectWithRetry = async () => {
  try {
    connectionAttempts++;
    console.log(`🔄 MongoDB Connection Attempt #${connectionAttempts}`);
    
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
      return mongoose.connection;
    }
    
    // Connection string mein Vercel ke liye specific parameters add karo
    let connectionString = MONGODB_URI;
    
    // Ensure proper format
    if (!connectionString.includes('retryWrites')) {
      connectionString += connectionString.includes('?') ? '&' : '?';
      connectionString += 'retryWrites=true&w=majority';
    }
    
    // Vercel/serverless environment ke liye additional options
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.log('🚀 Running in Vercel/Production environment');
      connectionString += '&ssl=true&tlsAllowInvalidCertificates=false';
    }
    
    console.log('📊 Final Connection String (masked):', 
      connectionString.replace(/\/\/[^@]+@/, '//***:***@'));
    
    await mongoose.connect(connectionString, mongooseOptions);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'quiz_system');
    console.log('📈 Connection State:', getConnectionState());
    console.log('👤 Connected as user:', 'khalid');
    console.log('📍 Host:', mongoose.connection.host);
    
    connectionAttempts = 0; // Reset counter on success
    
    return mongoose.connection;
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed (Attempt ${connectionAttempts}):`, error.message);
    
    if (connectionAttempts < MAX_RETRIES) {
      console.log(`🔄 Retrying in 5 seconds... (${MAX_RETRIES - connectionAttempts} attempts left)`);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error('💥 Max connection attempts reached. Please check:');
      console.error('   1. MongoDB Atlas IP Whitelist (0.0.0.0/0)');
      console.error('   2. Username/Password');
      console.error('   3. Network Connectivity');
      console.error('   4. Cluster Status');
    }
    
    return null;
  }
};

// Helper function to get connection state
const getConnectionState = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

// Start connection
connectWithRetry();

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
    
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Database not connected, skipping initialization');
      return;
    }
    
    // Admin initialization
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
    }
    
    // Config initialization
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }
    
    console.log('📊 Database initialized successfully');
    
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

const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected. Please try again later.',
      databaseStatus: getConnectionState(),
      timestamp: new Date().toISOString(),
      tips: [
        'Check MongoDB Atlas IP Whitelist (should be 0.0.0.0/0)',
        'Verify database user credentials',
        'Check cluster status in MongoDB Atlas dashboard'
      ]
    });
  }
  next();
};

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  const dbStatus = getConnectionState();
  const isConnected = dbStatus === 'connected';
  
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.1.0',
    database: isConnected ? 'Connected ✅' : `Disconnected ❌ (${dbStatus})`,
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      dbStatus: '/api/db-status',
      register: 'POST /api/register',
      adminLogin: 'POST /admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit'
    }
  });
});

// MongoDB Connection Test Endpoint
app.get('/api/test-mongodb', async (req, res) => {
  try {
    const state = getConnectionState();
    const isConnected = mongoose.connection.readyState === 1;
    
    if (isConnected) {
      // Try a simple database operation
      const adminCount = await Admin.countDocuments();
      const questionCount = await Question.countDocuments();
      
      return res.json({
        success: true,
        message: '✅ MongoDB is connected and working!',
        connectionState: state,
        databaseStats: {
          admins: adminCount,
          questions: questionCount,
          dbName: mongoose.connection.db?.databaseName
        },
        connectionDetails: {
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          user: 'khalid'
        }
      });
    }
    
    // Try to reconnect
    await connectWithRetry();
    
    res.json({
      success: false,
      message: '❌ MongoDB is not connected',
      connectionState: state,
      reconnectionAttempted: true,
      tips: [
        'Check if MongoDB Atlas cluster is running',
        'Verify IP whitelist includes 0.0.0.0/0',
        'Check username/password in connection string'
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing MongoDB connection',
      error: error.message,
      connectionString: MONGODB_URI ? MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@') : 'Not set'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = getConnectionState();
  const isConnected = dbStatus === 'connected';
  
  res.json({
    success: true,
    status: 'healthy',
    database: isConnected ? 'connected' : `disconnected (${dbStatus})`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    node: process.version
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
    
    // First try default credentials
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'superadmin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { username: 'admin', role: 'superadmin' }
      });
    }
    
    // If DB connected, check database
    if (mongoose.connection.readyState === 1) {
      const admin = await Admin.findOne({ username });
      
      if (admin && await bcrypt.compare(password, admin.password)) {
        const token = jwt.sign(
          { id: admin._id, username: admin.username, role: admin.role },
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
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Student Registration
app.post('/api/register', checkDBConnection, async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, roll number, and category are required'
      });
    }
    
    // Check if already registered
    const existing = await Registration.findOne({ 
      rollNumber: `SI-${rollNumber}` 
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Student already registered'
      });
    }
    
    const registration = new Registration({
      name,
      rollNumber: `SI-${rollNumber}`,
      category: category.toLowerCase()
    });
    
    await registration.save();
    
    res.json({
      success: true,
      message: 'Registration successful',
      data: registration
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        questions: [],
        count: 0,
        message: 'Database not connected'
      });
    }
    
    const questions = await Question.find({ 
      category: category.toLowerCase() 
    });
    
    // Hide correct answers
    const safeQuestions = questions.map(q => ({
      _id: q._id,
      category: q.category,
      questionText: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks,
      difficulty: q.difficulty
    }));
    
    const config = await Config.findOne() || {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    res.json({
      success: true,
      questions: safeQuestions.slice(0, config.totalQuestions),
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
      message: 'Error fetching questions'
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { 
      rollNumber, 
      name, 
      category, 
      score, 
      percentage, 
      totalQuestions, 
      correctAnswers 
    } = req.body;
    
    if (!rollNumber || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected. Result not saved.'
      });
    }
    
    const config = await Config.findOne() || { passingPercentage: 40 };
    
    const user = new User({
      name,
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      totalMarks: totalQuestions || 0,
      obtainedMarks: score || 0,
      correctAnswers: correctAnswers || 0,
      totalQuestions: totalQuestions || 0,
      attempted: totalQuestions || 0,
      passingPercentage: config.passingPercentage,
      passed: (percentage || 0) >= config.passingPercentage
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: user
    });
    
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Dashboard Stats
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: false,
        message: 'Database not connected',
        stats: {}
      });
    }
    
    const [
      totalStudents,
      totalQuestions,
      totalAttempts,
      totalRegistrations,
      results
    ] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      User.countDocuments(),
      Registration.countDocuments(),
      User.find()
    ]);
    
    let averageScore = 0;
    let passRate = 0;
    
    if (results.length > 0) {
      const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
      averageScore = totalPercentage / results.length;
      const passedCount = results.filter(r => r.passed).length;
      passRate = (passedCount / results.length) * 100;
    }
    
    const config = await Config.findOne() || { 
      quizTime: 30, 
      passingPercentage: 40 
    };
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        totalRegistrations,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard'
    });
  }
});

// Add Question
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
    const { category, questionText, options } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question data'
      });
    }
    
    const question = new Question({
      category: category.toLowerCase(),
      questionText,
      options
    });
    
    await question.save();
    
    res.json({
      success: true,
      message: 'Question added',
      question
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question'
    });
  }
});

// Get Results
app.get('/api/admin/results', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: false,
        message: 'Database not connected',
        results: []
      });
    }
    
    const results = await User.find().sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

// Reset Admin Password
app.post('/admin/reset', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: false,
        message: 'Database not connected'
      });
    }
    
    await Admin.deleteMany({ username: 'admin' });
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@shamsi.edu.pk',
      role: 'superadmin'
    });
    
    res.json({
      success: true,
      message: 'Admin reset successfully'
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting admin'
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 MongoDB Status: ${getConnectionState()}`);
  console.log(`🔄 Connection String: ${MONGODB_URI ? 'Set' : 'Not set'}`);
});