const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_key_2024_vercel_deploy';

// **EMERGENCY FIX: Multiple MongoDB URI options**
const getMongoDBUri = () => {
  const uris = [
    process.env.MONGODB_URI,
    'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/shamsi_quiz_system?retryWrites=true&w=majority&appName=Cluster0',
    'mongodb+srv://shamsi_admin:Admin123456@cluster0.e6gmkpo.mongodb.net/shamsi_quiz_system?retryWrites=true&w=majority',
    'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/?retryWrites=true&w=majority',
    'mongodb://khalid:khalid123@cluster0.e6gmkpo.mongodb.net:27017/shamsi_quiz_system'
  ];
  
  for (let uri of uris) {
    if (uri && uri.trim() !== '') {
      console.log('📊 Found MongoDB URI');
      return uri;
    }
  }
  
  return null;
};

const MONGODB_URI = getMongoDBUri();
const PORT = process.env.PORT || 5000;

console.log('🚀 Shamsi Institute Quiz System Backend');
console.log('📊 Environment:', process.env.NODE_ENV || 'production');
console.log('📊 MongoDB URI available:', !!MONGODB_URI);

// ==================== CORS ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Authorization'],
  maxAge: 86400
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== MONGODB CONNECTION WITH FALLBACK ====================
let isMongoDBConnected = false;
let mongooseConnection = null;
let connectionAttempts = 0;

console.log('\n🔗 Initializing MongoDB Connection...');

// In-memory database as fallback
const memoryDB = {
  questions: [],
  results: [],
  config: {
    quizTime: 30,
    passingPercentage: 40,
    totalQuestions: 10,
    updatedAt: new Date()
  },
  admins: []
};

// Load sample questions
const loadSampleQuestions = () => {
  memoryDB.questions = [
    // HTML Questions
    {
      _id: 'html_1',
      category: 'html',
      questionText: 'What does HTML stand for?',
      options: [
        { text: 'Hyper Text Markup Language', isCorrect: true },
        { text: 'Home Tool Markup Language', isCorrect: false },
        { text: 'Hyperlinks and Text Markup Language', isCorrect: false }
      ],
      marks: 1,
      difficulty: 'easy',
      createdAt: new Date()
    },
    {
      _id: 'html_2',
      category: 'html',
      questionText: 'Which HTML tag is used for the largest heading?',
      options: [
        { text: '<h1>', isCorrect: true },
        { text: '<h6>', isCorrect: false },
        { text: '<heading>', isCorrect: false }
      ],
      marks: 1,
      difficulty: 'easy',
      createdAt: new Date()
    },
    // CSS Questions
    {
      _id: 'css_1',
      category: 'css',
      questionText: 'What does CSS stand for?',
      options: [
        { text: 'Cascading Style Sheets', isCorrect: true },
        { text: 'Colorful Style Sheets', isCorrect: false },
        { text: 'Computer Style Sheets', isCorrect: false }
      ],
      marks: 1,
      difficulty: 'easy',
      createdAt: new Date()
    },
    // JavaScript Questions
    {
      _id: 'js_1',
      category: 'javascript',
      questionText: 'Inside which HTML element do we put JavaScript?',
      options: [
        { text: '<script>', isCorrect: true },
        { text: '<javascript>', isCorrect: false },
        { text: '<js>', isCorrect: false }
      ],
      marks: 1,
      difficulty: 'easy',
      createdAt: new Date()
    }
  ];
  
  console.log(`📊 Loaded ${memoryDB.questions.length} sample questions`);
};

// Initialize sample data
loadSampleQuestions();

