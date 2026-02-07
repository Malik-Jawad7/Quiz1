const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ==================== CONFIGURATION ====================
const PORT = process.env.PORT || 5000;

// IMPORTANT: Yaha apna correct password likhein
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';
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
console.log('🚀 Starting MongoDB Connection for Vercel...');
console.log('📡 Using Connection String:', MONGODB_URI ? MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@') : 'Not found');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Vercel ke liye optimized mongoose settings
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);

// Connection retry function
let isConnecting = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;

const connectToDatabase = async () => {
  try {
    // Agar already connecting hai to wait karein
    if (isConnecting) {
      console.log('⏳ Already connecting to database...');
      return;
    }
    
    // Agar already connected hai
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
      return mongoose.connection;
    }
    
    isConnecting = true;
    connectionRetries++;
    
    console.log(`🔄 Connection attempt ${connectionRetries}/${MAX_RETRIES}`);
    
    // Clean connection string
    let connectionString = MONGODB_URI.trim();
    
    // Ensure it has proper parameters for Vercel
    if (!connectionString.includes('retryWrites=true')) {
      connectionString += connectionString.includes('?') ? '&' : '?';
      connectionString += 'retryWrites=true&w=majority';
    }
    
    // Add SSL for Vercel production
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      if (!connectionString.includes('ssl=')) {
        connectionString += '&ssl=true';
      }
      if (!connectionString.includes('tlsAllowInvalidCertificates')) {
        connectionString += '&tlsAllowInvalidCertificates=false';
      }
    }
    
    console.log('🔗 Final Connection String (masked):', 
      connectionString.replace(/\/\/[^@]+@/, '//***:***@'));
    
    // Connection options for Vercel
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
      minPoolSize: 1,
      connectTimeoutMS: 30000,
      family: 4 // Use IPv4
    };
    
    await mongoose.connect(connectionString, options);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database Name:', mongoose.connection.db?.databaseName);
    console.log('📍 Host:', mongoose.connection.host);
    console.log('📈 Connection State:', getConnectionState());
    
    isConnecting = false;
    connectionRetries = 0;
    
    // Connection event handlers
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
    
    return mongoose.connection;
    
  } catch (error) {
    isConnecting = false;
    
    console.error(`❌ Connection Failed (Attempt ${connectionRetries}):`, error.message);
    console.error('💡 Error Type:', error.name);
    
    if (connectionRetries < MAX_RETRIES) {
      console.log(`🔄 Retrying in 3 seconds... (${MAX_RETRIES - connectionRetries} attempts left)`);
      setTimeout(connectToDatabase, 3000);
    } else {
      console.error('💥 Max retries reached. Manual intervention required.');
      console.error('📝 Please check:');
      console.error('   1. MongoDB Atlas IP Whitelist: 0.0.0.0/0');
      console.error('   2. Username/Password in connection string');
      console.error('   3. Cluster status in MongoDB Atlas dashboard');
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
connectToDatabase();

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
      console.log('⚠️ Database not connected');
      return;
    }
    
    // Check and create admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      console.log('✅ Default admin created (username: admin, password: admin123)');
    }
    
    // Check and create config
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }
    
    console.log('📊 Database initialization complete');
    
  } catch (error) {
    console.error('❌ Database init error:', error.message);
  }
}

// ==================== MIDDLEWARE ====================
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Database connection check middleware
const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected',
      state: getConnectionState(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  const dbState = getConnectionState();
  const isConnected = mongoose.connection.readyState === 1;
  
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.2.0',
    database: isConnected ? 'Connected ✅' : `Disconnected ❌ (${dbState})`,
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      dbStatus: 'GET /api/db-status',
      testConnection: 'GET /api/test-connection',
      adminLogin: 'POST /admin/login',
      registerStudent: 'POST /api/register',
      getQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  const dbState = getConnectionState();
  
  res.json({
    success: true,
    status: 'running',
    database: dbState,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node: process.version,
    timestamp: new Date().toISOString()
  });
});

