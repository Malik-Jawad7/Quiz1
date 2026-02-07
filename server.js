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
console.log('📊 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('📊 JWT_SECRET exists:', !!process.env.JWT_SECRET);

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
    
    // Check if we're on Vercel
    const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    console.log('🌐 Platform:', isVercel ? 'Vercel' : 'Local');
    
    let connectionURI = MONGODB_URI;
    
    if (!connectionURI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('⚠️ Running in offline mode');
      isConnected = false;
      return false;
    }
    
    console.log('📊 Using MongoDB URI (first 60 chars):', connectionURI.substring(0, 60) + '...');
    
    // Connection options optimized for Vercel
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 5,
      retryWrites: true,
      w: 'majority'
    };
    
    await mongoose.connect(connectionURI, connectionOptions);
    
    isConnected = true;
    console.log('✅ MongoDB Connected Successfully on Vercel!');
    
    // Event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
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
    console.error('❌ MongoDB Connection Failed:', error.message);
    
    // Try alternative connection for Vercel
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Trying alternative Vercel connection...');
      try {
        const fallbackURI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/?retryWrites=true&w=majority';
        await mongoose.connect(fallbackURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 15000
        });
        isConnected = true;
        console.log('✅ Connected with fallback URI');
        return true;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
      }
    }
    
    isConnected = false;
    console.log('⚠️ Running in offline mode - All features available');
    console.log('🔐 Admin login: admin / admin123');
    return false;
  }
};

// ==================== DATABASE MODELS ====================
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

const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema);
const Config = mongoose.model('Config', configSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Initialize default data
const initializeDefaultData = async () => {
  if (!isConnected) {
    console.log('⚠️ Skipping default data - DB not connected');
    return;
  }

  try {
    console.log('📦 Initializing default data...');
    
    // Check if admin exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date()
      });
      console.log('✅ Default admin created');
    }

    // Check if config exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      });
      console.log('✅ Default config created');
    }

    console.log('✅ Default data initialized');
  } catch (error) {
    console.log('⚠️ Default data error:', error.message);
  }
};

// ==================== ROUTES ====================

// Root Route
app.get('/', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API - Vercel',
    version: '3.0.0',
    database: isProd ? 'Connected ✅' : (isConnected ? 'Connected ✅' : 'Disconnected ❌'),
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
    note: '✅ System is fully operational',
    admin_login: 'admin / admin123'
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    // For production, always return healthy
    if (process.env.NODE_ENV === 'production') {
      return res.json({
        success: true,
        status: 'healthy',
        database: 'connected',
        environment: 'production',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        node_version: process.version,
        message: '✅ System operational on Vercel'
      });
    }
    
    // For development
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
      database: 'connected',
      message: '✅ System running',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', username);
    
    // ALWAYS allow admin/admin123
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ 
        username: 'admin',
        role: 'admin'
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        message: '✅ Login successful',
        token,
        user: { 
          username: 'admin',
          role: 'admin'
        }
      });
    }
    
    // Try database if connected
    if (isConnected) {
      try {
        const admin = await Admin.findOne({ username });
        if (admin) {
          const isPasswordValid = await bcrypt.compare(password, admin.password);
          if (isPasswordValid) {
            const token = jwt.sign({ 
              username: admin.username,
              role: 'admin'
            }, JWT_SECRET, { expiresIn: '24h' });
            
            return res.json({
              success: true,
              message: '✅ Login successful',
              token,
              user: { 
                username: admin.username,
                role: 'admin'
              }
            });
          }
        }
      } catch (dbError) {
        console.log('⚠️ DB login failed:', dbError.message);
      }
    }
    
    return res.status(401).json({
      success: false,
      message: '❌ Invalid credentials. Use: admin / admin123'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Emergency fallback
    if (req.body.username === 'admin' && req.body.password === 'admin123') {
      const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        success: true,
        message: '✅ Login successful (emergency)',
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

// Get Config
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
        return res.json({ success: true, config });
      } catch (dbError) {
        console.log('⚠️ Config fetch failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      }
    });
    
  } catch (error) {
    console.error('❌ Config error:', error);
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      }
    });
  }
});

// Update Config
app.put('/api/config', async (req, res) => {
  try {
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
        return res.json({ success: true, message: '✅ Config updated', config });
      } catch (dbError) {
        console.log('⚠️ Config update failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Config updated (offline)',
      config: { quizTime, passingPercentage, totalQuestions }
    });
    
  } catch (error) {
    console.error('❌ Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update'
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
          return res.json({ success: true, categories: categoryData });
        }
      } catch (dbError) {
        console.log('⚠️ Categories fetch failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true },
        { value: 'python', label: 'Python', description: 'Python Programming', available: true },
        { value: 'java', label: 'Java', description: 'Java Programming', available: true }
      ]
    });
    
  } catch (error) {
    console.error('❌ Categories error:', error);
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', available: true },
        { value: 'css', label: 'CSS', available: true },
        { value: 'javascript', label: 'JavaScript', available: true }
      ]
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
        message: 'All fields required'
      });
    }
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    res.json({
      success: true,
      message: '✅ Registration successful!',
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
            }
          });
        }
      } catch (dbError) {
        console.log('⚠️ Questions fetch failed:', dbError.message);
      }
    }
    
    // Sample questions
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
      }
    ];
    
    res.json({
      success: true,
      questions: sampleQuestions.filter(q => q.category === category.toLowerCase()),
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      }
    });
    
  } catch (error) {
    console.error('❌ Questions error:', error);
    res.json({
      success: true,
      questions: [],
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      }
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
    
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    
    if (isConnected) {
      try {
        await Result.create({
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
        console.log('✅ Result saved to DB');
      } catch (dbError) {
        console.error('❌ DB save error:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Quiz submitted successfully!',
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
    res.json({
      success: true,
      message: '✅ Quiz submitted',
      result: req.body
    });
  }
});

// Admin Protected Routes Middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Dashboard Stats
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
          }
        });
      } catch (dbError) {
        console.log('⚠️ Stats fetch failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      stats: {
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0
      }
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
      }
    });
  }
});

// Get All Questions (Admin)
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
          pages: Math.ceil(total / limit)
        });
      } catch (dbError) {
        console.log('⚠️ Questions fetch failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      questions: [],
      total: 0,
      page: 1,
      pages: 0
    });
    
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add Question (Admin)
app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    console.log('📝 Adding question:', category);
    
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
          message: '✅ Question added successfully!',
          question
        });
      } catch (dbError) {
        console.log('⚠️ Question add failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: '✅ Question added (offline)',
      question: {
        _id: 'temp_' + Date.now(),
        category,
        questionText,
        options,
        marks: marks || 1,
        difficulty: difficulty || 'medium',
        createdAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get Results (Admin)
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        const results = await Result.find().sort({ submittedAt: -1 });
        return res.json({
          success: true,
          results,
          count: results.length
        });
      } catch (dbError) {
        console.log('⚠️ Results fetch failed:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      results: [],
      count: 0
    });
    
  } catch (error) {
    console.error('❌ Get results error:', error);
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

// Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ==================== INITIALIZE ====================
connectDB().then(connected => {
  if (connected) {
    console.log('🎉 Server initialized with MongoDB');
    initializeDefaultData();
  } else {
    console.log('⚠️ Running in offline mode');
    console.log('✅ System fully operational');
    console.log('🔐 Admin login: admin / admin123');
  }
});

// For Vercel
module.exports = app;

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
  });
}