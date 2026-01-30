// server.js (اپڈیٹڈ ورژن)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Add this line

const app = express();

// CORS Configuration - Add all your Vercel domains
app.use(cors({
  origin: [
    'https://quiz2-iota-one.vercel.app',
    'https://quiz2-fyvu2hgzw-khalids-projects-3de9ee65.vercel.app',
    'https://quiz2-git-main-khalids-projects-3de9ee65.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection - Vercel compatible
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

// Improved MongoDB connection with better options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

console.log('🔗 Attempting MongoDB connection...');
console.log('MongoDB URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password

mongoose.connect(MONGODB_URI, mongooseOptions)
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database Name:', mongoose.connection.db?.databaseName || 'Unknown');
  console.log('🔌 Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
  
  initializeDefaultData();
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('💡 Tips: Check if MongoDB Atlas has IP whitelist enabled (0.0.0.0/0)');
});

// Database connection status check
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Schemas (same as before)
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
  submittedAt: { type: Date }
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
  totalQuestions: { type: Number, default: 100 },
  updatedAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  email: String
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// Initialize default data
const initializeDefaultData = async () => {
  try {
    console.log('📊 Initializing database with default data...');
    
    // Check and create default admin if not exists
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      console.log('Creating default admin...');
      admin = new Admin({
        username: 'admin',
        password: 'admin123',
        email: 'admin@shamsi.edu.pk'
      });
      await admin.save();
      console.log('✅ Default admin created');
    } else {
      console.log('✅ Admin already exists');
      // Ensure password is correct
      if (admin.password !== 'admin123') {
        admin.password = 'admin123';
        await admin.save();
        console.log('✅ Admin password updated to admin123');
      }
    }

    // Default config
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
      console.log('✅ Default config created');
    } else {
      console.log('✅ Config already exists');
    }

    console.log('📊 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing data:', error.message);
  }
};

// ==================== API ROUTES ====================

// Health Check - IMPROVED
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  let dbMessage = 'Unknown';
  
  switch(dbStatus) {
    case 0: dbMessage = 'Disconnected ❌'; break;
    case 1: dbMessage = 'Connected ✅'; break;
    case 2: dbMessage = 'Connecting 🔄'; break;
    case 3: dbMessage = 'Disconnecting 📤'; break;
  }
  
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API - LIVE ✅',
    timestamp: new Date().toISOString(),
    database: dbMessage,
    mongodbState: dbStatus,
    server: 'Vercel Production',
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// Test Connection Endpoint
app.get('/api/test', async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    const questionCount = await Question.countDocuments();
    const userCount = await User.countDocuments();
    const configCount = await Config.countDocuments();
    
    res.json({
      success: true,
      message: 'Test successful',
      counts: {
        admins: adminCount,
        questions: questionCount,
        users: userCount,
        configs: configCount
      },
      database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message,
      database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'
    });
  }
});

// Admin Login - SIMPLIFIED AND FIXED
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Find admin (case-insensitive search)
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp('^' + username + '$', 'i') } 
    });
    
    if (!admin) {
      console.log('❌ Admin not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Simple password check
    if (admin.password === password) {
      console.log('✅ Login successful for:', username);
      
      return res.json({
        success: true,
        message: 'Login successful',
        user: { 
          username: admin.username, 
          role: 'admin',
          email: admin.email 
        }
      });
    } else {
      console.log('❌ Password mismatch for:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('❌ Admin login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.'
    });
  }
});

// Reset/Create Admin (For emergency use)
app.post('/api/admin/setup', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Check if admin exists
    let admin = await Admin.findOne({ username });
    
    if (admin) {
      // Update existing admin
      admin.password = password;
      admin.email = email || 'admin@shamsi.edu.pk';
      await admin.save();
      
      return res.json({
        success: true,
        message: 'Admin credentials updated successfully',
        action: 'updated',
        admin: {
          username: admin.username,
          email: admin.email
        }
      });
    } else {
      // Create new admin
      admin = new Admin({
        username,
        password,
        email: email || 'admin@shamsi.edu.pk'
      });
      await admin.save();
      
      return res.json({
        success: true,
        message: 'Admin created successfully',
        action: 'created',
        admin: {
          username: admin.username,
          email: admin.email
        }
      });
    }
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Setup failed',
      error: error.message
    });
  }
});

// Get all questions
app.get('/api/admin/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      questions: questions.map(q => ({
        _id: q._id,
        category: q.category,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks || 1,
        difficulty: q.difficulty || 'medium',
        createdAt: q.createdAt
      })),
      count: questions.length
    });
  } catch (error) {
    console.error('Get questions error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions'
    });
  }
});

// Add question
app.post('/api/admin/questions', async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, question text, and at least 2 options'
      });
    }
    
    const validOptions = options.filter(opt => opt.text && opt.text.trim() !== '');
    if (validOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 valid options are required'
      });
    }
    
    const hasCorrectOption = validOptions.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      return res.status(400).json({
        success: false,
        message: 'At least one option must be marked as correct'
      });
    }
    
    const question = new Question({
      category: category.toLowerCase(),
      questionText,
      options: validOptions,
      marks: marks || 1,
      difficulty: difficulty || 'medium'
    });
    
    await question.save();
    
    return res.status(201).json({
      success: true,
      message: '✅ Question added successfully!',
      question: {
        _id: question._id,
        category: question.category,
        questionText: question.questionText,
        options: question.options,
        marks: question.marks,
        difficulty: question.difficulty
      }
    });
  } catch (error) {
    console.error('Add question error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to add question'
    });
  }
});