// Database status
app.get('/api/db-status', async (req, res) => {
  try {
    const state = getConnectionState();
    const isConnected = mongoose.connection.readyState === 1;
    
    let stats = {};
    if (isConnected) {
      try {
        // Try a simple query to verify connection
        await mongoose.connection.db.admin().ping();
        
        stats = {
          users: await User.countDocuments(),
          questions: await Question.countDocuments(),
          registrations: await Registration.countDocuments(),
          admins: await Admin.countDocuments(),
          config: await Config.findOne() || { quizTime: 30 }
        };
      } catch (dbError) {
        console.error('Database query error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      connected: isConnected,
      state: state,
      stats: stats,
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking database status',
      error: error.message
    });
  }
});

// Test MongoDB Connection
app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testing MongoDB Connection...');
    
    // Try to connect if not connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔧 Attempting to reconnect...');
      await connectToDatabase();
    }
    
    const isConnected = mongoose.connection.readyState === 1;
    
    if (isConnected) {
      // Test with actual database operation
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const adminCount = await Admin.countDocuments();
      
      res.json({
        success: true,
        message: '✅ MongoDB Connection Successful!',
        details: {
          host: mongoose.connection.host,
          database: db.databaseName,
          collections: collections.map(c => c.name),
          adminCount: adminCount,
          connectionState: getConnectionState()
        }
      });
    } else {
      res.json({
        success: false,
        message: '❌ MongoDB Connection Failed',
        state: getConnectionState(),
        connectionString: MONGODB_URI ? 'Set (masked)' : 'Not set',
        suggestion: 'Check MongoDB Atlas IP whitelist and credentials'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required'
      });
    }
    
    console.log(`🔐 Login attempt: ${username}`);
    
    // First, try default credentials (works even if DB is not connected)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'superadmin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful with default credentials',
        token: token,
        user: {
          username: 'admin',
          role: 'superadmin'
        }
      });
    }
    
    // If database is connected, check in database
    if (mongoose.connection.readyState === 1) {
      const admin = await Admin.findOne({ username });
      
      if (admin) {
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (isValid) {
          const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          return res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
              username: admin.username,
              role: admin.role
            }
          });
        }
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
      message: 'Login failed'
    });
  }
});

// Student Registration
app.post('/api/register', checkDB, async (req, res) => {
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
        message: 'This roll number is already registered'
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
      data: {
        name: registration.name,
        rollNumber: registration.rollNumber,
        category: registration.category,
        registeredAt: registration.registeredAt
      }
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
        message: 'Database not connected',
        config: {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50
        }
      });
    }
    
    const questions = await Question.find({ 
      category: category.toLowerCase() 
    });
    
    // Get config
    const config = await Config.findOne() || {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    // Hide correct answers for students
    const safeQuestions = questions
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(config.totalQuestions, questions.length))
      .map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options.map(opt => ({ text: opt.text })),
        marks: q.marks
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
      message: 'Error loading questions'
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', checkDB, async (req, res) => {
  try {
    const { 
      name, 
      rollNumber, 
      category, 
      score, 
      percentage, 
      correctAnswers, 
      totalQuestions,
      attempted 
    } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }
    
    const config = await Config.findOne() || { passingPercentage: 40 };
    
    const userResult = new User({
      name,
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      correctAnswers: correctAnswers || 0,
      totalQuestions: totalQuestions || 0,
      attempted: attempted || 0,
      totalMarks: totalQuestions || 0,
      obtainedMarks: score || 0,
      passingPercentage: config.passingPercentage,
      passed: (percentage || 0) >= config.passingPercentage
    });
    
    await userResult.save();
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        _id: userResult._id,
        name: userResult.name,
        rollNumber: userResult.rollNumber,
        score: userResult.score,
        percentage: userResult.percentage,
        correctAnswers: userResult.correctAnswers,
        totalQuestions: userResult.totalQuestions,
        passed: userResult.passed,
        submittedAt: userResult.submittedAt
      }
    });
    
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

// ==================== ADMIN PROTECTED ROUTES ====================

// Admin Dashboard
app.get('/api/admin/dashboard', verifyToken, checkDB, async (req, res) => {
  try {
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
      passingPercentage: 40,
      totalQuestions: 50
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
      message: 'Error loading dashboard'
    });
  }
});

// Get all results
app.get('/api/admin/results', verifyToken, checkDB, async (req, res) => {
  try {
    const results = await User.find().sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      results: results,
      count: results.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

// Add question
app.post('/api/admin/questions', verifyToken, checkDB, async (req, res) => {
  try {
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
      message: 'Question added successfully',
      question: question
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding question'
    });
  }
});

// Reset admin password
app.post('/admin/reset', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
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
    
    res.json({
      success: true,
      message: 'Admin reset successfully. Use username: admin, password: admin123'
    });
    
  } catch (error) {
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
    message: 'Route not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 MongoDB State: ${getConnectionState()}`);
  console.log(`🔗 Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
});