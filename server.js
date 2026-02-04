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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority';

console.log('🔗 MongoDB Connection URL:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database:', mongoose.connection.db?.databaseName);
  
  // Create collections if they don't exist
  createDefaultCollections();
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
  console.log('⚠️ Running in offline mode');
});

// Schemas and Models
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: Number,
  percentage: Number,
  marksObtained: Number,
  totalMarks: Number,
  passed: Boolean,
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
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

const categoryConfigSchema = new mongoose.Schema({
  category: { type: String, unique: true },
  quizTime: Number,
  passingPercentage: Number,
  totalQuestions: Number,
  enabled: { type: Boolean, default: true },
  description: String,
  logo: String,
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Config = mongoose.model('Config', configSchema);
const CategoryConfig = mongoose.model('CategoryConfig', categoryConfigSchema);

// Create default collections
async function createDefaultCollections() {
  try {
    // Create admin if not exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@shamsi.edu.pk',
        role: 'superadmin'
      });
      console.log('✅ Default admin created');
    }

    // Create default config
    const configCount = await Config.countDocuments();
    if (configCount === 0) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      });
      console.log('✅ Default config created');
    }

    // Create default category configs
    const defaultCategories = ['html', 'css', 'javascript', 'react', 'node', 'mongodb', 'docker', 'aws', 'python', 'git'];
    
    for (const category of defaultCategories) {
      const catConfig = await CategoryConfig.findOne({ category });
      if (!catConfig) {
        await CategoryConfig.create({
          category,
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50,
          enabled: true,
          description: `${category.toUpperCase()} Assessment`
        });
      }
    }
    console.log('✅ Default category configs created');

    // Create sample questions if none exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      await createSampleQuestions();
      console.log('✅ Sample questions created');
    }

    // Create sample users if none exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await createSampleUsers();
      console.log('✅ Sample users created');
    }
  } catch (error) {
    console.error('Error creating default collections:', error);
  }
}

async function createSampleQuestions() {
  const sampleQuestions = [
    // HTML Questions
    {
      category: 'html',
      questionText: 'What does HTML stand for?',
      options: [
        { text: 'Hyper Text Markup Language', isCorrect: true },
        { text: 'High Tech Modern Language', isCorrect: false },
        { text: 'Hyper Transfer Markup Language', isCorrect: false },
        { text: 'Home Tool Markup Language', isCorrect: false }
      ],
      marks: 2,
      difficulty: 'easy'
    },
    {
      category: 'html',
      questionText: 'Which tag is used for the largest heading in HTML?',
      options: [
        { text: '<h6>', isCorrect: false },
        { text: '<h1>', isCorrect: true },
        { text: '<head>', isCorrect: false },
        { text: '<heading>', isCorrect: false }
      ],
      marks: 2,
      difficulty: 'easy'
    },
    
    // CSS Questions
    {
      category: 'css',
      questionText: 'What does CSS stand for?',
      options: [
        { text: 'Creative Style Sheets', isCorrect: false },
        { text: 'Cascading Style Sheets', isCorrect: true },
        { text: 'Computer Style Sheets', isCorrect: false },
        { text: 'Colorful Style Sheets', isCorrect: false }
      ],
      marks: 2,
      difficulty: 'easy'
    },
    {
      category: 'css',
      questionText: 'Which property is used to change the background color?',
      options: [
        { text: 'color', isCorrect: false },
        { text: 'bgcolor', isCorrect: false },
        { text: 'background-color', isCorrect: true },
        { text: 'background', isCorrect: false }
      ],
      marks: 2,
      difficulty: 'easy'
    },
    
    // JavaScript Questions
    {
      category: 'javascript',
      questionText: 'Which company developed JavaScript?',
      options: [
        { text: 'Microsoft', isCorrect: false },
        { text: 'Netscape', isCorrect: true },
        { text: 'Google', isCorrect: false },
        { text: 'Apple', isCorrect: false }
      ],
      marks: 3,
      difficulty: 'medium'
    },
    {
      category: 'javascript',
      questionText: 'What is the output of: console.log(typeof null)?',
      options: [
        { text: 'null', isCorrect: false },
        { text: 'undefined', isCorrect: false },
        { text: 'object', isCorrect: true },
        { text: 'number', isCorrect: false }
      ],
      marks: 3,
      difficulty: 'medium'
    }
  ];

  await Question.insertMany(sampleQuestions);
}