// MongoDB Connection function
const connectToMongoDB = async () => {
  if (isMongoDBConnected && mongooseConnection) {
    console.log('📊 Using existing MongoDB connection');
    return true;
  }

  if (!MONGODB_URI) {
    console.log('⚠️ No MongoDB URI provided. Running in memory mode.');
    return false;
  }

  try {
    connectionAttempts++;
    console.log(`🔄 MongoDB Connection Attempt ${connectionAttempts}...`);
    console.log(`📊 URI: ${MONGODB_URI.substring(0, 60)}...`);

    // **VERCEL OPTIMIZED CONNECTION OPTIONS**
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,  // 5 seconds timeout for Vercel
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority',
      ssl: true,
      tls: true,
      family: 4,  // Force IPv4
      heartbeatFrequencyMS: 10000
    };

    mongoose.set('strictQuery', false);

    // Connect with timeout
    const connectPromise = mongoose.connect(MONGODB_URI, connectionOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('MongoDB connection timeout')), 8000);
    });

    await Promise.race([connectPromise, timeoutPromise]);

    isMongoDBConnected = true;
    mongooseConnection = mongoose.connection;

    console.log('✅✅✅ MONGODB CONNECTED SUCCESSFULLY! ✅✅✅');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'Unknown');
    console.log('📊 Host:', mongoose.connection.host);
    console.log('📊 Ready State:', mongoose.connection.readyState);

    // Set up event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected event');
      isMongoDBConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      isMongoDBConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isMongoDBConnected = false;
      // Auto-reconnect after 10 seconds
      setTimeout(connectToMongoDB, 10000);
    });

    // Initialize default data in MongoDB
    await initializeMongoDBData();
    
    return true;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Running in memory mode');
    
    isMongoDBConnected = false;
    mongooseConnection = null;
    
    // Try to reconnect after 30 seconds
    setTimeout(connectToMongoDB, 30000);
    
    return false;
  }
};

// Initialize MongoDB with default data
const initializeMongoDBData = async () => {
  if (!isMongoDBConnected) return;

  try {
    console.log('📦 Initializing MongoDB data...');

    // Define schemas
    const questionSchema = new mongoose.Schema({
      category: { type: String, required: true },
      questionText: { type: String, required: true },
      options: [{
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false }
      }],
      marks: { type: Number, default: 1 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
      createdAt: { type: Date, default: Date.now }
    });

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

    const configSchema = new mongoose.Schema({
      quizTime: { type: Number, default: 30 },
      passingPercentage: { type: Number, default: 40 },
      totalQuestions: { type: Number, default: 50 },
      updatedAt: { type: Date, default: Date.now }
    });

    const adminSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    });

    // Create models
    const Question = mongoose.model('Question', questionSchema);
    const Result = mongoose.model('Result', resultSchema);
    const Config = mongoose.model('Config', configSchema);
    const Admin = mongoose.model('Admin', adminSchema);

    // Create default admin if not exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date()
      });
      console.log('✅ Default admin created in MongoDB');
    }

    // Create default config if not exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      });
      console.log('✅ Default config created in MongoDB');
    }

    // Check if questions exist, if not add samples
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      await Question.insertMany(memoryDB.questions);
      console.log(`✅ ${memoryDB.questions.length} sample questions added to MongoDB`);
    }

    console.log('✅ MongoDB data initialization complete');

  } catch (error) {
    console.error('❌ Error initializing MongoDB data:', error.message);
  }
};

// Start MongoDB connection
connectToMongoDB();

// ==================== HELPER FUNCTIONS ====================
const getQuestionModel = () => {
  if (isMongoDBConnected) {
    return mongoose.model('Question');
  }
  return null;
};

const getResultModel = () => {
  if (isMongoDBConnected) {
    return mongoose.model('Result');
  }
  return null;
};

const getConfigModel = () => {
  if (isMongoDBConnected) {
    return mongoose.model('Config');
  }
  return null;
};

const getAdminModel = () => {
  if (isMongoDBConnected) {
    return mongoose.model('Admin');
  }
  return null;
};

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  const dbState = mongooseConnection ? mongooseConnection.readyState : 0;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '21.0.0',
    status: 'operational',
    database: {
      connected: isMongoDBConnected,
      ready_state: dbState,
      state: states[dbState] || 'unknown',
      mode: isMongoDBConnected ? 'mongodb' : 'in-memory',
      connection_attempts: connectionAttempts
    },
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    admin_login: 'admin / admin123',
    endpoints: {
      health: 'GET /api/health',
      db_status: 'GET /api/db-status',
      admin_login: 'POST /admin/login',
      config: 'GET /api/config',
      categories: 'GET /api/categories',
      register: 'POST /api/register',
      quiz_questions: 'GET /api/quiz/questions/:category',
      submit_quiz: 'POST /api/quiz/submit',
      admin_dashboard: 'GET /api/admin/dashboard',
      admin_questions: 'GET /api/admin/questions',
      admin_results: 'GET /api/admin/results'
    },
    note: '✅ System works with both MongoDB and in-memory storage'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const dbState = mongooseConnection ? mongooseConnection.readyState : 0;
  
  res.json({
    success: true,
    status: 'healthy',
    server_time: new Date().toISOString(),
    uptime: process.uptime(),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'production',
    database: {
      status: isMongoDBConnected ? 'mongodb-connected' : 'in-memory',
      ready_state: dbState,
      mode: isMongoDBConnected ? 'mongodb' : 'in-memory',
      questions: isMongoDBConnected ? 'mongodb' : memoryDB.questions.length + ' in memory'
    },
    cors: {
      enabled: true,
      origin: req.headers.origin || '*'
    }
  });
});

