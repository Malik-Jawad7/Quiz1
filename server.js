// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
app.use(cors({
  origin: ['https://quiz2-iota-one.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  initializeDefaultData();
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
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
  username: { type: String, unique: true, default: 'admin' },
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
      console.log('✅ Admin already exists:', {
        username: admin.username,
        password: admin.password,
        email: admin.email
      });
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

    // Add sample questions if no questions exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('Adding sample questions...');
      await addSampleQuestions();
    }

    console.log('📊 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing data:', error.message);
  }
};

// Add sample questions
const addSampleQuestions = async () => {
  const sampleQuestions = [
    {
      category: 'mern',
      questionText: 'What does MERN stand for?',
      options: [
        { text: 'MongoDB, Express, React, Node.js', isCorrect: true },
        { text: 'MySQL, Express, React, Node.js', isCorrect: false },
        { text: 'MongoDB, Express, Redux, Node.js', isCorrect: false },
        { text: 'MongoDB, Express, Ruby, Node.js', isCorrect: false }
      ],
      marks: 1,
      difficulty: 'easy'
    },
    {
      category: 'mern',
      questionText: 'Which of the following is NOT part of MERN stack?',
      options: [
        { text: 'MongoDB', isCorrect: false },
        { text: 'Express.js', isCorrect: false },
        { text: 'React', isCorrect: false },
        { text: 'Python', isCorrect: true }
      ],
      marks: 1,
      difficulty: 'easy'
    },
    // Add more sample questions to reach 100 marks...
  ];

  try {
    for (const question of sampleQuestions) {
      const newQuestion = new Question(question);
      await newQuestion.save();
    }
    console.log(`✅ Added ${sampleQuestions.length} sample questions`);
  } catch (error) {
    console.error('Error adding sample questions:', error);
  }
};

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    version: '1.0.0',
    endpoints: {
      admin: '/api/admin/login',
      categories: '/api/categories',
      register: '/api/auth/register',
      config: '/api/config'
    }
  });
});

// Admin Login - FIXED
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Admin login attempt:', { username });
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Find admin with exact username (case-sensitive)
    const admin = await Admin.findOne({ username: username });
    
    if (!admin) {
      console.log('❌ Admin not found for username:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    console.log('✅ Admin found:', {
      username: admin.username,
      passwordMatch: admin.password === password
    });
    
    // Compare passwords (exact match)
    if (admin.password === password) {
      console.log('✅ Password matches! Login successful');
      
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
      console.log('❌ Password mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('❌ Admin login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.',
      error: error.message
    });
  }
});

// 🔧 NEW: FORCE RESET ADMIN PASSWORD (Emergency fix)
app.post('/api/admin/force-reset', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    console.log('🛠️ Force reset for admin:', username);
    
    // Find and update or create admin
    let admin = await Admin.findOne({ username: username });
    
    if (!admin) {
      // Create new admin
      admin = new Admin({
        username: username,
        password: newPassword,
        email: 'admin@shamsi.edu.pk'
      });
      console.log('✅ Created new admin');
    } else {
      // Update existing admin
      admin.password = newPassword;
      console.log('✅ Updated existing admin password');
    }
    
    await admin.save();
    
    return res.json({
      success: true,
      message: '✅ Admin credentials updated successfully!',
      credentials: {
        username: admin.username,
        password: admin.password
      }
    });
  } catch (error) {
    console.error('Force reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset admin',
      error: error.message
    });
  }
});

// Get all questions for admin panel
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
    console.error('❌ Get questions error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch questions',
      error: error.message
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
    
    // Check category marks limit (100 marks max per category)
    const categoryQuestions = await Question.find({ category: category.toLowerCase() });
    const currentMarks = categoryQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const newMarks = marks || 1;
    
    if (currentMarks + newMarks > 100) {
      const remaining = 100 - currentMarks;
      return res.status(400).json({
        success: false,
        message: `Cannot add question. ${category.toUpperCase()} category already has ${currentMarks}/100 marks. Only ${remaining} marks remaining.`,
        currentMarks,
        remainingMarks: remaining
      });
    }
    
    const question = new Question({
      category: category.toLowerCase(),
      questionText,
      options: validOptions,
      marks: newMarks,
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
      },
      categoryStatus: {
        currentMarks: currentMarks + newMarks,
        remaining: 100 - (currentMarks + newMarks),
        isReady: (currentMarks + newMarks) >= 100
      }
    });
  } catch (error) {
    console.error('❌ Add question error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to add question',
      error: error.message
    });
  }
});

// Delete question
app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    return res.json({
      success: true,
      message: '✅ Question deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete question error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete question',
      error: error.message
    });
  }
});

