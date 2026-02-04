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

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database: quiz_system');
  initializeDatabase();
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
  console.log('⚠️ Running in simulated mode');
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

const User = mongoose.model('User', userSchema);
const Registration = mongoose.model('Registration', registrationSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// Initialize Database function
async function initializeDatabase() {
  try {
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

    // Add sample questions for testing if no questions exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('📝 Creating sample questions for testing...');
      
      const sampleQuestions = [
        {
          category: 'react',
          questionText: 'What is React?',
          options: [
            { text: 'A JavaScript library for building user interfaces', isCorrect: true },
            { text: 'A database management system', isCorrect: false },
            { text: 'A programming language', isCorrect: false },
            { text: 'An operating system', isCorrect: false }
          ],
          difficulty: 'easy'
        },
        {
          category: 'react',
          questionText: 'What is JSX?',
          options: [
            { text: 'JavaScript XML', isCorrect: true },
            { text: 'Java Syntax Extension', isCorrect: false },
            { text: 'JavaScript Extension', isCorrect: false },
            { text: 'Java XML', isCorrect: false }
          ],
          difficulty: 'easy'
        },
        {
          category: 'javascript',
          questionText: 'What is closure in JavaScript?',
          options: [
            { text: 'A function with access to its outer function scope', isCorrect: true },
            { text: 'A way to close browser tabs', isCorrect: false },
            { text: 'A type of loop', isCorrect: false },
            { text: 'A database connection', isCorrect: false }
          ],
          difficulty: 'medium'
        },
        {
          category: 'node',
          questionText: 'What is Node.js?',
          options: [
            { text: 'JavaScript runtime built on Chrome V8 engine', isCorrect: true },
            { text: 'A frontend framework', isCorrect: false },
            { text: 'A database', isCorrect: false },
            { text: 'A CSS preprocessor', isCorrect: false }
          ],
          difficulty: 'easy'
        }
      ];
      
      await Question.insertMany(sampleQuestions);
      console.log('✅ Created sample questions for react, javascript, and node categories');
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
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/register',
      adminLogin: 'POST /api/admin/login',
      quizQuestions: 'GET /api/quiz/questions/:category',
      submitQuiz: 'POST /api/quiz/submit',
      config: 'GET /api/config'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running 🟢',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    timestamp: new Date().toISOString()
  });
});

// ✅ REGISTER USER - NEW ENDPOINT
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    console.log('Registration attempt:', { name, rollNumber, category });
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    // Check if roll number already registered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingRegistration = await Registration.findOne({
      rollNumber,
      registeredAt: { $gte: today }
    });
    
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'This roll number is already registered today'
      });
    }
    
    // Save registration
    const registration = new Registration({
      name,
      rollNumber,
      category
    });
    
    await registration.save();
    
    res.json({
      success: true,
      message: 'Registration successful',
      data: {
        name,
        rollNumber,
        category,
        registeredAt: registration.registeredAt
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

// ✅ ADMIN LOGIN
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username });
    
    // Check in database
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      // Development fallback for testing
      if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
          { 
            id: 'dev_admin_id', 
            username: 'admin', 
            role: 'superadmin'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          message: 'Login successful (Development Mode)',
          token,
          user: {
            username: 'admin',
            role: 'superadmin'
          }
        });
      }
      
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
    
    res.json({
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
      message: 'Server error',
      error: error.message
    });
  }
});

// ✅ GET DASHBOARD STATS
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
    const totalRegistrations = await Registration.countDocuments();
    
    const results = await User.find({ submittedAt: { $ne: null } });
    let averageScore = 0;
    let passRate = 0;
    
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
    
    const config = await Config.findOne() || { quizTime: 30, passingPercentage: 40, totalQuestions: 50 };
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        totalRegistrations,
        averageScore: averageScore.toFixed(2),
        passRate: passRate.toFixed(2),
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

