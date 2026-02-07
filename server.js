// server.js - Complete Backend for Shamsi Institute Quiz System
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_key_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';
const PORT = process.env.PORT || 5000;

console.log('🚀 Shamsi Institute Quiz System Backend Starting...');
console.log('📊 MongoDB URI:', MONGODB_URI ? 'Configured' : 'Not configured');

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== DATABASE MODELS ====================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  passingPercentage: { type: Number, default: 40 },
  cheatingDetected: { type: Boolean, default: false },
  isAutoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Question Schema
const questionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  marks: { type: Number, default: 1, min: 1, max: 10 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, default: 'admin' },
  password: { type: String, required: true, default: 'admin123' },
  email: { type: String, default: 'admin@shamsi.edu.pk' },
  role: { type: String, enum: ['admin', 'super-admin'], default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Config Schema
const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30, min: 1, max: 180 },
  passingPercentage: { type: Number, default: 40, min: 0, max: 100 },
  totalQuestions: { type: Number, default: 50, min: 1, max: 200 },
  updatedAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);

// ==================== DATABASE CONNECTION ====================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('📊 Using existing MongoDB connection');
    return true;
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully');
    
    // Initialize default admin if not exists
    await initializeDefaultAdmin();
    // Initialize default config if not exists
    await initializeDefaultConfig();
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    isConnected = false;
    return false;
  }
};

// Initialize default admin
const initializeDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'admin'
      });
      console.log('✅ Default admin created: admin / admin123');
    }
  } catch (error) {
    console.log('⚠️ Admin initialization:', error.message);
  }
};

// Initialize default config
const initializeDefaultConfig = async () => {
  try {
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default configuration created');
    }
  } catch (error) {
    console.log('⚠️ Config initialization:', error.message);
  }
};

// ==================== MIDDLEWARE FUNCTIONS ====================

// Auth middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid or expired token' 
        });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// ==================== ROUTES ====================

// Root Route
app.get('/', async (req, res) => {
  const dbConnected = await connectDB();
  
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '1.0.0',
    database: dbConnected ? 'Connected ✅' : 'Disconnected ❌',
    endpoints: {
      health: 'GET /api/health',
      admin: 'POST /admin/login',
      register: 'POST /api/register',
      questions: 'GET /api/quiz/questions/:category',
      submit: 'POST /api/quiz/submit',
      config: 'GET /api/config',
      categories: 'GET /api/categories'
    }
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
  const dbConnected = await connectDB();
  
  res.json({
    success: true,
    status: 'healthy',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== ADMIN ROUTES ====================

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    await connectDB();
    
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt:', { username });
    
    // Find admin
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      // Fallback: Hardcoded admin for emergency
      if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
          { username: 'admin', role: 'admin' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.json({
          success: true,
          message: 'Login successful (using fallback)',
          token,
          user: { username: 'admin', role: 'admin' }
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Create token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Reset Admin (for emergencies)
app.post('/admin/reset', async (req, res) => {
  try {
    await connectDB();
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Find and update or create admin
    const admin = await Admin.findOneAndUpdate(
      { username: 'admin' },
      {
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'admin',
        lastLogin: null
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      message: '✅ Admin reset successfully! Default credentials: admin / admin123'
    });
    
  } catch (error) {
    console.error('❌ Admin reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset admin'
    });
  }
});

// Get Dashboard Stats (Admin)
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
    const totalStudents = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalAttempts = totalStudents;
    
    // Calculate average score
    const results = await User.find({ score: { $gt: 0 } });
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
      : 0;
    
    // Calculate pass rate
    const passedCount = results.filter(r => r.passed).length;
    const passRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;
    
    // Today's attempts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttempts = await User.countDocuments({
      submittedAt: { $gte: today }
    });
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalAttempts,
        averageScore: parseFloat(averageScore.toFixed(2)),
        passRate: parseFloat(passRate.toFixed(2)),
        todayAttempts
      }
    });
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
});