// Database status
app.get('/api/db-status', async (req, res) => {
  let dbInfo = {};
  
  if (isMongoDBConnected && mongooseConnection) {
    try {
      const collections = await mongooseConnection.db.listCollections().toArray();
      dbInfo = {
        database: mongooseConnection.db.databaseName,
        host: mongooseConnection.host,
        collections: collections.map(c => c.name),
        collection_count: collections.length
      };
    } catch (err) {
      dbInfo = { error: err.message };
    }
  }
  
  res.json({
    success: true,
    is_connected: isMongoDBConnected,
    ready_state: mongooseConnection ? mongooseConnection.readyState : 0,
    state_description: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongooseConnection ? mongooseConnection.readyState : 0],
    database_info: dbInfo,
    memory_data: {
      questions: memoryDB.questions.length,
      results: memoryDB.results.length,
      categories: [...new Set(memoryDB.questions.map(q => q.category))]
    },
    connection_attempts: connectionAttempts
  });
});

// Admin login - WORKS WITH BOTH MONGODB AND MEMORY
app.post('/admin/login', async (req, res) => {
  console.log('🔐 Admin login attempt');
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // ALWAYS ALLOW DEFAULT ADMIN LOGIN
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ 
        username: 'admin',
        role: 'admin',
        source: isMongoDBConnected ? 'mongodb' : 'in-memory',
        timestamp: new Date().toISOString()
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        message: `✅ Login successful (${isMongoDBConnected ? 'MongoDB' : 'Memory'} Mode)`,
        token,
        user: {
          username: 'admin',
          role: 'admin'
        },
        database_connected: isMongoDBConnected,
        expires_in: '24 hours'
      });
    }
    
    // Try MongoDB authentication if connected
    if (isMongoDBConnected) {
      try {
        const Admin = getAdminModel();
        if (Admin) {
          const admin = await Admin.findOne({ username: username.trim() });
          if (admin) {
            const isPasswordValid = await bcrypt.compare(password, admin.password);
            if (isPasswordValid) {
              const token = jwt.sign({ 
                username: admin.username,
                role: 'admin',
                source: 'mongodb'
              }, JWT_SECRET, { expiresIn: '24h' });
              
              return res.json({
                success: true,
                message: '✅ Login successful (MongoDB)',
                token,
                user: {
                  username: admin.username,
                  role: 'admin'
                }
              });
            }
          }
        }
      } catch (dbError) {
        console.log('⚠️ MongoDB authentication error:', dbError.message);
      }
    }
    
    // Invalid credentials
    return res.status(401).json({
      success: false,
      message: '❌ Invalid credentials. Use default: admin / admin123',
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Emergency fallback for admin/admin123
    if (req.body.username === 'admin' && req.body.password === 'admin123') {
      const token = jwt.sign({ 
        username: 'admin',
        role: 'admin',
        source: 'emergency'
      }, JWT_SECRET, { expiresIn: '12h' });
      
      return res.json({
        success: true,
        message: '✅ Login successful (Emergency Mode)',
        token,
        user: {
          username: 'admin',
          role: 'admin'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get configuration
app.get('/api/config', async (req, res) => {
  try {
    if (isMongoDBConnected) {
      try {
        const Config = getConfigModel();
        if (Config) {
          let config = await Config.findOne();
          if (!config) {
            config = await Config.create({
              quizTime: 30,
              passingPercentage: 40,
              totalQuestions: 50,
              updatedAt: new Date()
            });
          }
          
          return res.json({
            success: true,
            config,
            source: 'mongodb'
          });
        }
      } catch (dbError) {
        console.log('⚠️ MongoDB config fetch failed:', dbError.message);
      }
    }
    
    // Memory mode config
    res.json({
      success: true,
      config: memoryDB.config,
      source: 'memory'
    });
    
  } catch (error) {
    console.error('❌ Get config error:', error);
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      },
      source: 'error_fallback'
    });
  }
});

// Update configuration
app.put('/api/config', async (req, res) => {
  try {
    // Check authentication
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required' 
      });
    }
    
    // Verify token
    jwt.verify(token, JWT_SECRET);
    
    const { quizTime, passingPercentage, totalQuestions } = req.body;
    
    if (isMongoDBConnected) {
      try {
        const Config = getConfigModel();
        if (Config) {
          let config = await Config.findOne();
          
          if (!config) {
            config = await Config.create({
              quizTime,
              passingPercentage,
              totalQuestions,
              updatedAt: new Date()
            });
          } else {
            config.quizTime = quizTime;
            config.passingPercentage = passingPercentage;
            config.totalQuestions = totalQuestions;
            config.updatedAt = new Date();
            await config.save();
          }
          
          return res.json({
            success: true,
            message: '✅ Configuration updated in MongoDB',
            config,
            source: 'mongodb'
          });
        }
      } catch (dbError) {
        console.log('⚠️ MongoDB config update failed:', dbError.message);
      }
    }
    
    // Update memory config
    memoryDB.config = {
      quizTime,
      passingPercentage,
      totalQuestions,
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      message: '✅ Configuration updated (Memory Mode)',
      config: memoryDB.config,
      source: 'memory'
    });
    
  } catch (error) {
    console.error('❌ Update config error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    let categories = [];
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
        const Question = getQuestionModel();
        if (Question) {
          const dbCategories = await Question.distinct('category');
          if (dbCategories && dbCategories.length > 0) {
            categories = dbCategories;
            source = 'mongodb';
          }
        }
      } catch (dbError) {
        console.log('⚠️ MongoDB categories fetch failed:', dbError.message);
      }
    }
    
    // If no categories from MongoDB, use memory
    if (categories.length === 0) {
      categories = [...new Set(memoryDB.questions.map(q => q.category))];
      source = 'memory';
    }
    
    const categoryData = categories.map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Technology`,
      available: true,
      questionCount: memoryDB.questions.filter(q => q.category === cat).length
    }));
    
    res.json({
      success: true,
      categories: categoryData,
      source: source,
      count: categories.length
    });
    
  } catch (error) {
    console.error('❌ Get categories error:', error);
    
    // Default categories
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true }
      ],
      source: 'fallback'
    });
  }
});

// Register student
app.post('/api/register', (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, rollNumber, category'
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
    
    const formattedRollNumber = `SI-${rollNumber}`;
    
    res.json({
      success: true,
      message: '✅ Registration successful! You can now start the quiz.',
      user: {
        name: name.trim(),
        rollNumber: formattedRollNumber,
        category: category.toLowerCase(),
        registration_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed due to server error'
    });
  }
});

// Get quiz questions
app.get('/api/quiz/questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const formattedCategory = category.toLowerCase();
    
    console.log(`📚 Fetching questions for category: ${formattedCategory}`);
    
    let questions = [];
    let source = 'memory';
    let config = memoryDB.config;
    
    if (isMongoDBConnected) {
      try {
        const Question = getQuestionModel();
        const Config = getConfigModel();
        
        if (Question && Config) {
          // Get config from MongoDB
          const dbConfig = await Config.findOne();
          if (dbConfig) {
            config = dbConfig;
          }
          
          // Get questions from MongoDB
          const limit = config.totalQuestions || 10;
          const dbQuestions = await Question.find({ 
            category: formattedCategory 
          }).limit(limit);
          
          if (dbQuestions.length > 0) {
            questions = dbQuestions;
            source = 'mongodb';
            console.log(`✅ Found ${questions.length} questions in MongoDB`);
          }
        }
      } catch (dbError) {
        console.log('⚠️ MongoDB questions fetch failed:', dbError.message);
      }
    }
    
    // If no questions from MongoDB, use memory
    if (questions.length === 0) {
      questions = memoryDB.questions.filter(q => q.category === formattedCategory);
      source = 'memory';
      console.log(`✅ Found ${questions.length} questions in memory`);
    }
    
    // Shuffle questions
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    
    // Limit questions
    const limit = Math.min(config.totalQuestions || 10, shuffledQuestions.length);
    const finalQuestions = shuffledQuestions.slice(0, limit);
    
    res.json({
      success: true,
      questions: finalQuestions,
      config: {
        quizTime: config.quizTime || 30,
        passingPercentage: config.passingPercentage || 40,
        totalQuestions: limit
      },
      count: finalQuestions.length,
      source: source,
      note: questions.length === 0 ? `No questions available for ${formattedCategory}` : ''
    });
    
  } catch (error) {
    console.error('❌ Get quiz questions error:', error);
    
    res.json({
      success: true,
      questions: [],
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 10
      },
      source: 'error_fallback'
    });
  }
});

// Submit quiz
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
      passingPercentage = 40,
      cheatingDetected = false,
      isAutoSubmitted = false
    } = req.body;
    
    console.log('📤 Quiz submission received:', { name, rollNumber, correctAnswers });
    
    // Calculate results
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = percentage >= passingPercentage;
    const finalScore = correctAnswers || score || 0;
    
    // Create result object
    const resultData = {
      rollNumber: rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`,
      name: name.trim(),
      category: category.toLowerCase(),
      score: finalScore,
      percentage: parseFloat(percentage.toFixed(2)),
      totalQuestions,
      correctAnswers: correctAnswers || finalScore,
      attempted,
      passingPercentage,
      passed,
      cheatingDetected,
      isAutoSubmitted,
      submittedAt: new Date()
    };
    
    let savedToDB = false;
    
    // Save to MongoDB if connected
    if (isMongoDBConnected) {
      try {
        const Result = getResultModel();
        if (Result) {
          const result = await Result.create(resultData);
          console.log('✅ Result saved to MongoDB with ID:', result._id);
          savedToDB = true;
        }
      } catch (dbError) {
        console.error('❌ MongoDB save error:', dbError.message);
      }
    }
    
    // Always save to memory (as backup)
    const memoryResult = {
      ...resultData,
      _id: 'memory_' + Date.now(),
      timestamp: Date.now()
    };
    memoryDB.results.push(memoryResult);
    
    // Keep only last 1000 results in memory
    if (memoryDB.results.length > 1000) {
      memoryDB.results = memoryDB.results.slice(-1000);
    }
    
    // Prepare response
    const responseData = {
      rollNumber: resultData.rollNumber,
      name: resultData.name,
      category: resultData.category,
      score: resultData.score,
      percentage: resultData.percentage,
      totalQuestions: resultData.totalQuestions,
      correctAnswers: resultData.correctAnswers,
      attempted: resultData.attempted,
      passingPercentage: resultData.passingPercentage,
      passed: resultData.passed,
      grade: percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F',
      submittedAt: resultData.submittedAt.toISOString(),
      savedToDB: savedToDB,
      database_mode: isMongoDBConnected ? 'mongodb' : 'memory',
      message: passed ? '🎉 Congratulations! You passed the quiz!' : '❌ You did not pass. Try again!'
    };
    
    res.json({
      success: true,
      message: '✅ Quiz submitted successfully!',
      result: responseData
    });
    
  } catch (error) {
    console.error('❌ Submit quiz error:', error);
    
    res.json({
      success: true,
      message: 'Quiz submitted (memory mode)',
      result: {
        ...req.body,
        submittedAt: new Date().toISOString(),
        savedToDB: false
      }
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required. Please login first.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token format is: Bearer <token>' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    console.log(`🔐 Authenticated admin: ${decoded.username}`);
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token. Please login again.' 
    });
  }
};

