const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enhanced CORS Configuration for Vercel
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://quiz2-iota-one.vercel.app',
    'https://quiz2-4cwxe0m3j-khalids-projects-3de9ee65.vercel.app',
    'https://quiz2-git-main-khalids-projects-3de9ee65.vercel.app',
    'https://quiz2-*.vercel.app',
    'https://vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with Vercel environment support
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔗 MongoDB Connecting...');
console.log('MongoDB URI:', MONGODB_URI ? 'Present' : 'Missing');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000
})
.then(() => {
  console.log('✅ MongoDB Atlas Connected Successfully!');
  initializeDefaultData();
})
.catch(err => {
  console.error('❌ MongoDB Atlas Connection Error:', err.message);
  console.error('Full Error:', err);
});

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
    await User.createIndexes();
    
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = new Admin();
      await admin.save();
      console.log('✅ Default admin created');
    }

    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
      console.log('✅ Default config created');
    }

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
          category: 'html',
          questionText: 'Which HTML tag is used for the largest heading?',
          options: [
            { text: '<h1>', isCorrect: true },
            { text: '<head>', isCorrect: false },
            { text: '<heading>', isCorrect: false },
            { text: '<h6>', isCorrect: false }
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
        },
        {
          category: 'css',
          questionText: 'Which property is used to change the background color?',
          options: [
            { text: 'background-color', isCorrect: true },
            { text: 'color', isCorrect: false },
            { text: 'bgcolor', isCorrect: false },
            { text: 'background', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        },
        {
          category: 'javascript',
          questionText: 'What is JavaScript?',
          options: [
            { text: 'A programming language', isCorrect: true },
            { text: 'A markup language', isCorrect: false },
            { text: 'A database', isCorrect: false },
            { text: 'A framework', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        },
        {
          category: 'javascript',
          questionText: 'Which operator is used to assign a value to a variable?',
          options: [
            { text: '=', isCorrect: true },
            { text: '==', isCorrect: false },
            { text: '===', isCorrect: false },
            { text: '->', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        },
        {
          category: 'react',
          questionText: 'What is React?',
          options: [
            { text: 'A JavaScript library for building user interfaces', isCorrect: true },
            { text: 'A programming language', isCorrect: false },
            { text: 'A database', isCorrect: false },
            { text: 'An operating system', isCorrect: false }
          ],
          marks: 10,
          difficulty: 'easy'
        },
        {
          category: 'mern',
          questionText: 'What does MERN stand for?',
          options: [
            { text: 'MongoDB, Express, React, Node.js', isCorrect: true },
            { text: 'MySQL, Express, React, Node.js', isCorrect: false },
            { text: 'MongoDB, Express, Redux, Node.js', isCorrect: false },
            { text: 'MongoDB, Elasticsearch, React, Node.js', isCorrect: false }
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
    console.error('❌ Error initializing data:', error);
  }
};

// ==================== API ROUTES ====================

// API Home
app.get('/api', (req, res) => {
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
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
        register: '/api/auth/register',
        questions: '/api/quiz/questions/:category',
        submit: '/api/quiz/submit',
        result: '/api/result/:rollNumber'
      },
      config: '/api/config'
    },
    database: {
      status: statusMessages[dbStatus] || 'Unknown',
      connected: dbStatus === 1
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health Check
app.get('/api/health', (req, res) => {
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
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Get Available Categories
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
    
    res.json({
      success: true,
      categories: categoryInfo,
      totalAvailable: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch categories',
      error: error.message 
    });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Admin login attempt:', { username, password });
    
    const admin = await Admin.findOne({ username });
    
    if (admin && password === admin.password) {
      res.json({
        success: true,
        message: 'Login successful',
        user: { 
          username: admin.username, 
          role: 'admin',
          email: admin.email 
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch config',
      error: error.message 
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

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, and category'
      });
    }
    
    const existingUser = await User.findOne({ rollNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already registered'
      });
    }
    
    const questionCount = await Question.countDocuments({ category: category.toLowerCase() });
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions available for this category'
      });
    }
    
    const user = new User({
      name,
      rollNumber,
      category: category.toLowerCase()
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        createdAt: user.createdAt
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

// Get Quiz Questions by Category
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const config = await Config.findOne();
    const totalQuestions = config ? config.totalQuestions : 5;
    
    const allQuestions = await Question.find({ category: category.toLowerCase() });
    
    if (allQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for category: ${category}`
      });
    }
    
    const shuffledQuestions = [...allQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(totalQuestions, allQuestions.length));
    
    const questionsForQuiz = shuffledQuestions.map(question => ({
      _id: question._id,
      category: question.category,
      questionText: question.questionText,
      options: question.options.map(opt => ({
        text: opt.text,
      })),
      marks: question.marks,
      difficulty: question.difficulty
    }));
    
    res.json({
      success: true,
      questions: questionsForQuiz,
      category: category,
      totalQuestions: questionsForQuiz.length,
      totalAvailable: allQuestions.length,
      totalMarks: questionsForQuiz.reduce((sum, q) => sum + (q.marks || 1), 0)
    });
    
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch quiz questions',
      error: error.message 
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, answers, timeLeft } = req.body;
    
    if (!rollNumber || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roll number and answers array'
      });
    }
    
    const user = await User.findOne({ rollNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }
    
    if (user.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Quiz already submitted'
      });
    }
    
    let score = 0;
    let totalMarks = 0;
    
    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (question) {
        totalMarks += question.marks || 1;
        
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && correctOption.text === answer.selectedOption) {
          score += question.marks || 1;
        }
      }
    }
    
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    
    const config = await Config.findOne();
    const passingPercentage = config ? config.passingPercentage : 40;
    const passed = percentage >= passingPercentage;
    
    user.score = score;
    user.marksObtained = score;
    user.totalMarks = totalMarks;
    user.percentage = parseFloat(percentage.toFixed(2));
    user.passed = passed;
    user.submittedAt = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: score,
        totalMarks: totalMarks,
        percentage: user.percentage,
        passed: passed,
        timeLeft: timeLeft,
        submittedAt: user.submittedAt,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz',
      error: error.message 
    });
  }
});

// Get User Result
app.get('/api/result/:rollNumber', async (req, res) => {
  try {
    const user = await User.findOne({ rollNumber: req.params.rollNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Result not found for this roll number'
      });
    }
    
    if (!user.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Quiz not submitted yet'
      });
    }
    
    res.json({
      success: true,
      result: {
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: user.score,
        totalMarks: user.totalMarks,
        percentage: user.percentage,
        passed: user.passed,
        submittedAt: user.submittedAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch result',
      error: error.message 
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get Dashboard Stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const users = await User.find();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttempts = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    const totalPercentage = users.reduce((sum, user) => sum + (user.percentage || 0), 0);
    const averageScore = totalStudents > 0 ? (totalPercentage / totalStudents).toFixed(2) : 0;
    
    const passedStudents = users.filter(user => user.passed).length;
    const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(2) : 0;
    
    const categories = await Question.distinct('category');
    const categoryStats = [];
    
    for (const category of categories) {
      const questionsInCategory = await Question.countDocuments({ category });
      const attemptsInCategory = await User.countDocuments({ category });
      categoryStats.push({
        category,
        questions: questionsInCategory,
        attempts: attemptsInCategory
      });
    }
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts: totalStudents,
        averageScore: parseFloat(averageScore),
        passRate: parseFloat(passRate),
        todayAttempts,
        passedStudents,
        failedStudents: totalStudents - passedStudents
      },
      categoryStats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard stats',
      error: error.message 
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

// Get All Results (Admin)
app.get('/api/admin/results', async (req, res) => {
  try {
    const users = await User.find().sort({ submittedAt: -1, createdAt: -1 });
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

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
    suggestion: 'Try /api/health for server status'
  });
});

// Root handler
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Shamsi Institute Quiz System',
    api: 'Use /api for API endpoints',
    health: 'Check /api/health for server status',
    frontend: 'https://quiz2-iota-one.vercel.app',
    version: '1.0.0'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📡 API Base URL: http://localhost:${PORT}/api
  🌐 Production URL: https://backend-one-taupe-14.vercel.app
  🔗 Health Check: /api/health
  👨‍💼 Admin Login: admin / admin123
  📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
  ⏰ Started at: ${new Date().toLocaleString()}
  `);
});