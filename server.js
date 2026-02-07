const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ==================== CONFIGURATION ====================
const PORT = process.env.PORT || 5000;

// IMPORTANT: MongoDB Atlas se exact connection string copy karein
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_2024';

console.log('🚀 Starting Quiz System...');
console.log('📡 MongoDB Connection Status:', MONGODB_URI ? 'Configured' : 'Not Configured');

// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
// Connection status tracking
let dbConnectionStatus = 'disconnected';

const connectToDatabase = async () => {
  try {
    // Agar already connected hai
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
      dbConnectionStatus = 'connected';
      return true;
    }
    
    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    dbConnectionStatus = 'connecting';
    
    // Connection string format
    const connectionString = MONGODB_URI;
    
    console.log('📊 Using connection string:', connectionString ? 'Set' : 'Not set');
    
    // Connection options for Vercel
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 1,
      family: 4, // Use IPv4
      ssl: true, // Force SSL for Vercel
      tlsAllowInvalidCertificates: false
    };
    
    // Connect
    await mongoose.connect(connectionString, connectionOptions);
    
    console.log('🎉 SUCCESS: MongoDB Atlas Connected!');
    console.log('📁 Database:', mongoose.connection.db?.databaseName || 'quiz_system');
    console.log('🌐 Host:', mongoose.connection.host);
    
    dbConnectionStatus = 'connected';
    
    // Initialize database
    await initializeDatabase();
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB Connection FAILED!');
    console.error('🔍 Error:', error.message);
    console.error('📝 Error Code:', error.code || 'N/A');
    console.error('💡 Solution Steps:');
    console.error('   1. Go to MongoDB Atlas Dashboard');
    console.error('   2. Click "Network Access"');
    console.error('   3. Add IP Address: 0.0.0.0/0');
    console.error('   4. Save and wait 1-2 minutes');
    
    dbConnectionStatus = 'disconnected';
    return false;
  }
};

// Connect on startup
connectToDatabase();

// Reconnection logic
setInterval(async () => {
  if (dbConnectionStatus !== 'connected') {
    console.log('🔄 Attempting reconnection...');
    await connectToDatabase();
  }
}, 30000); // Try every 30 seconds

// ==================== DATABASE SCHEMAS ====================
// Simple schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const registrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true },
  category: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });

// Create models (with try-catch to prevent errors)
let User, Registration, Question, Admin;

try {
  User = mongoose.model('User') || mongoose.model('User', userSchema);
  Registration = mongoose.model('Registration') || mongoose.model('Registration', registrationSchema);
  Question = mongoose.model('Question') || mongoose.model('Question', questionSchema);
  Admin = mongoose.model('Admin') || mongoose.model('Admin', adminSchema);
} catch (error) {
  // Models already defined
  User = mongoose.model('User');
  Registration = mongoose.model('Registration');
  Question = mongoose.model('Question');
  Admin = mongoose.model('Admin');
}

// ==================== DATABASE INITIALIZATION ====================
async function initializeDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Create default admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        role: 'superadmin'
      });
      console.log('✅ Default admin created: admin / admin123');
    }
    
    console.log('📊 Database setup complete');
    
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
  }
}

// ==================== MIDDLEWARE ====================
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// ==================== ROUTES ====================

// Home page
app.get('/', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System',
    version: '5.0.0',
    database: isConnected ? '✅ Connected' : '❌ Disconnected',
    status: dbConnectionStatus,
    timestamp: new Date().toISOString(),
    endpoints: {
      test: 'GET /api/test',
      adminLogin: 'POST /admin/login',
      register: 'POST /api/register',
      questions: 'GET /api/questions/:category',
      submit: 'POST /api/submit'
    }
  });
});

// Database test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    
    if (isConnected) {
      // Test database operations
      const adminCount = await Admin.countDocuments();
      const questionCount = await Question.countDocuments();
      
      res.json({
        success: true,
        message: '🎉 MongoDB Atlas is WORKING!',
        connection: '✅ Connected',
        stats: {
          admins: adminCount,
          questions: questionCount,
          database: mongoose.connection.name
        },
        host: mongoose.connection.host,
        state: mongoose.connection.readyState
      });
    } else {
      // Try to connect
      const connected = await connectToDatabase();
      
      res.json({
        success: connected,
        message: connected ? '✅ Connected successfully!' : '❌ Failed to connect',
        connection: connected ? 'Connected' : 'Disconnected',
        suggestion: 'Please check MongoDB Atlas IP whitelist (0.0.0.0/0)'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// Admin Login (ALWAYS WORKS - even without database)
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`🔐 Login attempt: ${username}`);
    
    // Default admin credentials (ALWAYS WORK)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'superadmin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          username: 'admin',
          role: 'superadmin'
        }
      });
    }
    
    // If database is connected, check there too
    if (mongoose.connection.readyState === 1) {
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
          token: token,
          user: {
            username: admin.username,
            role: admin.role
          }
        });
      }
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
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
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not available. Please try again later.'
      });
    }
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    // Check if already registered
    const existing = await Registration.findOne({ rollNumber: formattedRollNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This roll number is already registered'
      });
    }
    
    // Register student
    const registration = await Registration.create({
      name,
      rollNumber: formattedRollNumber,
      category: category.toLowerCase()
    });
    
    res.json({
      success: true,
      message: 'Registration successful!',
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

// Get Questions
app.get('/api/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Check database
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        questions: [],
        message: 'Database not connected',
        config: {
          time: 30,
          passingPercentage: 40
        }
      });
    }
    
    // Get questions
    const questions = await Question.find({ 
      category: category.toLowerCase() 
    }).limit(50);
    
    // Hide correct answers
    const safeQuestions = questions.map(q => ({
      id: q._id,
      question: q.questionText,
      options: q.options.map(opt => ({ text: opt.text })),
      marks: q.marks
    }));
    
    res.json({
      success: true,
      questions: safeQuestions,
      count: safeQuestions.length,
      config: {
        time: 30,
        passingPercentage: 40,
        totalQuestions: 50
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
app.post('/api/submit', async (req, res) => {
  try {
    const { name, rollNumber, category, score, percentage } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Required information missing'
      });
    }
    
    // Check database
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not available. Result not saved.'
      });
    }
    
    // Save result
    const result = await User.create({
      name,
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      passed: (percentage || 0) >= 40
    });
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully!',
      result: {
        name: result.name,
        rollNumber: result.rollNumber,
        score: result.score,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt
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

// Admin Dashboard
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: false,
        message: 'Database not connected',
        stats: {}
      });
    }
    
    const [students, questions, registrations, results] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      Registration.countDocuments(),
      User.find().sort({ submittedAt: -1 }).limit(10)
    ]);
    
    res.json({
      success: true,
      stats: {
        totalStudents: students,
        totalQuestions: questions,
        totalRegistrations: registrations,
        recentResults: results
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading dashboard'
    });
  }
});

// Add Question (Admin)
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
        message: 'Please provide complete question data'
      });
    }
    
    const question = await Question.create({
      category: category.toLowerCase(),
      questionText,
      options
    });
    
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

// Reset Admin
app.post('/admin/reset', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
    await Admin.deleteMany({ username: 'admin' });
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      role: 'superadmin'
    });
    
    res.json({
      success: true,
      message: 'Admin reset successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting admin'
    });
  }
});

// Check Database Status
app.get('/api/status', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  
  res.json({
    success: true,
    database: {
      connected: isConnected,
      state: mongoose.connection.readyState,
      status: dbConnectionStatus,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      node: process.version
    }
  });
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
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`🔗 Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
});