// Admin dashboard
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    console.log(`📊 Dashboard request from: ${req.user.username}`);
    
    let stats = {
      totalStudents: 0,
      totalQuestions: 0,
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      todayAttempts: 0
    };
    
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
        const Result = getResultModel();
        const Question = getQuestionModel();
        
        if (Result && Question) {
          const totalStudents = await Result.countDocuments({});
          const totalQuestions = await Question.countDocuments({});
          const results = await Result.find({});
          
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
          const todayAttempts = await Result.countDocuments({
            submittedAt: { $gte: today }
          });
          
          stats = {
            totalStudents,
            totalQuestions,
            totalAttempts: totalStudents,
            averageScore: parseFloat(averageScore.toFixed(2)),
            passRate: parseFloat(passRate.toFixed(2)),
            todayAttempts
          };
          
          source = 'mongodb';
        }
      } catch (dbError) {
        console.log('⚠️ MongoDB dashboard fetch failed:', dbError.message);
      }
    }
    
    // If MongoDB failed, use memory stats
    if (source === 'memory') {
      const results = memoryDB.results;
      const questions = memoryDB.questions;
      
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
      const todayAttempts = results.filter(r => new Date(r.submittedAt) >= today).length;
      
      stats = {
        totalStudents: results.length,
        totalQuestions: questions.length,
        totalAttempts: results.length,
        averageScore: parseFloat(averageScore.toFixed(2)),
        passRate: parseFloat(passRate.toFixed(2)),
        todayAttempts
      };
    }
    
    res.json({
      success: true,
      stats,
      source,
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// Get all questions (admin)
app.get('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category = 'all', search = '', page = 1, limit = 100 } = req.query;
    
    let questions = [];
    let total = 0;
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
        const Question = getQuestionModel();
        if (Question) {
          let query = {};
          
          if (category !== 'all') {
            query.category = category.toLowerCase();
          }
          
          if (search && search.trim() !== '') {
            query.$or = [
              { questionText: { $regex: search.trim(), $options: 'i' } },
              { 'options.text': { $regex: search.trim(), $options: 'i' } }
            ];
          }
          
          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          questions = await Question.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
          
          total = await Question.countDocuments(query);
          source = 'mongodb';
        }
      } catch (dbError) {
        console.log('Questions fetch error:', dbError.message);
      }
    }
    
    // If MongoDB failed, use memory
    if (source === 'memory' || questions.length === 0) {
      questions = [...memoryDB.questions];
      
      // Filter by category
      if (category !== 'all') {
        questions = questions.filter(q => q.category === category.toLowerCase());
      }
      
      // Filter by search
      if (search && search.trim() !== '') {
        const searchLower = search.trim().toLowerCase();
        questions = questions.filter(q => 
          q.questionText.toLowerCase().includes(searchLower) ||
          (q.options && q.options.some(opt => 
            opt.text.toLowerCase().includes(searchLower)
          ))
        );
      }
      
      // Sort by createdAt (newest first)
      questions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      total = questions.length;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      questions = questions.slice(skip, skip + parseInt(limit));
    }
    
    res.json({
      success: true,
      questions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      source,
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add question (admin)
app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { category, questionText, options, marks = 1, difficulty = 'medium' } = req.body;
    
    if (!category || !questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category, question text, and at least 2 options required'
      });
    }
    
    // Validate exactly one correct option
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct option must be specified'
      });
    }
    
    // Prepare question data
    const questionData = {
      category: category.toLowerCase(),
      questionText: questionText.trim(),
      options: options.map(opt => ({
        text: opt.text.trim(),
        isCorrect: Boolean(opt.isCorrect)
      })),
      marks: parseInt(marks) || 1,
      difficulty: difficulty || 'medium',
      createdAt: new Date()
    };
    
    let savedQuestion = null;
    let source = 'memory';
    
    // Save to MongoDB if connected
    if (isMongoDBConnected) {
      try {
        const Question = getQuestionModel();
        if (Question) {
          savedQuestion = await Question.create(questionData);
          source = 'mongodb';
          console.log('✅ Question saved to MongoDB');
        }
      } catch (dbError) {
        console.log('Question add error:', dbError.message);
      }
    }
    
    // Always save to memory
    const memoryQuestion = {
      ...questionData,
      _id: 'memory_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    memoryDB.questions.push(memoryQuestion);
    
    if (!savedQuestion) {
      savedQuestion = memoryQuestion;
    }
    
    res.json({
      success: true,
      message: `✅ Question added successfully! (${source})`,
      question: savedQuestion,
      source,
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get results (admin)
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    let results = [];
    let source = 'memory';
    
    if (isMongoDBConnected) {
      try {
        const Result = getResultModel();
        if (Result) {
          results = await Result.find()
            .sort({ submittedAt: -1 })
            .limit(1000);
          source = 'mongodb';
        }
      } catch (dbError) {
        console.log('Results fetch error:', dbError.message);
      }
    }
    
    // If MongoDB failed, use memory
    if (source === 'memory' || results.length === 0) {
      results = [...memoryDB.results]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 1000);
    }
    
    res.json({
      success: true,
      results: results,
      count: results.length,
      source,
      database_connected: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ==================== START SERVER ====================
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🔐 Admin login: admin / admin123`);
  console.log(`✅ MongoDB Status: ${isMongoDBConnected ? 'CONNECTED 🎉' : 'DISCONNECTED (Using Memory)'}`);
  console.log(`📊 Memory Questions: ${memoryDB.questions.length}`);
  console.log(`📊 Memory Results: ${memoryDB.results.length}`);
  console.log(`\n💡 System works with both MongoDB and Memory storage!`);
});

module.exports = app;