// Get All Questions (Admin)
app.get('/api/admin/questions', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
    const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
    
    let query = {};
    
    if (category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { 'options.text': { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const skip = (pageNum - 1) * limitNum;
    
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Question.countDocuments(query);
    
    res.json({
      success: true,
      questions,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
    
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// Add Question (Admin)
app.post('/api/admin/questions', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
    const { category, questionText, options, marks, difficulty } = req.body;
    
    console.log('📝 Adding question:', { 
      category, 
      questionLength: questionText?.length,
      optionsCount: options?.length 
    });
    
    // Validation
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options are required'
      });
    }
    
    // Check for correct option
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option must be specified'
      });
    }
    
    // Ensure isCorrect is boolean
    const formattedOptions = options.map(opt => ({
      text: opt.text,
      isCorrect: Boolean(opt.isCorrect)
    }));
    
    // Create question
    const question = await Question.create({
      category: category.toLowerCase(),
      questionText: questionText.trim(),
      options: formattedOptions,
      marks: marks || 1,
      difficulty: difficulty || 'medium'
    });
    
    console.log('✅ Question added:', question._id);
    
    res.json({
      success: true,
      message: '✅ Question added successfully!',
      question
    });
    
  } catch (error) {
    console.error('❌ Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add question',
      error: error.message
    });
  }
});

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
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
      message: '✅ Question deleted successfully!'
    });
    
  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

// Get Results (Admin)
app.get('/api/admin/results', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
    const results = await User.find()
      .sort({ submittedAt: -1 })
      .select('-__v');
    
    res.json({
      success: true,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('❌ Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
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
      message: '✅ Result deleted successfully!'
    });
    
  } catch (error) {
    console.error('❌ Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete result'
    });
  }
});

// Delete All Results (Admin)
app.delete('/api/admin/results', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
    const result = await User.deleteMany({});
    
    res.json({
      success: true,
      message: `✅ All results deleted successfully! (${result.deletedCount} removed)`
    });
    
  } catch (error) {
    console.error('❌ Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all results'
    });
  }
});

// ==================== PUBLIC ROUTES ====================

// Get Configuration
app.get('/api/config', async (req, res) => {
  try {
    await connectDB();
    
    let config = await Config.findOne();
    
    if (!config) {
      config = await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      
      return res.json({
        success: true,
        config,
        message: 'Using default configuration'
      });
    }
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    console.error('❌ Get config error:', error);
    
    // Return default config if DB fails
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      message: 'Using default configuration (database not available)'
    });
  }
});

// Update Configuration (Admin)
app.put('/api/config', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    // Validation
    if (quizTime < 1 || quizTime > 180) {
      return res.status(400).json({
        success: false,
        message: 'Quiz time must be between 1 and 180 minutes'
      });
    }
    
    if (passingPercentage < 0 || passingPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Passing percentage must be between 0 and 100'
      });
    }
    
    if (totalQuestions < 1 || totalQuestions > 200) {
      return res.status(400).json({
        success: false,
        message: 'Total questions must be between 1 and 200'
      });
    }
    
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
    
    res.json({
      success: true,
      message: '✅ Configuration updated successfully!',
      config
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
    await connectDB();
    
    const categories = await Question.distinct('category');
    
    const categoryData = categories.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      description: `${cat.toUpperCase()} Technology Questions`,
      available: true
    }));
    
    // Add default categories if none exist
    if (categoryData.length === 0) {
      const defaultCategories = [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true }
      ];
      
      return res.json({
        success: true,
        categories: defaultCategories,
        message: 'Using default categories'
      });
    }
    
    res.json({
      success: true,
      categories: categoryData
    });
    
  } catch (error) {
    console.error('❌ Get categories error:', error);
    
    // Return default categories on error
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true }
      ],
      message: 'Using default categories (database not available)'
    });
  }
});

