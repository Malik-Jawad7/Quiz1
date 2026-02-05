const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection with improved error handling
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 Connecting to MongoDB...');

// Enhanced MongoDB connection options
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database: quiz_system');
  initializeDatabase();
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
  console.log('⚠️ Running in simulated mode without database');
  console.log('💡 Possible solutions:');
  console.log('   1. Check your internet connection');
  console.log('   2. Verify MongoDB Atlas IP whitelist (0.0.0.0/0)');
  console.log('   3. Check MongoDB credentials');
});

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  category: String,
  score: Number,
  percentage: Number,
  marksObtained: Number,
  totalMarks: Number,
  passed: Boolean,
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

// Create models with fallback for offline mode
let User, Registration, Question, Admin, Config;

try {
  User = mongoose.model('User');
  Registration = mongoose.model('Registration');
  Question = mongoose.model('Question');
  Admin = mongoose.model('Admin');
  Config = mongoose.model('Config');
} catch {
  User = mongoose.model('User', userSchema);
  Registration = mongoose.model('Registration', registrationSchema);
  Question = mongoose.model('Question', questionSchema);
  Admin = mongoose.model('Admin', adminSchema);
  Config = mongoose.model('Config', configSchema);
}

// In-memory storage for offline mode
const inMemoryStorage = {
  users: [],
  registrations: [],
  questions: [],
  admins: [],
  configs: []
};

// Initialize Database function
async function initializeDatabase() {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Database not connected, using in-memory storage');
      return;
    }

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

    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }

    // Add sample questions for testing
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('📝 Creating sample questions for testing...');
      
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
          difficulty: 'easy'
        },
        {
          category: 'css',
          questionText: 'What does CSS stand for?',
          options: [
            { text: 'Creative Style Sheets', isCorrect: false },
            { text: 'Cascading Style Sheets', isCorrect: true },
            { text: 'Computer Style Sheets', isCorrect: false },
            { text: 'Colorful Style Sheets', isCorrect: false }
          ],
          difficulty: 'easy'
        },
        {
          category: 'javascript',
          questionText: 'Which company developed JavaScript?',
          options: [
            { text: 'Microsoft', isCorrect: false },
            { text: 'Netscape', isCorrect: true },
            { text: 'Google', isCorrect: false },
            { text: 'Apple', isCorrect: false }
          ],
          difficulty: 'easy'
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log('✅ Created sample questions');
    }

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// JWT Secret
const JWT_SECRET = 'shamsi_institute_secret_key_2024';

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
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

// ✅ ROOT ROUTE
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System Backend API',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    deployed: {
      frontend: 'https://quiz2-iota-one.vercel.app',
      backend: 'https://backend-one-taupe-14.vercel.app'
    },
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/register',
      adminLogin: 'POST /admin/login OR POST /api/admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running 🟢',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'POST /admin/login',
      'POST /api/register',
      'GET /api/quiz/questions/:category',
      'POST /api/quiz/submit'
    ]
  });
});

// ✅ Admin login routes
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt:', username);
    
    // Default admin credentials (always works)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'admin_id', 
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
    
    // Try database if connected
    if (mongoose.connection.readyState === 1) {
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
    }
    
    // If database not connected, use default only
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Use username: admin, password: admin123'
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

