const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware - Allow all origins for Vercel deployment
app.use(cors({
  origin: ['https://quiz2-iota-one.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection with improved error handling
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 Connecting to MongoDB...');

// Enhanced MongoDB connection with retry logic
const connectWithRetry = () => {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database: quiz_system');
    initializeDatabase();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Failed:', err.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

// Database schemas
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

// Create models
const User = mongoose.model('User', userSchema);
const Registration = mongoose.model('Registration', registrationSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// JWT Secret
const JWT_SECRET = 'shamsi_institute_secret_key_2024';

// Initialize Database
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Check if admin exists, create default if not
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

    // Check if config exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }

    // Add sample questions if none exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('📝 Creating sample questions...');
      
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
          category: 'html',
          questionText: 'Which HTML tag is used for the largest heading?',
          options: [
            { text: '<h6>', isCorrect: false },
            { text: '<h1>', isCorrect: true },
            { text: '<head>', isCorrect: false },
            { text: '<header>', isCorrect: false }
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
          category: 'css',
          questionText: 'Which property is used to change the background color?',
          options: [
            { text: 'color', isCorrect: false },
            { text: 'bgcolor', isCorrect: false },
            { text: 'background-color', isCorrect: true },
            { text: 'bg-color', isCorrect: false }
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
        },
        {
          category: 'javascript',
          questionText: 'How do you write "Hello World" in an alert box?',
          options: [
            { text: 'alertBox("Hello World")', isCorrect: false },
            { text: 'msg("Hello World")', isCorrect: false },
            { text: 'alert("Hello World")', isCorrect: true },
            { text: 'msgBox("Hello World")', isCorrect: false }
          ],
          difficulty: 'easy'
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log(`✅ Created ${sampleQuestions.length} sample questions`);
    }

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Middleware to verify JWT token
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
      message: 'Invalid token'
    });
  }
};

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Shamsi Institute Quiz System API',
    version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString(),
    deployed: {
      frontend: 'https://quiz2-iota-one.vercel.app',
      backend: 'https://backend-one-taupe-14.vercel.app'
    },
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/register',
      adminLogin: 'POST /admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories'
    },
    testCredentials: {
      username: 'admin',
      password: 'admin123'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt:', username);
    
    // Always accept default admin credentials
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
    
    // Check database for other admin users
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
    
    // If database not connected
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Use default: admin/admin123'
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

// Register student
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
    if (mongoose.connection.readyState === 1) {
      const questionCount = await Question.countDocuments({ category: category.toLowerCase() });
      if (questionCount === 0) {
        return res.status(400).json({
          success: false,
          message: `No questions available for "${category}" category.`,
          availableCategories: ['html', 'css', 'javascript', 'react', 'node']
        });
      }
    }
    
    // Save registration
    const registration = new Registration({
      name,
      rollNumber: `SI-${rollNumber}`,
      category: category.toLowerCase()
    });
    
    if (mongoose.connection.readyState === 1) {
      await registration.save();
    }
    
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

// Get quiz questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('📚 Fetching questions for category:', category);
    
    let questions = [];
    let config = { quizTime: 30, passingPercentage: 40, totalQuestions: 50 };
    
    if (mongoose.connection.readyState === 1) {
      questions = await Question.find({ category: category.toLowerCase() });
      
      const dbConfig = await Config.findOne();
      if (dbConfig) {
        config = dbConfig;
      }
    }
    
    // If no questions in database, provide sample questions
    if (questions.length === 0) {
      questions = [
        {
          questionText: `Sample question for ${category}: What is ${category.toUpperCase()}?`,
          options: [
            { text: 'Option A (Correct)', isCorrect: true },
            { text: 'Option B', isCorrect: false },
            { text: 'Option C', isCorrect: false },
            { text: 'Option D', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy'
        }
      ];
    }
    
    // Shuffle questions and limit based on config
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    const limitedQuestions = shuffledQuestions.slice(0, Math.min(config.totalQuestions, shuffledQuestions.length));
    
    res.json({
      success: true,
      questions: limitedQuestions,
      count: limitedQuestions.length,
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

// Submit quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, name, category, score, percentage, totalQuestions, correctAnswers } = req.body;
    
    console.log('📊 Quiz submitted:', { name, rollNumber, category, score, percentage });
    
    // Get config for passing percentage
    let config = { passingPercentage: 40 };
    if (mongoose.connection.readyState === 1) {
      const dbConfig = await Config.findOne();
      if (dbConfig) {
        config = dbConfig;
      }
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

// Get categories
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
    
    // If no categories in DB, return default ones
    if (categories.length === 0) {
      categories = [
        { value: 'html', label: 'HTML', questionCount: 2 },
        { value: 'css', label: 'CSS', questionCount: 2 },
        { value: 'javascript', label: 'JavaScript', questionCount: 2 },
        { value: 'react', label: 'React', questionCount: 0 },
        { value: 'node', label: 'Node.js', questionCount: 0 }
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

// Get config
app.get('/api/config', async (req, res) => {
  try {
    let config = {
      quizTime: 30,
      passingPercentage: 40,
      totalQuestions: 50
    };
    
    if (mongoose.connection.readyState === 1) {
      const dbConfig = await Config.findOne();
      if (dbConfig) {
        config = dbConfig;
      }
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

// Update config (admin only)
app.put('/api/config', verifyToken, async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
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

// === ADMIN ROUTES ===

// Dashboard stats
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    let stats = {
      totalStudents: 0,
      totalQuestions: 0,
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      todayAttempts: 0
    };
    
    if (mongoose.connection.readyState === 1) {
      stats.totalStudents = await User.countDocuments();
      stats.totalQuestions = await Question.countDocuments();
      stats.totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
      
      const results = await User.find({ submittedAt: { $ne: null } });
      if (results.length > 0) {
        const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
        stats.averageScore = totalPercentage / results.length;
        
        const passedCount = results.filter(r => r.passed).length;
        stats.passRate = (passedCount / results.length) * 100;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      stats.todayAttempts = await User.countDocuments({ 
        submittedAt: { $gte: today } 
      });
    }
    
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40 };
    
    res.json({
      success: true,
      stats: {
        ...stats,
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

// Get all questions (admin)
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

// Add question (admin)
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
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

// Delete question (admin)
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

// Get results (admin)
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

// Delete result (admin)
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

// Delete all results (admin)
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

// Get registrations (admin)
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

// Initialize database (for testing)
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
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Backend URL: https://backend-one-taupe-14.vercel.app`);
  console.log(`🎯 Frontend URL: https://quiz2-iota-one.vercel.app`);
  console.log(`🔗 Health Check: https://backend-one-taupe-14.vercel.app/api/health`);
  console.log(`👨‍💼 Admin Login: https://quiz2-iota-one.vercel.app/admin/login`);
  console.log(`🔑 Test Credentials: admin / admin123`);
});