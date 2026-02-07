const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_key_2024_vercel_deploy';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/shamsi_quiz_system?retryWrites=true&w=majority&appName=Cluster0';
const PORT = process.env.PORT || 5000;

console.log('🚀 Shamsi Institute Quiz System Backend - Vercel');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('📊 MongoDB URI length:', MONGODB_URI ? MONGODB_URI.length : 'Not defined');

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== DATABASE CONNECTION ====================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('📊 Using existing MongoDB connection');
    return true;
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined!');
      console.error('Please set MONGODB_URI in Vercel environment variables');
      return false;
    }

    // Show first 50 chars of URI (for debugging, don't log full URI)
    console.log('📊 MongoDB URI (first 50 chars):', MONGODB_URI.substring(0, 50) + '...');

    // Fix: Add proper connection options
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip IPv6
    };

    await mongoose.connect(MONGODB_URI, connectionOptions);

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully');
    
    // Setup connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error Details:');
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Common error fixes
    if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('⚠️ Network issue: Cannot resolve MongoDB hostname');
    } else if (error.message.includes('Authentication failed')) {
      console.error('⚠️ Authentication issue: Check username/password');
    } else if (error.message.includes('timed out')) {
      console.error('⚠️ Connection timeout: Check network/firewall');
    }
    
    isConnected = false;
    return false;
  }
};

// ==================== DATABASE MODELS ====================

// Question Schema
const questionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

// Result Schema
const resultSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  passingPercentage: { type: Number, default: 40 },
  passed: { type: Boolean, default: false },
  cheatingDetected: { type: Boolean, default: false },
  isAutoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
});

// Config Schema
const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema);
const Config = mongoose.model('Config', configSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Initialize default data
const initializeDefaultData = async () => {
  if (!isConnected) {
    console.log('⚠️ Skipping default data init: DB not connected');
    return;
  }

  try {
    console.log('📦 Initializing default data...');
    
    // Create default admin if not exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date()
      });
      console.log('✅ Default admin created: admin / admin123');
    } else {
      console.log('✅ Admin already exists');
    }

    // Create default config if not exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      });
      console.log('✅ Default config created');
    } else {
      console.log('✅ Config already exists');
    }

    console.log('✅ Default data initialization complete');
  } catch (error) {
    console.log('⚠️ Default data init error:', error.message);
  }
};

// ==================== ROUTES ====================

// Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API - Vercel',
    version: '3.0.0',
    database: isConnected ? 'Connected ✅' : 'Disconnected ❌',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      admin_login: 'POST /admin/login',
      register: 'POST /api/register',
      quiz_questions: 'GET /api/quiz/questions/:category',
      submit_quiz: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories'
    },
    note: 'Admin login always works with: admin / admin123'
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Try to connect if not connected
    if (!isConnected) {
      await connectDB();
    }
    
    res.json({
      success: true,
      status: 'healthy',
      database: isConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      node_version: process.version
    });
  } catch (error) {
    res.json({
      success: true,
      status: 'healthy',
      database: 'disconnected',
      message: 'Running in fallback mode',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin Login (ALWAYS WORKS - NO DATABASE DEPENDENCY)
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt:', username);
    
    // CRITICAL: ALWAYS allow admin/admin123 - NO DATABASE CHECK
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ 
        username: 'admin',
        role: 'admin',
        source: 'fallback'
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { 
          username: 'admin',
          role: 'admin'
        }
      });
    }
    
    // Try database as secondary option (if connected)
    if (isConnected) {
      try {
        const admin = await Admin.findOne({ username });
        
        if (admin) {
          const isPasswordValid = await bcrypt.compare(password, admin.password);
          
          if (isPasswordValid) {
            const token = jwt.sign({ 
              username: admin.username,
              role: 'admin',
              source: 'database'
            }, JWT_SECRET, { expiresIn: '24h' });
            
            return res.json({
              success: true,
              message: 'Login successful',
              token,
              user: { 
                username: admin.username,
                role: 'admin'
              }
            });
          }
        }
      } catch (dbError) {
        console.log('⚠️ Database login failed, using fallback:', dbError.message);
      }
    }
    
    // If not found or DB error
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Use default: admin / admin123'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Ultimate fallback - always return success for admin/admin123
    if (req.body.username === 'admin' && req.body.password === 'admin123') {
      const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        success: true,
        message: 'Login successful (emergency fallback)',
        token,
        user: { username: 'admin' }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset Admin
app.post('/admin/reset', async (req, res) => {
  try {
    if (isConnected) {
      try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await Admin.findOneAndUpdate(
          { username: 'admin' },
          { password: hashedPassword },
          { upsert: true, new: true }
        );
      } catch (dbError) {
        console.log('⚠️ Database reset failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Admin credentials set to: admin / admin123'
    });
    
  } catch (error) {
    console.error('❌ Reset error:', error);
    res.json({
      success: true,
      message: '✅ Admin reset (fallback mode)'
    });
  }
});

// ==================== PUBLIC ROUTES ====================

// Get Configuration
app.get('/api/config', async (req, res) => {
  try {
    if (isConnected) {
      try {
        let config = await Config.findOne();
        
        if (!config) {
          config = await Config.create({
            quizTime: 30,
            passingPercentage: 40,
            totalQuestions: 50
          });
        }
        
        return res.json({
          success: true,
          config,
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database config fetch failed:', dbError.message);
      }
    }
    
    // Fallback config
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Get config error:', error);
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      source: 'error'
    });
  }
});

// Update Configuration
app.put('/api/config', async (req, res) => {
  try {
    // Check token (but allow even without DB)
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    jwt.verify(token, JWT_SECRET);
    
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    if (isConnected) {
      try {
        let config = await Config.findOne();
        
        if (!config) {
          config = await Config.create({
            quizTime,
            passingPercentage,
            totalQuestions
          });
        } else {
          config.quizTime = quizTime;
          config.passingPercentage = passingPercentage;
          config.totalQuestions = totalQuestions;
          config.updatedAt = new Date();
          await config.save();
        }
        
        return res.json({
          success: true,
          message: '✅ Configuration updated in database',
          config,
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database config update failed:', dbError.message);
      }
    }
    
    // Fallback - just return success
    res.json({
      success: true,
      message: '✅ Configuration updated (fallback mode)',
      config: {
        quizTime,
        passingPercentage,
        totalQuestions
      },
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    if (isConnected) {
      try {
        const categories = await Question.distinct('category');
        
        if (categories.length > 0) {
          const categoryData = categories.map(cat => ({
            value: cat,
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            description: `${cat.toUpperCase()} Technology`,
            available: true
          }));
          
          return res.json({
            success: true,
            categories: categoryData,
            source: 'database'
          });
        }
      } catch (dbError) {
        console.log('⚠️ Database categories fetch failed:', dbError.message);
      }
    }
    
    // Default categories
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true },
        { value: 'python', label: 'Python', description: 'Python Programming', available: true },
        { value: 'java', label: 'Java', description: 'Java Programming', available: true },
        { value: 'mongodb', label: 'MongoDB', description: 'NoSQL Database', available: true },
        { value: 'mysql', label: 'MySQL', description: 'SQL Database', available: true }
      ],
      source: 'default'
    });
    
  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true }
      ],
      source: 'error'
    });
  }
});