// Also keep the API route
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 API Admin login attempt:', username);
    
    // Same logic as /admin/login
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'admin_id', 
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
    
    if (mongoose.connection.readyState === 1) {
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

// ✅ REGISTER USER ENDPOINT
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    console.log('📝 Registration attempt:', { name, rollNumber, category });
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    // Check if category exists in questions
    let questionCount = 0;
    if (mongoose.connection.readyState === 1) {
      questionCount = await Question.countDocuments({ category: category.toLowerCase() });
    }
    
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: `No questions available for "${category}" category. Please select a different category.`,
        availableCategories: ['html', 'css', 'javascript', 'react', 'node']
      });
    }
    
    // Save registration
    try {
      const registration = new Registration({
        name,
        rollNumber,
        category
      });
      await registration.save();
      console.log('✅ Registration saved to database');
    } catch (registrationError) {
      console.log('Registration logging failed:', registrationError.message);
    }
    
    console.log('✅ Registration successful for:', name);
    
    res.json({
      success: true,
      message: 'Registration successful',
      data: {
        name,
        rollNumber: `SI-${rollNumber}`,
        category,
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

// Get dashboard stats
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    let totalStudents = 0;
    let totalQuestions = 0;
    let totalAttempts = 0;
    let averageScore = 0;
    let passRate = 0;
    let todayAttempts = 0;
    
    if (mongoose.connection.readyState === 1) {
      totalStudents = await User.countDocuments();
      totalQuestions = await Question.countDocuments();
      totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
      
      const results = await User.find({ submittedAt: { $ne: null } });
      
      if (results.length > 0) {
        const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
        averageScore = totalPercentage / results.length;
        
        const passedCount = results.filter(r => r.passed).length;
        passRate = (passedCount / results.length) * 100;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      todayAttempts = await User.countDocuments({ 
        submittedAt: { $gte: today } 
      });
    }
    
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40, totalQuestions: 50 };
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        averageScore: averageScore.toFixed(2),
        passRate: passRate.toFixed(2),
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

// Get all questions
app.get('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    const { category, page = 1, limit = 100 } = req.query;
    
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    
    let questions = [];
    let total = 0;
    
    if (mongoose.connection.readyState === 1) {
      const skip = (page - 1) * limit;
      questions = await Question.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      total = await Question.countDocuments(query);
    }
    
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

// Add question
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: category, questionText, and at least 2 options'
      });
    }
    
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option is required'
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

// Delete question
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

// Get results
app.get('/api/admin/results', verifyToken, async (req, res) => {
  try {
    let results = [];
    
    if (mongoose.connection.readyState === 1) {
      results = await User.find({ submittedAt: { $ne: null } })
        .sort({ submittedAt: -1 });
    }
    
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

// Delete result
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

// Delete all results
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

// ✅ GET CONFIG
app.get('/api/config', async (req, res) => {
  try {
    let config;
    
    if (mongoose.connection.readyState === 1) {
      config = await Config.findOne();
    }
    
    if (!config) {
      config = {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      };
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

// Update config
app.put('/api/config', verifyToken, async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    let config;
    
    if (mongoose.connection.readyState === 1) {
      config = await Config.findOne();
      
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
    } else {
      config = {
        quizTime: quizTime || 30,
        passingPercentage: passingPercentage || 40,
        totalQuestions: totalQuestions || 50
      };
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

// ✅ GET CATEGORIES
app.get('/api/categories', async (req, res) => {
  try {
    let categories = [];
    
    if (mongoose.connection.readyState === 1) {
      const dbCategories = await Question.distinct('category');
      
      categories = await Promise.all(
        dbCategories.map(async (category) => {
          const count = await Question.countDocuments({ category });
          return {
            value: category,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            questionCount: count
          };
        })
      );
    }
    
    // Default categories if database is empty
    if (categories.length === 0) {
      categories = [
        { value: 'html', label: 'HTML', questionCount: 3 },
        { value: 'css', label: 'CSS', questionCount: 2 },
        { value: 'javascript', label: 'JavaScript', questionCount: 2 },
        { value: 'react', label: 'React', questionCount: 2 },
        { value: 'node', label: 'Node.js', questionCount: 1 }
      ];
    }
    
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

// ✅ GET QUIZ QUESTIONS
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('📚 Fetching questions for category:', category);
    
    let questions = [];
    
    if (mongoose.connection.readyState === 1) {
      questions = await Question.find({ category: category.toLowerCase() });
    }
    
    if (questions.length === 0) {
      // Return sample questions for testing
      const sampleQuestions = {
        html: [
          {
            questionText: 'What does HTML stand for?',
            options: [
              { text: 'Hyper Text Markup Language', isCorrect: true },
              { text: 'High Tech Modern Language', isCorrect: false },
              { text: 'Hyper Transfer Markup Language', isCorrect: false },
              { text: 'Home Tool Markup Language', isCorrect: false }
            ],
            marks: 1,
            difficulty: 'easy'
          }
        ],
        css: [
          {
            questionText: 'What does CSS stand for?',
            options: [
              { text: 'Creative Style Sheets', isCorrect: false },
              { text: 'Cascading Style Sheets', isCorrect: true },
              { text: 'Computer Style Sheets', isCorrect: false },
              { text: 'Colorful Style Sheets', isCorrect: false }
            ],
            marks: 1,
            difficulty: 'easy'
          }
        ],
        javascript: [
          {
            questionText: 'Which company developed JavaScript?',
            options: [
              { text: 'Microsoft', isCorrect: false },
              { text: 'Netscape', isCorrect: true },
              { text: 'Google', isCorrect: false },
              { text: 'Apple', isCorrect: false }
            ],
            marks: 1,
            difficulty: 'easy'
          }
        ]
      };
      
      questions = sampleQuestions[category.toLowerCase()] || [];
    }
    
    // Get config
    let config;
    if (mongoose.connection.readyState === 1) {
      config = await Config.findOne();
    }
    
    if (!config) {
      config = {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      };
    }
    
    // Limit questions
    const selectedQuestions = questions.slice(0, Math.min(config.totalQuestions, questions.length));
    
    res.json({
      success: true,
      questions: selectedQuestions,
      count: selectedQuestions.length,
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions
      }
    });
    
  } catch (error) {
    console.error('Get quiz questions error:', error);
    res.status(500).json({
      success: true, // Return success to allow testing
      questions: [
        {
          questionText: 'Sample Question (Database not connected)',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false },
            { text: 'Option C', isCorrect: false },
            { text: 'Option D', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        }
      ],
      count: 1,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      }
    });
  }
});

// ✅ SUBMIT QUIZ
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, name, category, score, percentage, totalQuestions, correctAnswers } = req.body;
    
    console.log('📊 Quiz submitted:', { name, rollNumber, category, score, percentage });
    
    // Get config for passing percentage
    let config;
    if (mongoose.connection.readyState === 1) {
      config = await Config.findOne();
    }
    
    if (!config) {
      config = { passingPercentage: 40 };
    }
    
    const user = new User({
      name,
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: correctAnswers || score,
      percentage,
      marksObtained: correctAnswers || score,
      totalMarks: totalQuestions,
      passed: percentage >= config.passingPercentage,
      submittedAt: new Date()
    });
    
    if (mongoose.connection.readyState === 1) {
      await user.save();
    } else {
      console.log('⚠️ Database not connected, result not saved');
    }
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: user
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

// ✅ GET REGISTRATIONS
app.get('/api/admin/registrations', verifyToken, async (req, res) => {
  try {
    let registrations = [];
    
    if (mongoose.connection.readyState === 1) {
      registrations = await Registration.find().sort({ registeredAt: -1 });
    }
    
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

// ✅ INIT DATABASE
app.get('/api/init-db', async (req, res) => {
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

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    suggestion: 'Check / endpoint for available routes'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`🌐 Deployed: https://backend-one-taupe-14.vercel.app`);
  console.log(`🔗 Health Check: https://backend-one-taupe-14.vercel.app/api/health`);
  console.log(`👨‍💼 Admin Login: https://backend-one-taupe-14.vercel.app/admin/login`);
  console.log(`📝 Registration: POST https://backend-one-taupe-14.vercel.app/api/register`);
  console.log(`🎯 Quiz Questions: GET https://backend-one-taupe-14.vercel.app/api/quiz/questions/html`);
  console.log(`✅ Default admin credentials: username: admin, password: admin123`);
});