async function createSampleUsers() {
  const sampleUsers = [
    {
      name: 'Ali Ahmed',
      rollNumber: 'SI-2024-001',
      category: 'html',
      score: 85,
      percentage: 85,
      marksObtained: 85,
      totalMarks: 100,
      passed: true,
      submittedAt: new Date()
    },
    {
      name: 'Sara Khan',
      rollNumber: 'SI-2024-002',
      category: 'css',
      score: 45,
      percentage: 45,
      marksObtained: 45,
      totalMarks: 100,
      passed: false,
      submittedAt: new Date()
    }
  ];

  await User.insertMany(sampleUsers);
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_institute_secret_key_2024';

// Check if MongoDB is connected
const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// ==================== ROUTES ====================

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shamsi Institute Quiz System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Online',
    database: isDBConnected() ? 'Connected' : 'Disconnected'
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = isDBConnected() ? 'connected' : 'disconnected';
    
    // Get counts if DB is connected
    let counts = {};
    if (isDBConnected()) {
      counts = {
        users: await User.countDocuments(),
        questions: await Question.countDocuments(),
        admins: await Admin.countDocuments(),
        configs: await Config.countDocuments(),
        categoryConfigs: await CategoryConfig.countDocuments()
      };
    }
    
    res.json({
      success: true,
      message: 'Shamsi Institute Quiz System API is running',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      counts: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Initialize database endpoint
app.get('/api/init-db', async (req, res) => {
  try {
    if (isDBConnected()) {
      await createDefaultCollections();
      
      const counts = {
        users: await User.countDocuments(),
        questions: await Question.countDocuments(),
        admins: await Admin.countDocuments(),
        configs: await Config.countDocuments(),
        categoryConfigs: await CategoryConfig.countDocuments()
      };
      
      res.json({
        success: true,
        message: 'Database initialized successfully',
        counts: counts
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Init error',
      error: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for:', username);
    
    // First try MongoDB
    if (isDBConnected()) {
      const admin = await Admin.findOne({ username: username.toLowerCase() });
      
      if (admin) {
        const validPassword = await bcrypt.compare(password, admin.password);
        if (validPassword) {
          const token = jwt.sign(
            { 
              id: admin._id, 
              username: admin.username, 
              role: admin.role,
              email: admin.email 
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
              email: admin.email,
              role: admin.role
            }
          });
        }
      }
    }
    
    // Development fallback credentials
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'dev_admin_id', 
          username: 'admin', 
          role: 'superadmin',
          email: 'admin@shamsi.edu.pk'
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
          email: 'admin@shamsi.edu.pk',
          role: 'superadmin'
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
      message: 'Login error',
      error: error.message
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    console.log('📊 Dashboard stats requested');
    
    if (isDBConnected()) {
      // Get counts
      const totalStudents = await User.countDocuments();
      const totalQuestions = await Question.countDocuments();
      const totalAttempts = await User.countDocuments({ submittedAt: { $ne: null } });
      
      const results = await User.find({ submittedAt: { $ne: null } });
      const averageScore = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
        : 0;
      
      const passCount = results.filter(r => r.passed).length;
      const passRate = results.length > 0 ? (passCount / results.length) * 100 : 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttempts = await User.countDocuments({ 
        submittedAt: { $gte: today } 
      });
      
      // Get config
      let config = await Config.findOne();
      if (!config) {
        config = {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 10
        };
      }
      
      // Get categories count
      const categories = await Question.distinct('category');
      
      // Get recent attempts
      const recentAttempts = await User.find({ submittedAt: { $ne: null } })
        .sort({ submittedAt: -1 })
        .limit(5);
      
      res.json({
        success: true,
        stats: {
          totalStudents,
          totalQuestions,
          totalAttempts,
          averageScore: parseFloat(averageScore.toFixed(2)),
          passRate: parseFloat(passRate.toFixed(2)),
          todayAttempts,
          quizTime: config.quizTime,
          passingPercentage: config.passingPercentage,
          totalCategories: categories.length
        },
        recentAttempts: recentAttempts
      });
      
    } else {
      // Fallback data if DB not connected
      res.json({
        success: true,
        stats: {
          totalStudents: 0,
          totalQuestions: 0,
          totalAttempts: 0,
          averageScore: 0,
          passRate: 0,
          todayAttempts: 0,
          quizTime: 30,
          passingPercentage: 40,
          totalCategories: 0
        },
        recentAttempts: [],
        message: 'Using fallback data (MongoDB not connected)'
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard error',
      error: error.message
    });
  }
});

// Get All Questions
app.get('/api/admin/questions', async (req, res) => {
  try {
    console.log('📝 Fetching all questions...');
    
    if (isDBConnected()) {
      const { category, difficulty, page = 1, limit = 50 } = req.query;
      
      let query = {};
      
      if (category && category !== 'all') {
        query.category = category;
      }
      
      if (difficulty && difficulty !== 'all') {
        query.difficulty = difficulty;
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const questions = await Question.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const totalQuestions = await Question.countDocuments(query);
      
      console.log(`✅ Found ${questions.length} questions in MongoDB`);
      
      res.json({
        success: true,
        questions,
        count: questions.length,
        total: totalQuestions,
        page: parseInt(page),
        pages: Math.ceil(totalQuestions / parseInt(limit))
      });
    } else {
      res.json({
        success: true,
        questions: [],
        count: 0,
        total: 0,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting questions',
      error: error.message
    });
  }
});

// Add New Question
app.post('/api/admin/questions', async (req, res) => {
  try {
    const { category, questionText, options, marks, difficulty } = req.body;
    
    console.log('➕ Adding new question:', { category, questionText });
    
    if (!category || !questionText || !options) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate exactly one correct option
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option is required'
      });
    }
    
    if (isDBConnected()) {
      const question = new Question({
        category: category.toLowerCase(),
        questionText,
        options,
        marks: marks || 1,
        difficulty: difficulty || 'medium'
      });
      
      await question.save();
      
      console.log(`✅ Question added to MongoDB with ID: ${question._id}`);
      
      res.json({
        success: true,
        message: 'Question added successfully',
        question
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected, cannot save question'
      });
    }
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question',
      error: error.message
    });
  }
});

// Delete Question
app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting question:', id);
    
    if (isDBConnected()) {
      const result = await Question.findByIdAndDelete(id);
      
      if (result) {
        console.log(`✅ Question deleted: ${id}`);
        res.json({
          success: true,
          message: 'Question deleted successfully',
          deletedId: id
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
});

// Get Results
app.get('/api/admin/results', async (req, res) => {
  try {
    console.log('📈 Fetching results...');
    
    if (isDBConnected()) {
      const { category, passed, page = 1, limit = 50 } = req.query;
      
      let query = { submittedAt: { $ne: null } };
      
      if (category && category !== 'all') {
        query.category = category;
      }
      
      if (passed !== undefined) {
        query.passed = passed === 'true';
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const results = await User.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const totalResults = await User.countDocuments(query);
      
      console.log(`✅ Found ${results.length} results in MongoDB`);
      
      res.json({
        success: true,
        results,
        count: results.length,
        total: totalResults,
        page: parseInt(page),
        pages: Math.ceil(totalResults / parseInt(limit))
      });
    } else {
      res.json({
        success: true,
        results: [],
        count: 0,
        total: 0,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting results',
      error: error.message
    });
  }
});

// Delete Result
app.delete('/api/admin/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting result:', id);
    
    if (isDBConnected()) {
      const result = await User.findByIdAndDelete(id);
      
      if (result) {
        console.log(`✅ Result deleted: ${id}`);
        res.json({
          success: true,
          message: 'Result deleted successfully',
          deletedId: id
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Result not found'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting result',
      error: error.message
    });
  }
});

// Delete All Results
app.delete('/api/admin/results', async (req, res) => {
  try {
    console.log('🗑️ Deleting ALL results');
    
    if (isDBConnected()) {
      const result = await User.deleteMany({ submittedAt: { $ne: null } });
      
      console.log(`✅ Deleted ${result.deletedCount} results`);
      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} results`,
        deletedCount: result.deletedCount
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error deleting all results:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting all results',
      error: error.message
    });
  }
});

// ==================== CONFIGURATION ROUTES ====================

// Get Global Configuration
app.get('/api/config', async (req, res) => {
  try {
    console.log('⚙️ Fetching global configuration...');
    
    if (isDBConnected()) {
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
    } else {
      res.json({
        success: true,
        config: {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50
        },
        message: 'Using default config (MongoDB not connected)'
      });
    }
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting configuration',
      error: error.message
    });
  }
});

// Update Global Configuration
app.put('/api/config', async (req, res) => {
  try {
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    console.log('⚙️ Updating global configuration:', { quizTime, passingPercentage, totalQuestions });
    
    if (isDBConnected()) {
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
        message: 'Global configuration updated successfully',
        config
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected, cannot save config'
      });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating configuration',
      error: error.message
    });
  }
});

// Get Category Configuration
app.get('/api/config/categories', async (req, res) => {
  try {
    console.log('📂 Fetching category configurations...');
    
    if (isDBConnected()) {
      const categoryConfigs = await CategoryConfig.find().sort({ category: 1 });
      
      res.json({
        success: true,
        categoryConfigs
      });
    } else {
      res.json({
        success: true,
        categoryConfigs: [],
        message: 'MongoDB not connected'
      });
    }
  } catch (error) {
    console.error('Error getting category configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting category configurations',
      error: error.message
    });
  }
});

// Get Single Category Configuration
app.get('/api/config/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log(`⚙️ Fetching configuration for category: ${category}`);
    
    if (isDBConnected()) {
      let categoryConfig = await CategoryConfig.findOne({ category: category.toLowerCase() });
      
      if (!categoryConfig) {
        // Get global config as fallback
        const globalConfig = await Config.findOne();
        
        categoryConfig = {
          category: category,
          quizTime: globalConfig?.quizTime || 30,
          passingPercentage: globalConfig?.passingPercentage || 40,
          totalQuestions: globalConfig?.totalQuestions || 50,
          enabled: true
        };
      }
      
      res.json({
        success: true,
        categoryConfig
      });
    } else {
      res.json({
        success: true,
        categoryConfig: {
          category: category,
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50,
          enabled: true
        },
        message: 'Using default config (MongoDB not connected)'
      });
    }
  } catch (error) {
    console.error('Error getting category config:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting category configuration',
      error: error.message
    });
  }
});

// Update Category Configuration
app.put('/api/config/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { quizTime, passingPercentage, totalQuestions, enabled, description, logo } = req.body;
    
    console.log(`⚙️ Updating configuration for category: ${category}`, req.body);
    
    if (isDBConnected()) {
      let categoryConfig = await CategoryConfig.findOne({ category: category.toLowerCase() });
      
      if (categoryConfig) {
        categoryConfig.quizTime = quizTime !== undefined ? quizTime : categoryConfig.quizTime;
        categoryConfig.passingPercentage = passingPercentage !== undefined ? passingPercentage : categoryConfig.passingPercentage;
        categoryConfig.totalQuestions = totalQuestions !== undefined ? totalQuestions : categoryConfig.totalQuestions;
        categoryConfig.enabled = enabled !== undefined ? enabled : categoryConfig.enabled;
        categoryConfig.description = description || categoryConfig.description;
        categoryConfig.logo = logo || categoryConfig.logo;
        categoryConfig.updatedAt = new Date();
        await categoryConfig.save();
      } else {
        categoryConfig = await CategoryConfig.create({
          category: category.toLowerCase(),
          quizTime: quizTime || 30,
          passingPercentage: passingPercentage || 40,
          totalQuestions: totalQuestions || 50,
          enabled: enabled !== undefined ? enabled : true,
          description: description || `${category.toUpperCase()} Assessment`,
          logo: logo || ''
        });
      }
      
      res.json({
        success: true,
        message: 'Category configuration updated successfully',
        categoryConfig
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB not connected, cannot save config'
      });
    }
  } catch (error) {
    console.error('Error updating category config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category configuration',
      error: error.message
    });
  }
});

// ==================== CATEGORIES ROUTES ====================

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    console.log('📂 Fetching categories...');
    
    if (isDBConnected()) {
      // Get unique categories from questions
      const categoriesFromQuestions = await Question.distinct('category');
      
      // Get category configurations
      const categoryConfigs = await CategoryConfig.find();
      
      // Create categories with counts and configs
      const categoriesWithDetails = await Promise.all(
        categoriesFromQuestions.map(async (category) => {
          const count = await Question.countDocuments({ category });
          const config = categoryConfigs.find(c => c.category === category);
          
          return {
            value: category,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            questionCount: count,
            config: config || {
              quizTime: 30,
              passingPercentage: 40,
              totalQuestions: 50,
              enabled: true
            }
          };
        })
      );
      
      // Sort alphabetically
      categoriesWithDetails.sort((a, b) => a.label.localeCompare(b.label));
      
      res.json({
        success: true,
        categories: categoriesWithDetails
      });
    } else {
      // Default categories if DB not connected
      const defaultCategories = [
        { 
          value: 'html', 
          label: 'HTML', 
          questionCount: 0,
          config: {
            quizTime: 30,
            passingPercentage: 40,
            totalQuestions: 50,
            enabled: true
          }
        },
        { 
          value: 'css', 
          label: 'CSS', 
          questionCount: 0,
          config: {
            quizTime: 30,
            passingPercentage: 40,
            totalQuestions: 50,
            enabled: true
          }
        },
        { 
          value: 'javascript', 
          label: 'JavaScript', 
          questionCount: 0,
          config: {
            quizTime: 30,
            passingPercentage: 40,
            totalQuestions: 50,
            enabled: true
          }
        }
      ];
      
      res.json({
        success: true,
        categories: defaultCategories,
        message: 'Using default categories (MongoDB not connected)'
      });
    }
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting categories',
      error: error.message
    });
  }
});

// ==================== QUIZ ROUTES ====================

// Get Quiz Questions for Students with Category Config
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('❓ Fetching quiz questions for category:', category);
    
    if (isDBConnected()) {
      // Get category configuration
      let categoryConfig = await CategoryConfig.findOne({ category: category.toLowerCase() });
      let globalConfig = await Config.findOne();
      
      // Use category config if exists, otherwise use global config
      const quizTime = categoryConfig?.quizTime || globalConfig?.quizTime || 30;
      const passingPercentage = categoryConfig?.passingPercentage || globalConfig?.passingPercentage || 40;
      const totalQuestions = categoryConfig?.totalQuestions || globalConfig?.totalQuestions || 50;
      
      // Check if category is enabled
      if (categoryConfig && categoryConfig.enabled === false) {
        return res.status(400).json({
          success: false,
          message: 'This category is currently disabled'
        });
      }
      
      // Get questions for this category
      const questions = await Question.find({ category: category.toLowerCase() });
      
      if (questions.length === 0) {
        return res.json({
          success: true,
          questions: [],
          message: 'No questions available for this category',
          category: category,
          config: {
            quizTime,
            passingPercentage,
            totalQuestions
          }
        });
      }
      
      // Select random questions (limited to totalQuestions)
      const selectedQuestions = questions
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(totalQuestions, questions.length));
      
      console.log(`✅ Found ${selectedQuestions.length} questions for ${category} quiz`);
      
      res.json({
        success: true,
        questions: selectedQuestions,
        count: selectedQuestions.length,
        config: {
          quizTime,
          passingPercentage,
          totalQuestions,
          categoryEnabled: categoryConfig?.enabled !== false
        }
      });
    } else {
      res.json({
        success: true,
        questions: [],
        message: 'MongoDB not connected, no questions available',
        category: category,
        config: {
          quizTime: 30,
          passingPercentage: 40,
          totalQuestions: 50
        }
      });
    }
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting quiz questions',
      error: error.message
    });
  }
});

// Submit Quiz Results
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { rollNumber, name, category, score, percentage, totalQuestions, correctAnswers, totalMarks, marksObtained } = req.body;
    
    console.log('📤 Submitting quiz result:', { rollNumber, name, percentage });
    
    if (isDBConnected()) {
      // Get category configuration for passing percentage
      let categoryConfig = await CategoryConfig.findOne({ category: category.toLowerCase() });
      let globalConfig = await Config.findOne();
      
      const passingPercentage = categoryConfig?.passingPercentage || globalConfig?.passingPercentage || 40;
      
      const user = new User({
        name,
        rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
        category: category.toLowerCase(),
        score,
        percentage,
        marksObtained: marksObtained || score,
        totalMarks: totalMarks || totalQuestions,
        passed: percentage >= passingPercentage,
        submittedAt: new Date()
      });
      
      await user.save();
      
      console.log(`✅ Result saved to MongoDB with ID: ${user._id}`);
      
      res.json({
        success: true,
        message: 'Quiz result saved successfully',
        result: user
      });
    } else {
      // If MongoDB not connected, still return success for testing
      console.log('⚠️ MongoDB not connected, saving locally');
      res.json({
        success: true,
        message: 'Quiz result processed (MongoDB not connected)',
        result: {
          name,
          rollNumber,
          category,
          score,
          percentage,
          passed: percentage >= 40,
          submittedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// ==================== PORT CONFIGURATION ====================

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📡 Admin Dashboard: http://localhost:${PORT}`);
});