// Get all results
app.get('/api/admin/results', async (req, res) => {
  try {
    const users = await User.find().sort({ submittedAt: -1 });
    return res.json({
      success: true,
      results: users.map(user => ({
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: user.score,
        percentage: user.percentage,
        marksObtained: user.marksObtained || 0,
        totalMarks: user.totalMarks || 100,
        passed: user.passed,
        createdAt: user.createdAt,
        submittedAt: user.submittedAt
      })),
      count: users.length
    });
  } catch (error) {
    console.error('Get results error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results'
    });
  }
});

// Get dashboard stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const users = await User.find();
    
    const passedStudents = users.filter(user => user.passed).length;
    const totalPercentage = users.reduce((sum, user) => sum + (user.percentage || 0), 0);
    const averageScore = totalStudents > 0 ? (totalPercentage / totalStudents).toFixed(2) : 0;
    const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(2) : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttempts = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Recent activity
    const recentActivity = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name rollNumber category score percentage passed createdAt');
    
    return res.json({
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
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard stats'
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
    
    return res.json({
      success: true,
      config: {
        quizTime: config.quizTime,
        passingPercentage: config.passingPercentage,
        totalQuestions: config.totalQuestions,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Get config error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch config'
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
      if (quizTime !== undefined) config.quizTime = quizTime;
      if (passingPercentage !== undefined) config.passingPercentage = passingPercentage;
      if (totalQuestions !== undefined) config.totalQuestions = totalQuestions;
      config.updatedAt = new Date();
    }
    
    await config.save();
    
    return res.json({
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
    console.error('Update config error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update config'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = ['html', 'css', 'javascript', 'react', 'nextjs', 'vue', 'angular', 'node', 'express', 'python', 'django', 'flask', 'java', 'spring', 'php', 'laravel', 'mern', 'mongodb', 'mysql', 'postgresql', 'git', 'docker', 'aws', 'typescript', 'graphql'];
    const categoryInfo = [];
    
    for (const category of categories) {
      const questions = await Question.find({ category });
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      categoryInfo.push({
        value: category,
        label: category.toUpperCase(),
        questionCount: questions.length,
        totalMarks: totalMarks,
        isReady: totalMarks >= 100,
        percentage: (totalMarks / 100) * 100,
        remaining: 100 - totalMarks
      });
    }
    
    return res.json({
      success: true,
      categories: categoryInfo
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch categories'
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
    
    const user = new User({
      name,
      rollNumber,
      category: category.toLowerCase(),
      createdAt: new Date()
    });
    
    await user.save();
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
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
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already exists'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Registration failed'
    });
  }
});

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const config = await Config.findOne();
    const totalQuestions = config ? config.totalQuestions : 10;
    
    const allQuestions = await Question.find({ category: category.toLowerCase() });
    
    if (allQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for ${category} category`
      });
    }
    
    const shuffledQuestions = [...allQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(totalQuestions, allQuestions.length));
    
    const questionsForQuiz = shuffledQuestions.map(question => ({
      _id: question._id,
      questionText: question.questionText,
      options: question.options.map(opt => ({
        text: opt.text,
      })),
      marks: question.marks || 1
    }));
    
    return res.json({
      success: true,
      questions: questionsForQuiz,
      category: category,
      totalQuestions: questionsForQuiz.length,
      totalMarks: questionsForQuiz.reduce((sum, q) => sum + (q.marks || 1), 0)
    });
  } catch (error) {
    console.error('Get quiz questions error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch quiz questions'
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, answers } = req.body;
    
    if (!rollNumber || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and answers are required'
      });
    }
    
    const user = await User.findOne({ rollNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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
    
    return res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category,
        score: score,
        totalMarks: totalMarks,
        percentage: user.percentage,
        passed: passed,
        submittedAt: user.submittedAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz'
    });
  }
});

// Quick Admin Setup Route (For Vercel deployment)
app.get('/api/setup-admin', async (req, res) => {
  try {
    const admin = await Admin.findOne({ username: 'admin' });
    
    if (admin) {
      return res.json({
        success: true,
        message: 'Admin already exists',
        admin: {
          username: admin.username,
          password: admin.password,
          email: admin.email
        }
      });
    } else {
      // Create admin
      const newAdmin = new Admin({
        username: 'admin',
        password: 'admin123',
        email: 'admin@shamsi.edu.pk'
      });
      await newAdmin.save();
      
      return res.json({
        success: true,
        message: 'Admin created successfully',
        admin: {
          username: newAdmin.username,
          password: newAdmin.password,
          email: newAdmin.email
        }
      });
    }
  } catch (error) {
    console.error('Setup admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Setup failed',
      error: error.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    server: 'Vercel Production',
    status: 'Live',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      setup: '/api/setup-admin',
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
        submit: '/api/quiz/submit'
      },
      config: '/api/config'
    }
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found. Check / for available endpoints.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📡 API Base URL: https://backend-one-taupe-14.vercel.app
  🔗 Health Check: /api/health
  👨‍💼 Admin Login: admin / admin123
  🔧 Setup Admin: /api/setup-admin
  📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
  ⚙️ Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

module.exports = app;