// Student Registration
app.post('/api/register', async (req, res) => {
  try {
    await connectDB();
    
    const { name, rollNumber, category } = req.body;
    
    console.log('📝 Registration attempt:', { name, rollNumber, category });
    
    // Validation
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 3 characters'
      });
    }
    
    if (!/^\d+$/.test(rollNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Roll number must contain only numbers'
      });
    }
    
    // Format roll number
    const formattedRollNumber = `SI-${rollNumber}`;
    
    // Check if already registered
    const existingUser = await User.findOne({ rollNumber: formattedRollNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This roll number is already registered'
      });
    }
    
    // Create user
    const user = await User.create({
      name: name.trim(),
      rollNumber: formattedRollNumber,
      category: category.toLowerCase()
    });
    
    console.log('✅ User registered:', user._id);
    
    res.json({
      success: true,
      message: 'Registration successful! You can now start the quiz.',
      user: {
        name: user.name,
        rollNumber: user.rollNumber,
        category: user.category
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This roll number is already registered'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    await connectDB();
    
    const { category } = req.params;
    
    console.log('📚 Fetching questions for category:', category);
    
    // Get config
    const config = await Config.findOne();
    const questionLimit = config?.totalQuestions || 50;
    
    // Get questions for category
    const questions = await Question.find({ 
      category: category.toLowerCase() 
    }).limit(questionLimit);
    
    if (questions.length === 0) {
      return res.json({
        success: false,
        message: `No questions available for ${category}. Please ask admin to add questions.`,
        questions: []
      });
    }
    
    console.log(`✅ Found ${questions.length} questions for ${category}`);
    
    // Validate and format questions
    const validatedQuestions = questions.map(question => {
      // Ensure options have proper isCorrect boolean
      const validatedOptions = question.options.map(option => ({
        text: option.text,
        isCorrect: Boolean(option.isCorrect)
      }));
      
      return {
        ...question.toObject(),
        options: validatedOptions
      };
    });
    
    res.json({
      success: true,
      questions: validatedQuestions,
      config: {
        quizTime: config?.quizTime || 30,
        passingPercentage: config?.passingPercentage || 40,
        totalQuestions: questionLimit
      },
      message: `Found ${validatedQuestions.length} questions`
    });
    
  } catch (error) {
    console.error('❌ Get quiz questions error:', error);
    
    // Fallback: Return sample questions if DB fails
    const sampleQuestions = [
      {
        _id: 'sample1',
        questionText: 'What is HTML used for?',
        options: [
          { text: 'Web page structure', isCorrect: true },
          { text: 'Styling web pages', isCorrect: false },
          { text: 'Server-side programming', isCorrect: false },
          { text: 'Database management', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy',
        category: 'html'
      },
      {
        _id: 'sample2',
        questionText: 'Which tag is used for the largest heading in HTML?',
        options: [
          { text: '<h1>', isCorrect: true },
          { text: '<h6>', isCorrect: false },
          { text: '<head>', isCorrect: false },
          { text: '<header>', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'easy',
        category: 'html'
      }
    ];
    
    res.json({
      success: true,
      questions: sampleQuestions,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      message: 'Using sample questions (database not available)'
    });
  }
});

// Submit Quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    await connectDB();
    
    const {
      rollNumber,
      name,
      category,
      score,
      totalMarks,
      obtainedMarks,
      percentage,
      totalQuestions,
      correctAnswers,
      attempted,
      passingPercentage,
      passed,
      cheatingDetected,
      isAutoSubmitted
    } = req.body;
    
    console.log('📤 Quiz submission:', { 
      rollNumber, 
      name, 
      score: `${correctAnswers || score}/${totalQuestions}` 
    });
    
    // Validation
    if (!rollNumber || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }
    
    // Calculate percentage if not provided
    let finalPercentage = percentage;
    let finalScore = correctAnswers || score || 0;
    
    if (!finalPercentage && totalQuestions) {
      finalPercentage = (finalScore / totalQuestions) * 100;
    }
    
    if (!finalPercentage) {
      finalPercentage = 0;
    }
    
    // Determine pass status
    const passThreshold = passingPercentage || 40;
    const isPassed = passed !== undefined ? passed : finalPercentage >= passThreshold;
    
    // Save result
    const result = await User.create({
      name: name.trim(),
      rollNumber: rollNumber,
      category: category.toLowerCase(),
      score: finalScore,
      percentage: parseFloat(finalPercentage.toFixed(2)),
      totalQuestions: totalQuestions || 0,
      correctAnswers: correctAnswers || finalScore,
      attempted: attempted || 0,
      passingPercentage: passThreshold,
      passed: isPassed,
      cheatingDetected: cheatingDetected || false,
      isAutoSubmitted: isAutoSubmitted || false,
      submittedAt: new Date()
    });
    
    console.log('✅ Quiz result saved:', result._id);
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully!',
      result: {
        id: result._id,
        name: result.name,
        rollNumber: result.rollNumber,
        category: result.category,
        score: result.score,
        percentage: result.percentage,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        passed: result.passed,
        submittedAt: result.submittedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Submit quiz error:', error);
    
    // Still return success to frontend with local result
    res.json({
      success: true,
      message: 'Quiz submitted (local save)',
      result: req.body
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /admin/login',
      'POST /api/register',
      'GET /api/quiz/questions/:category',
      'POST /api/quiz/submit',
      'GET /api/config',
      'GET /api/categories'
    ]
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

// ==================== START SERVER ====================

// For Vercel deployment
module.exports = app;

// For local development
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
    
    // Test DB connection
    await connectDB();
  });
}