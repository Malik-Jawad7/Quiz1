// server.js - COMPLETE FIXED VERSION
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
app.use(cors({
  origin: ['https://quiz2-iota-one.vercel.app', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// FIXED MongoDB Connection
const MONGODB_URI = 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 50000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database:', mongoose.connection.name);
  initializeDefaultData();
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('💡 Connection URI:', MONGODB_URI);
  console.log('🛠️ Make sure IP is whitelisted in MongoDB Atlas');
});

// Event listeners for connection
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected');
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
    console.log('📊 Initializing default data...');
    
    // Check and create default admin
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = new Admin({
        username: 'admin',
        password: 'admin123',
        email: 'admin@shamsi.edu.pk'
      });
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

    // Add sample questions if none exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('➕ Adding sample questions...');
      await addSampleQuestions();
    }

    console.log('✅ Database initialization complete!');
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
      category: 'react',
      questionText: 'What is JSX?',
      options: [
        { text: 'JavaScript XML', isCorrect: true },
        { text: 'Java Syntax Extension', isCorrect: false },
        { text: 'JavaScript Extension', isCorrect: false },
        { text: 'Java XML', isCorrect: false }
      ],
      marks: 1,
      difficulty: 'easy'
    }
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
  const dbState = mongoose.connection.readyState;
  let dbMessage = 'Unknown';
  
  switch(dbState) {
    case 0: dbMessage = 'Disconnected ❌'; break;
    case 1: dbMessage = 'Connected ✅'; break;
    case 2: dbMessage = 'Connecting 🔄'; break;
    case 3: dbMessage = 'Disconnecting 📤'; break;
  }
  
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    timestamp: new Date().toISOString(),
    database: dbMessage,
    mongodbState: dbState,
    server: 'Vercel',
    version: '2.0.0',
    endpoints: {
      admin: '/api/admin/login',
      quiz: '/api/auth/register',
      config: '/api/config',
      setup: '/api/setup-admin'
    }
  });
});

// Test Connection
app.get('/api/test', async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    const questionCount = await Question.countDocuments();
    
    res.json({
      success: true,
      message: 'Connection test successful',
      counts: {
        admins: adminCount,
        questions: questionCount
      },
      database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message,
      database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'
    });
  }
});

// Setup Admin (Force create/update)
app.get('/api/setup-admin', async (req, res) => {
  try {
    let admin = await Admin.findOne({ username: 'admin' });
    
    if (admin) {
      // Update existing
      admin.password = 'admin123';
      admin.email = 'admin@shamsi.edu.pk';
      await admin.save();
      
      res.json({
        success: true,
        message: 'Admin updated successfully',
        action: 'updated',
        admin: {
          username: admin.username,
          email: admin.email
        }
      });
    } else {
      // Create new
      admin = new Admin({
        username: 'admin',
        password: 'admin123',
        email: 'admin@shamsi.edu.pk'
      });
      await admin.save();
      
      res.json({
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
    res.status(500).json({
      success: false,
      message: 'Setup failed',
      error: error.message,
      database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'
    });
  }
});

// Admin Login - SIMPLIFIED
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', username);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required'
      });
    }
    
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    if (admin.password === password) {
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          username: admin.username,
          email: admin.email,
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// User Registration - SIMPLIFIED
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Check if user already exists
    const existing = await User.findOne({ rollNumber });
    if (existing) {
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
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
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
      message: 'Registration failed. Please try again.'
    });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = ['html', 'css', 'javascript', 'react', 'nextjs', 'node', 'express', 'python', 'java', 'php', 'mern', 'mongodb'];
    
    const categoryInfo = await Promise.all(categories.map(async (cat) => {
      const questions = await Question.find({ category: cat });
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      return {
        value: cat,
        label: cat.toUpperCase(),
        questionCount: questions.length,
        totalMarks: totalMarks,
        isReady: totalMarks >= 100
      };
    }));
    
    res.json({
      success: true,
      categories: categoryInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
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
        totalQuestions: config.totalQuestions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch config'
    });
  }
});

// Get Questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const questions = await Question.find({ category: category.toLowerCase() }).limit(10);
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found for this category'
      });
    }
    
    // Shuffle and limit to 10 questions
    const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    res.json({
      success: true,
      questions: shuffled.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks || 1
      })),
      count: shuffled.length,
      category: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
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
        message: 'Roll number and answers required'
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
    
    // Calculate score
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
    
    // Update user
    user.score = score;
    user.percentage = percentage;
    user.passed = passed;
    user.submittedAt = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        name: user.name,
        rollNumber: user.rollNumber,
        score: score,
        percentage: percentage.toFixed(2),
        passed: passed,
        submittedAt: user.submittedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

// Admin Dashboard - Get all results
app.get('/api/admin/results', async (req, res) => {
  try {
    const results = await User.find().sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      results: results.map(r => ({
        _id: r._id,
        name: r.name,
        rollNumber: r.rollNumber,
        category: r.category,
        score: r.score,
        percentage: r.percentage,
        passed: r.passed,
        submittedAt: r.submittedAt
      })),
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
});

// Admin Dashboard - Get all questions
app.get('/api/admin/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      questions: questions.map(q => ({
        _id: q._id,
        category: q.category,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks || 1,
        difficulty: q.difficulty || 'medium'
      })),
      count: questions.length
    });
  } catch (error) {
    res.status(500).json({
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
        message: 'Missing required fields'
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
      question: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add question'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '2.0.0',
    status: 'Live',
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      setup: '/api/setup-admin',
      login: '/api/admin/login',
      register: '/api/auth/register'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📡 API: https://backend-one-taupe-14.vercel.app
  🔗 Health: /api/health
  👨‍💼 Admin: admin / admin123
  📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
  `);
});

module.exports = app;