// ✅ GET ALL QUESTIONS
app.get('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    const { category, page = 1, limit = 100 } = req.query;
    
    let query = {};
    if (category && category !== 'all') {
      query.category = category.toLowerCase();
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

// ✅ ADD QUESTION
app.post('/api/admin/questions', verifyToken, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    console.log('Adding question:', { category, questionText });
    
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

// ✅ DELETE QUESTION
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

// ✅ GET RESULTS
app.get('/api/admin/results', verifyToken, async (req, res) => {
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

// ✅ DELETE RESULT
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

// ✅ DELETE ALL RESULTS
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

// ✅ UPDATE CONFIG
app.put('/api/config', verifyToken, async (req, res) => {
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

// ✅ GET CATEGORIES
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Question.distinct('category');
    
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Question.countDocuments({ category });
        return {
          value: category,
          label: category.charAt(0).toUpperCase() + category.slice(1),
          questionCount: count,
          type: category === 'react' || category === 'javascript' || category === 'html' || category === 'css' ? 'frontend' : 
                category === 'node' || category === 'express' || category === 'python' ? 'backend' : 
                category === 'mongodb' || category === 'mysql' ? 'database' : 'general'
        };
      })
    );
    
    // Add categories that might not have questions yet
    const allCategories = [
      ...categoriesWithCount,
      { value: 'html', label: 'HTML', questionCount: 0, type: 'frontend' },
      { value: 'css', label: 'CSS', questionCount: 0, type: 'frontend' },
      { value: 'javascript', label: 'JavaScript', questionCount: 0, type: 'frontend' },
      { value: 'react', label: 'React.js', questionCount: 0, type: 'frontend' },
      { value: 'node', label: 'Node.js', questionCount: 0, type: 'backend' },
      { value: 'express', label: 'Express.js', questionCount: 0, type: 'backend' },
      { value: 'mongodb', label: 'MongoDB', questionCount: 0, type: 'database' },
      { value: 'mysql', label: 'MySQL', questionCount: 0, type: 'database' },
      { value: 'docker', label: 'Docker', questionCount: 0, type: 'devops' },
      { value: 'git', label: 'Git', questionCount: 0, type: 'devops' }
    ];
    
    // Remove duplicates
    const uniqueCategories = allCategories.filter((cat, index, self) =>
      index === self.findIndex((c) => c.value === cat.value)
    );
    
    res.json({
      success: true,
      categories: uniqueCategories
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
    
    console.log('Fetching questions for category:', category);
    
    const questions = await Question.find({ category: category.toLowerCase() });
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions available for this category. Please ask administrator to add questions first.',
        questions: [],
        count: 0
      });
    }
    
    // Shuffle questions
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    
    // Get config for number of questions
    const config = await Config.findOne() || { totalQuestions: 50 };
    const selectedQuestions = shuffledQuestions.slice(0, Math.min(config.totalQuestions, shuffledQuestions.length));
    
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
      success: false,
      message: 'Error fetching quiz questions',
      error: error.message
    });
  }
});

// ✅ SUBMIT QUIZ
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, name, category, score, percentage, totalQuestions, correctAnswers } = req.body;
    
    console.log('Submitting quiz:', { name, rollNumber, category, score, percentage });
    
    // Get config for passing percentage
    const config = await Config.findOne() || { passingPercentage: 40 };
    
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
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// ✅ GET REGISTRATIONS (for admin)
app.get('/api/admin/registrations', verifyToken, async (req, res) => {
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

// ✅ INIT DATABASE (for testing)
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
    availableEndpoints: {
      GET: [
        '/',
        '/api/health',
        '/api/config',
        '/api/categories',
        '/api/quiz/questions/:category'
      ],
      POST: [
        '/api/register',
        '/api/admin/login',
        '/api/quiz/submit'
      ]
    }
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
  console.log(`📡 Home: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin/login`);
  console.log(`📝 Registration: POST http://localhost:${PORT}/api/register`);
});