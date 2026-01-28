const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Enhanced CORS for production
app.use(cors({
  origin: [
    'https://quiz2-iota-one.vercel.app',
    'https://quiz2-4cwxe0m3j-khalids-projects-3de9ee65.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with error handling
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
    
    // Initialize data
    await initializeDefaultData();
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

// Connect to database
connectDB();

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 100 },
  passed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null }
});

const QuestionSchema = new mongoose.Schema({
  category: String,
  questionText: String,
  options: [{ text: String, isCorrect: Boolean }],
  marks: { type: Number, default: 1 },
  difficulty: { type: String, default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, default: 'admin' },
  password: { type: String, default: 'admin123' },
  email: { type: String, default: 'admin@shamsi.edu.pk' }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// Initialize default data
const initializeDefaultData = async () => {
  try {
    // Default admin
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = new Admin();
      await admin.save();
      console.log('✅ Default admin created');
    } else {
      console.log('✅ Admin already exists');
    }

    // Default config
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
      console.log('✅ Default config created');
    }

    // Sample questions
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      const sampleQuestions = [
        {
          category: 'html',
          questionText: 'What does HTML stand for?',
          options: [
            { text: 'Hyper Text Markup Language', isCorrect: true },
            { text: 'High Tech Modern Language', isCorrect: false },
            { text: 'Hyper Transfer Markup Language', isCorrect: false },
            { text: 'Home Tool Markup Language', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        },
        {
          category: 'css',
          questionText: 'What does CSS stand for?',
          options: [
            { text: 'Cascading Style Sheets', isCorrect: true },
            { text: 'Computer Style Sheets', isCorrect: false },
            { text: 'Creative Style System', isCorrect: false },
            { text: 'Colorful Style Sheets', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log('✅ Sample questions added');
    }
    
    console.log('📊 Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing data:', error.message);
  }
};

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusMessages = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };
    
    res.json({
      success: true,
      message: 'Shamsi Institute Quiz System API',
      timestamp: new Date().toISOString(),
      database: {
        status: statusMessages[dbStatus] || 'Unknown',
        connected: dbStatus === 1
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'API Error',
      error: error.message
    });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Admin login attempt for:', username);
    
    // First try database
    const admin = await Admin.findOne({ username });
    
    if (admin && admin.password === password) {
      return res.json({
        success: true,
        message: 'Login successful',
        user: { 
          username: admin.username, 
          role: 'admin',
          email: admin.email 
        }
      });
    }
    
    // Fallback to hardcoded credentials
    if (username === 'admin' && password === 'admin123') {
      return res.json({
        success: true,
        message: 'Login successful',
        user: { 
          username: 'admin', 
          role: 'admin',
          email: 'admin@shamsi.edu.pk' 
        }
      });
    }
    
    res.status(401).json({
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

// Get Config
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
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Config error:', error);
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      }
    });
  }
});

// Update Config
app.put('/api/config', async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    let config = await Config.findOne();
    if (!config) {
      config = new Config({ 
        quizTime, 
        passingPercentage, 
        totalQuestions 
      });
    } else {
      config.quizTime = quizTime || config.quizTime;
      config.passingPercentage = passingPercentage || config.passingPercentage;
      config.totalQuestions = totalQuestions || config.totalQuestions;
      config.updatedAt = new Date();
    }
    
    await config.save();
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update config',
      error: error.message 
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Question.distinct('category');
    const categoryInfo = [];
    
    for (const category of categories) {
      const questionCount = await Question.countDocuments({ category });
      categoryInfo.push({
        value: category,
        label: category.toUpperCase(),
        questionCount,
        isReady: questionCount >= 3
      });
    }
    
    // If no categories in DB, return default
    if (categoryInfo.length === 0) {
      return res.json({
        success: true,
        categories: [
          { value: 'html', label: 'HTML', questionCount: 5, isReady: true },
          { value: 'css', label: 'CSS', questionCount: 5, isReady: true },
          { value: 'javascript', label: 'JAVASCRIPT', questionCount: 5, isReady: true },
          { value: 'react', label: 'REACT', questionCount: 5, isReady: true },
          { value: 'mern', label: 'MERN', questionCount: 5, isReady: true }
        ]
      });
    }
    
    res.json({
      success: true,
      categories: categoryInfo
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', questionCount: 10, isReady: true },
        { value: 'css', label: 'CSS', questionCount: 10, isReady: true },
        { value: 'javascript', label: 'JAVASCRIPT', questionCount: 10, isReady: true },
        { value: 'react', label: 'REACT', questionCount: 10, isReady: true },
        { value: 'mern', label: 'MERN', questionCount: 10, isReady: true }
      ]
    });
  }
});

// Get All Questions (Admin)
app.get('/api/admin/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      questions,
      count: questions.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions',
      error: error.message 
    });
  }
});

// Add Question (Admin)
app.post('/api/admin/questions', async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, question text, and at least 2 options'
      });
    }
    
    const hasCorrectOption = options.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      return res.status(400).json({
        success: false,
        message: 'At least one option must be marked as correct'
      });
    }
    
    const question = new Question({
      category: category.toLowerCase(),
      questionText,
      options,
      marks: marks || 1,
      difficulty: difficulty || 'medium'
    });
    
    await question.save();
    
    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add question',
      error: error.message 
    });
  }
});

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete question',
      error: error.message 
    });
  }
});

// Delete All Questions (Admin)
app.delete('/api/admin/questions', async (req, res) => {
  try {
    const { confirm } = req.query;
    
    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Please confirm by adding ?confirm=true to the URL'
      });
    }
    
    const result = await Question.deleteMany({});
    
    res.json({
      success: true,
      message: `All questions (${result.deletedCount}) deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all questions',
      error: error.message 
    });
  }
});

// Get All Results (Admin)
app.get('/api/admin/results', async (req, res) => {
  try {
    const users = await User.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      results: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results',
      error: error.message 
    });
  }
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete result',
      error: error.message 
    });
  }
});

// Delete All Results (Admin)
app.delete('/api/admin/results', async (req, res) => {
  try {
    const { confirm } = req.query;
    
    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Please confirm by adding ?confirm=true to the URL'
      });
    }
    
    const result = await User.deleteMany({});
    
    res.json({
      success: true,
      message: `All results (${result.deletedCount}) deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all results',
      error: error.message 
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts: totalStudents,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0,
        passedStudents: 0,
        failedStudents: 0
      },
      categoryStats: []
    });
  } catch (error) {
    res.json({
      success: true,
      stats: {
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0,
        passedStudents: 0,
        failedStudents: 0
      },
      categoryStats: []
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      admin: {
        login: '/api/admin/login',
        dashboard: '/api/admin/dashboard',
        questions: '/api/admin/questions',
        results: '/api/admin/results'
      },
      quiz: {
        categories: '/api/categories',
        config: '/api/config'
      }
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// For Vercel deployment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`
    🚀 Server running on http://localhost:${PORT}
    📡 API Base URL: http://localhost:${PORT}/api
    🔗 Health Check: http://localhost:${PORT}/api/health
    👨‍💼 Admin Login: admin / admin123
    `);
  });
}

module.exports = app;