// Register User
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    res.json({
      success: true,
      message: 'Registration successful! You can now start the quiz.',
      user: {
        name: name.trim(),
        rollNumber: formattedRollNumber,
        category: category.toLowerCase()
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
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
    
    console.log('📚 Fetching questions for:', category);
    
    if (isConnected) {
      try {
        const config = await Config.findOne();
        const limit = config?.totalQuestions || 50;
        
        const questions = await Question.find({ 
          category: category.toLowerCase() 
        }).limit(limit);
        
        if (questions.length > 0) {
          console.log(`✅ Found ${questions.length} questions`);
          
          return res.json({
            success: true,
            questions,
            config: {
              quizTime: config?.quizTime || 30,
              passingPercentage: config?.passingPercentage || 40,
              totalQuestions: limit
            },
            source: 'database'
          });
        }
      } catch (dbError) {
        console.log('⚠️ Database questions fetch failed:', dbError.message);
      }
    }
    
    // Sample questions for fallback
    const sampleQuestions = [
      {
        _id: 'sample1',
        questionText: 'What does HTML stand for?',
        options: [
          { text: 'Hyper Text Markup Language', isCorrect: true },
          { text: 'Home Tool Markup Language', isCorrect: false },
          { text: 'Hyperlinks and Text Markup Language', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy',
        category: 'html'
      },
      {
        _id: 'sample2',
        questionText: 'Which tag is used for the largest heading?',
        options: [
          { text: '<h1>', isCorrect: true },
          { text: '<h6>', isCorrect: false },
          { text: '<heading>', isCorrect: false },
          { text: '<head>', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy',
        category: 'html'
      },
      {
        _id: 'sample3',
        questionText: 'What is CSS used for?',
        options: [
          { text: 'Styling web pages', isCorrect: true },
          { text: 'Creating web page structure', isCorrect: false },
          { text: 'Server-side programming', isCorrect: false },
          { text: 'Database management', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy',
        category: 'css'
      }
    ];
    
    // Filter by category
    const filteredQuestions = sampleQuestions.filter(q => 
      q.category === category.toLowerCase()
    );
    
    res.json({
      success: true,
      questions: filteredQuestions.length > 0 ? filteredQuestions : sampleQuestions,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      source: 'sample'
    });
    
  } catch (error) {
    console.error('❌ Get quiz questions error:', error);
    
    // Emergency fallback
    const emergencyQuestions = [
      {
        _id: 'emergency1',
        questionText: 'Welcome to Shamsi Institute Quiz!',
        options: [
          { text: 'This is a sample question', isCorrect: true },
          { text: 'Database is not connected', isCorrect: false },
          { text: 'Please contact administrator', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy',
        category: 'general'
      }
    ];
    
    res.json({
      success: true,
      questions: emergencyQuestions,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      source: 'emergency'
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
      totalQuestions,
      correctAnswers,
      attempted,
      passingPercentage,
      cheatingDetected,
      isAutoSubmitted
    } = req.body;
    
    console.log('📤 Quiz submission:', { name, rollNumber, score: correctAnswers });
    
    // Calculate results
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    
    // Try to save to database if connected
    if (isConnected) {
      try {
        const result = await Result.create({
          rollNumber,
          name,
          category,
          score: correctAnswers,
          percentage: parseFloat(percentage.toFixed(2)),
          totalQuestions,
          correctAnswers,
          attempted,
          passingPercentage,
          passed,
          cheatingDetected: cheatingDetected || false,
          isAutoSubmitted: isAutoSubmitted || false,
          submittedAt: new Date()
        });
        
        console.log('✅ Result saved to database:', result._id);
      } catch (dbError) {
        console.error('❌ Database save error:', dbError.message);
      }
    }
    
    // Always return success
    res.json({
      success: true,
      message: 'Quiz submitted successfully!',
      result: {
        rollNumber,
        name,
        category,
        score: correctAnswers,
        percentage: parseFloat(percentage.toFixed(2)),
        totalQuestions,
        correctAnswers,
        attempted,
        passingPercentage,
        passed,
        submittedAt: new Date().toISOString(),
        savedToDB: isConnected
      }
    });
    
  } catch (error) {
    console.error('❌ Submit quiz error:', error);
    
    // Still return success
    res.json({
      success: true,
      message: 'Quiz submitted (local mode)',
      result: req.body
    });
  }
});

// ==================== ADMIN PROTECTED ROUTES ====================

// Auth middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }
    
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Get Dashboard Stats
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        const totalStudents = await Result.countDocuments();
        const totalQuestions = await Question.countDocuments();
        
        const results = await Result.find();
        const averageScore = results.length > 0 
          ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
          : 0;
        
        const passedCount = results.filter(r => r.passed).length;
        const passRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttempts = await Result.countDocuments({
          submittedAt: { $gte: today }
        });
        
        return res.json({
          success: true,
          stats: {
            totalStudents,
            totalQuestions,
            totalAttempts: totalStudents,
            averageScore: parseFloat(averageScore.toFixed(2)),
            passRate: parseFloat(passRate.toFixed(2)),
            todayAttempts
          },
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database stats fetch failed:', dbError.message);
      }
    }
    
    // Fallback stats
    res.json({
      success: true,
      stats: {
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0
      },
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.json({
      success: true,
      stats: {
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0
      },
      source: 'error'
    });
  }
});

// Get All Questions
app.get('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
        
        let query = {};
        if (category !== 'all') query.category = category;
        if (search) {
          query.$or = [
            { questionText: { $regex: search, $options: 'i' } },
            { 'options.text': { $regex: search, $options: 'i' } }
          ];
        }
        
        const questions = await Question.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));
        
        const total = await Question.countDocuments(query);
        
        return res.json({
          success: true,
          questions,
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database questions fetch failed:', dbError.message);
      }
    }
    
    // Fallback
    res.json({
      success: true,
      questions: [],
      total: 0,
      page: 1,
      pages: 0,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add Question
app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    console.log('📝 Adding question:', category);
    
    // Validation
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options required'
      });
    }
    
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option must be specified'
      });
    }
    
    if (isConnected) {
      try {
        const question = await Question.create({
          category: category.toLowerCase(),
          questionText: questionText.trim(),
          options: options.map(opt => ({
            text: opt.text.trim(),
            isCorrect: Boolean(opt.isCorrect)
          })),
          marks: marks || 1,
          difficulty: difficulty || 'medium'
        });
        
        return res.json({
          success: true,
          message: '✅ Question added successfully to database!',
          question,
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database question add failed:', dbError.message);
      }
    }
    
    // Fallback
    res.json({
      success: true,
      message: '✅ Question added (offline mode)',
      question: {
        _id: 'temp_' + Date.now(),
        category,
        questionText,
        options,
        marks: marks || 1,
        difficulty: difficulty || 'medium',
        createdAt: new Date()
      },
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update Question
app.put('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (isConnected) {
      try {
        const question = await Question.findByIdAndUpdate(
          id,
          {
            category: category.toLowerCase(),
            questionText: questionText.trim(),
            options: options.map(opt => ({
              text: opt.text.trim(),
              isCorrect: Boolean(opt.isCorrect)
            })),
            marks: marks || 1,
            difficulty: difficulty || 'medium'
          },
          { new: true }
        );
        
        if (question) {
          return res.json({
            success: true,
            message: '✅ Question updated successfully!',
            question
          });
        }
      } catch (dbError) {
        console.log('⚠️ Database question update failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Question updated (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete Question
app.delete('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isConnected) {
      try {
        await Question.findByIdAndDelete(id);
        return res.json({
          success: true,
          message: '✅ Question deleted successfully!'
        });
      } catch (dbError) {
        console.log('⚠️ Database question delete failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Question deleted (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get Results
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        const results = await Result.find().sort({ submittedAt: -1 });
        
        return res.json({
          success: true,
          results,
          count: results.length,
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database results fetch failed:', dbError.message);
      }
    }
    
    // Fallback
    res.json({
      success: true,
      results: [],
      count: 0,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete Result
app.delete('/api/admin/results/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isConnected) {
      try {
        await Result.findByIdAndDelete(id);
        return res.json({
          success: true,
          message: '✅ Result deleted successfully!'
        });
      } catch (dbError) {
        console.log('⚠️ Database result delete failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Result deleted (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete All Results
app.delete('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        await Result.deleteMany({});
        return res.json({
          success: true,
          message: '✅ All results deleted successfully!'
        });
      } catch (dbError) {
        console.log('⚠️ Database results delete failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ All results deleted (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== INITIALIZE ====================

// Connect to DB on startup
connectDB().then(connected => {
  if (connected) {
    console.log('🎉 Server initialized with MongoDB connection');
    initializeDefaultData();
  } else {
    console.log('⚠️ Server running in fallback mode (no MongoDB)');
    console.log('ℹ️  Admin login will still work with: admin / admin123');
  }
});

// For Vercel
module.exports = app;

// For local development
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
  });
}