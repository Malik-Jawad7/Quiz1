const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_key_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/shamsi_quiz_system?retryWrites=true&w=majority';
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// ==================== DATABASE MODELS ====================

// Question Schema
const questionSchema = new mongoose.Schema({
  category: { 
    type: String, 
    required: true,
    enum: ['html', 'css', 'javascript', 'react', 'node', 'java', 'python', 'mongodb', 'mysql', 'aws', 'docker', 'git', 'mern', 'express', 'typescript', 'vue', 'angular', 'nextjs', 'django', 'flask', 'spring', 'laravel', 'php', 'postgresql']
  },
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

// Configuration Schema
const configSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30, min: 5, max: 180 },
  passingPercentage: { type: Number, default: 40, min: 0, max: 100 },
  totalQuestions: { type: Number, default: 50, min: 1, max: 200 },
  updatedAt: { type: Date, default: Date.now }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, default: 'admin' },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema);
const Config = mongoose.model('Config', configSchema);
const Admin = mongoose.model('Admin', adminSchema);

// ==================== DATABASE CONNECTION ====================
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Initialize default data
const initializeDefaultData = async () => {
  try {
    // Default admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('✅ Default admin created');
    }

    // Default config
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }
  } catch (error) {
    console.log('⚠️ Default data init:', error.message);
  }
};

initializeDefaultData();

// ==================== AUTH MIDDLEWARE ====================
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// ==================== ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== ADMIN ROUTES ====================

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Fallback for hardcoded admin
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ id: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { username: 'admin' }
      });
    }
    
    // Database admin check
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { username: admin.username }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset Admin
app.post('/admin/reset', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await Admin.findOneAndUpdate(
      { username: 'admin' },
      { password: hashedPassword },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      message: 'Admin reset to default credentials'
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Reset failed'
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const totalStudents = await Result.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalAttempts = totalStudents;
    
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
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
});

// Get All Questions
app.get('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
    
    let query = {};
    
    if (category !== 'all') {
      query.category = category;
    }
    
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
    
    res.json({
      success: true,
      questions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// Add Question
app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    // Validate
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options required'
      });
    }
    
    // Check exactly one correct option
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option must be specified'
      });
    }
    
    // Create question
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
    
    res.json({
      success: true,
      message: 'Question added successfully',
      question
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add question'
    });
  }
});

// Delete Question
app.delete('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await Question.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

// Get Results
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    const results = await Result.find()
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
      message: 'Failed to fetch results'
    });
  }
});

// Delete Result
app.delete('/api/admin/results/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await Result.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Result deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete result'
    });
  }
});

// Delete All Results
app.delete('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    await Result.deleteMany({});
    
    res.json({
      success: true,
      message: 'All results deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete all results error:', error);
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
    let config = await Config.findOne();
    
    if (!config) {
      config = await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
    }
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    console.error('Get config error:', error);
    res.json({
      success: false,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      message: 'Using default config'
    });
  }
});

// Update Configuration
app.put('/api/config', authenticateAdmin, async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
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
      message: 'Configuration updated successfully',
      config
    });
    
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Question.distinct('category');
    
    const categoryData = categories.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      description: `${cat.toUpperCase()} Technology Assessment`,
      available: true
    }));
    
    // Default categories if none
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
        categories: defaultCategories
      });
    }
    
    res.json({
      success: true,
      categories: categoryData
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
        { value: 'react', label: 'React.js', description: 'React Framework', available: true },
        { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true }
      ]
    });
  }
});

// Register Student
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    // Validate
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Format roll number
    const formattedRollNumber = `SI-${rollNumber}`;
    
    // Check if already exists in results
    const existing = await Result.findOne({ rollNumber: formattedRollNumber, category });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This roll number already has a result for this category'
      });
    }
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        name: name.trim(),
        rollNumber: formattedRollNumber,
        category: category.toLowerCase()
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

// Get Quiz Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Get config for question limit
    const config = await Config.findOne();
    const limit = config?.totalQuestions || 50;
    
    // Get random questions for category
    const questions = await Question.aggregate([
      { $match: { category: category.toLowerCase() } },
      { $sample: { size: limit } }
    ]);
    
    if (questions.length === 0) {
      return res.json({
        success: false,
        message: `No questions available for ${category}`,
        questions: []
      });
    }
    
    // Get config
    const currentConfig = await Config.findOne();
    
    res.json({
      success: true,
      questions,
      config: {
        quizTime: currentConfig?.quizTime || 30,
        passingPercentage: currentConfig?.passingPercentage || 40,
        totalQuestions: currentConfig?.totalQuestions || 50
      },
      message: `Found ${questions.length} questions`
    });
    
  } catch (error) {
    console.error('Get quiz questions error:', error);
    
    // Fallback sample questions
    const sampleQuestions = [
      {
        _id: 'sample1',
        questionText: 'What does HTML stand for?',
        options: [
          { text: 'Hyper Text Markup Language', isCorrect: true },
          { text: 'High Tech Modern Language', isCorrect: false },
          { text: 'Hyper Transfer Markup Language', isCorrect: false },
          { text: 'Home Tool Markup Language', isCorrect: false }
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
      message: 'Using sample questions'
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
    
    // Calculate percentage
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    
    // Save result
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
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result
    });
    
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
});

module.exports = app;