// Get all results for admin panel
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
    console.error('❌ Get results error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results',
      error: error.message
    });
  }
});

// Get dashboard stats for admin panel
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
    
    // Get category stats
    const categories = ['html', 'css', 'javascript', 'react', 'mern', 'node', 'mongodb', 'express'];
    const categoryStats = {};
    const categoryMarks = {};
    
    for (const category of categories) {
      const questionsInCategory = await Question.find({ category });
      const attemptsInCategory = await User.countDocuments({ category });
      
      const totalMarks = questionsInCategory.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      categoryStats[category] = {
        questions: questionsInCategory.length,
        attempts: attemptsInCategory,
        totalMarks: totalMarks,
        isReady: totalMarks >= 100,
        percentage: (totalMarks / 100) * 100,
        remaining: 100 - totalMarks
      };
      
      categoryMarks[category] = totalMarks;
    }
    
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
      categoryStats,
      categoryMarks,
      recentActivity
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard stats',
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
      message: 'Failed to update config',
      error: error.message
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = ['html', 'css', 'javascript', 'react', 'mern', 'node', 'mongodb', 'express'];
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
      message: 'Failed to fetch categories',
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
    
    // Check if category has enough questions (at least 100 marks worth)
    const categoryQuestions = await Question.find({ category: category.toLowerCase() });
    const totalMarks = categoryQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    
    if (totalMarks < 100) {
      return res.status(400).json({
        success: false,
        message: `The ${category.toUpperCase()} category is not yet available for quizzes. It needs 100 total marks worth of questions (currently ${totalMarks}/100).`
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
      message: 'Registration failed',
      error: error.message
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
    
    // Check if category is ready (has at least 100 marks)
    const totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    if (totalMarks < 100) {
      return res.status(400).json({
        success: false,
        message: `The ${category.toUpperCase()} category is not yet available for quizzes. It needs 100 total marks worth of questions (currently ${totalMarks}/100).`
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
      message: 'Failed to fetch quiz questions',
      error: error.message
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
      message: 'Failed to submit quiz',
      error: error.message
    });
  }
});

// Delete result
app.delete('/api/admin/results/:id', async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Result deleted successfully'
    });
  } catch (error) {
    console.error('Delete result error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete result',
      error: error.message
    });
  }
});

// Delete all results
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
    
    return res.json({
      success: true,
      message: `All results (${result.deletedCount}) deleted successfully`
    });
  } catch (error) {
    console.error('Delete all results error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all results',
      error: error.message
    });
  }
});

// Delete all questions
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
    
    return res.json({
      success: true,
      message: `All questions (${result.deletedCount}) deleted successfully`
    });
  } catch (error) {
    console.error('Delete all questions error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete all questions',
      error: error.message
    });
  }
});

// Get user by roll number
app.get('/api/user/:rollNumber', async (req, res) => {
  try {
    const user = await User.findOne({ rollNumber: req.params.rollNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Test endpoint - FIXED to show admin details
app.get('/api/test/data', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const questionCount = await Question.countDocuments();
    const adminCount = await Admin.countDocuments();
    const configCount = await Config.countDocuments();
    
    const sampleUsers = await User.find().limit(5);
    const sampleQuestions = await Question.find().limit(5);
    const admins = await Admin.find();
    
    return res.json({
      success: true,
      counts: {
        users: userCount,
        questions: questionCount,
        admins: adminCount,
        configs: configCount
      },
      admins: admins.map(a => ({
        username: a.username,
        password: a.password,
        email: a.email
      })),
      sampleUsers,
      sampleQuestions,
      mongodbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    console.error('Test data error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get test data',
      error: error.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    endpoints: {
      health: '/api/health',
      admin: {
        login: '/api/admin/login',
        forceReset: '/api/admin/force-reset',
        dashboard: '/api/admin/dashboard',
        questions: '/api/admin/questions',
        results: '/api/admin/results'
      },
      quiz: {
        categories: '/api/categories',
        register: '/api/auth/register',
        questions: '/api/quiz/questions/:category',
        submit: '/api/quiz/submit',
        user: '/api/user/:rollNumber'
      },
      config: '/api/config',
      test: '/api/test/data'
    }
  });
});

// Handle 404
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found. Use /api for API endpoints.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on http://localhost:${PORT}
  📡 API Base URL: http://localhost:${PORT}/api
  🔗 Health Check: http://localhost:${PORT}/api/health
  👨‍💼 Admin Login: admin / admin123
  🔧 Force Reset: POST /api/admin/force-reset
  📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
  `);
});

module.exports = app;