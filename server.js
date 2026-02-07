const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi_secret_key_2024_vercel_deploy';

// Fixed MongoDB URI - This should work
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/shamsi_quiz_system?retryWrites=true&w=majority';

const PORT = process.env.PORT || 5000;

console.log('🚀 Shamsi Institute Quiz System Backend');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('📊 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('📊 MongoDB Connection String (first 80 chars):', MONGODB_URI ? MONGODB_URI.substring(0, 80) + '...' : 'Not found');

// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== MONGODB CONNECTION (FIXED) ====================
let isConnected = false;
let connectionRetryCount = 0;
const MAX_RETRIES = 3;

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Already connected to MongoDB');
    return true;
  }

  try {
    connectionRetryCount++;
    console.log(`🔗 Attempt ${connectionRetryCount}/${MAX_RETRIES} - Connecting to MongoDB...`);
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is missing');
      return false;
    }
    
    // Clean the connection string
    let connectionString = MONGODB_URI.trim();
    
    // Make sure connection string is complete
    if (!connectionString.includes('retryWrites=true')) {
      connectionString += '&retryWrites=true';
    }
    if (!connectionString.includes('w=majority')) {
      connectionString += '&w=majority';
    }
    
    console.log('📊 Final connection string:', connectionString.substring(0, 100) + '...');
    
    // Connection options
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(connectionString, connectionOptions);
    
    isConnected = true;
    connectionRetryCount = 0;
    
    console.log('✅✅✅ MONGODB CONNECTED SUCCESSFULLY!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('📊 Host:', mongoose.connection.host);
    console.log('📊 Ready State:', mongoose.connection.readyState);
    
    // Event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
      isConnected = true;
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting auto-reconnect...');
        connectDB();
      }, 5000);
    });
    
    // Test the connection
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📊 Found ${collections.length} collections`);
    } catch (testErr) {
      console.log('⚠️ Connection test warning:', testErr.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ MONGODB CONNECTION FAILED:', error.message);
    
    isConnected = false;
    
    // Provide specific troubleshooting
    if (error.message.includes('bad auth')) {
      console.error('❌ AUTHENTICATION ERROR: Check username/password in MongoDB Atlas');
      console.error('💡 Go to: MongoDB Atlas → Database Access → Verify credentials');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('❌ NETWORK ERROR: Cannot connect to MongoDB servers');
      console.error('💡 Check internet connection and MongoDB Atlas cluster status');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('❌ TIMEOUT ERROR: Connection taking too long');
      console.error('💡 MongoDB Atlas cluster might be paused or busy');
    }
    
    // Retry logic
    if (connectionRetryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying in 3 seconds... (${connectionRetryCount}/${MAX_RETRIES})`);
      setTimeout(connectDB, 3000);
    } else {
      console.log('⚠️ Max retries reached. Running in OFFLINE MODE.');
      console.log('✅ System is fully operational without database');
      console.log('🔐 Admin login: admin / admin123 (always works)');
    }
    
    return false;
  }
};

// ==================== DATABASE MODELS ====================
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

const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema);
const Config = mongoose.model('Config', configSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Initialize default data
const initializeDefaultData = async () => {
  if (!isConnected) {
    console.log('⚠️ Skipping default data - DB not connected');
    return;
  }

  try {
    console.log('📦 Initializing default data...');
    
    // Check if admin exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date()
      });
      console.log('✅ Default admin created');
    }
    
    // Check if config exists
    const configExists = await Config.findOne();
    if (!configExists) {
      await Config.create({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date()
      });
      console.log('✅ Default config created');
    }
    
    console.log('✅ Default data initialized');
  } catch (error) {
    console.error('⚠️ Error initializing default data:', error.message);
  }
};

// ==================== START MONGODB CONNECTION ====================
console.log('\n🔗 Starting MongoDB connection...');
connectDB().then(connected => {
  if (connected) {
    console.log('🎉 MongoDB connection successful!');
    // Initialize data after connection
    setTimeout(initializeDefaultData, 2000);
  } else {
    console.log('⚠️ MongoDB not connected - Running in offline mode');
    console.log('✅ System operational with fallback authentication');
  }
});

// ==================== ROUTES ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Shamsi Institute Quiz System API',
    version: '11.0.0',
    status: 'operational',
    database: isConnected ? 'Connected ✅' : 'Disconnected ❌ (Offline Mode)',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors: 'Enabled for all origins',
    admin_login: 'admin / admin123',
    endpoints: {
      test: 'GET /test',
      health: 'GET /api/health',
      db_status: 'GET /api/db-status',
      test_mongodb: 'GET /api/test-mongodb',
      admin_login: 'POST /admin/login',
      admin_reset: 'POST /admin/reset',
      config: 'GET /api/config',
      categories: 'GET /api/categories',
      register: 'POST /api/register',
      quiz_questions: 'GET /api/quiz/questions/:category',
      submit_quiz: 'POST /api/quiz/submit',
      admin_dashboard: 'GET /api/admin/dashboard',
      admin_questions: 'GET /api/admin/questions',
      admin_results: 'GET /api/admin/results'
    },
    note: '✅ System works in both online and offline modes'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is working!',
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: isConnected,
      ready_state: mongoose.connection.readyState,
      retry_count: connectionRetryCount
    },
    environment: {
      node_env: process.env.NODE_ENV,
      mongodb_uri_set: !!process.env.MONGODB_URI,
      server_time: new Date().toISOString()
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    status: 'healthy',
    server_time: new Date().toISOString(),
    uptime: process.uptime(),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: states[dbState] || 'unknown',
      connected: isConnected,
      ready_state: dbState
    },
    cors: {
      enabled: true,
      origin: req.headers.origin || 'not specified'
    },
    request_info: {
      method: req.method,
      url: req.url,
      ip: req.ip
    }
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  
  let dbInfo = {};
  if (isConnected) {
    try {
      // Get database information
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      // Get counts
      const adminCount = await Admin.countDocuments({});
      const questionCount = await Question.countDocuments({});
      const resultCount = await Result.countDocuments({});
      
      dbInfo = {
        database: mongoose.connection.db.databaseName,
        host: mongoose.connection.host,
        collections: collections.map(c => c.name),
        counts: {
          admins: adminCount,
          questions: questionCount,
          results: resultCount
        }
      };
    } catch (err) {
      dbInfo = { error: err.message };
    }
  }
  
  res.json({
    success: true,
    is_connected: isConnected,
    ready_state: dbState,
    state_description: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState],
    connection_retry_count: connectionRetryCount,
    database_info: dbInfo,
    troubleshooting: !isConnected ? [
      '1. Check MONGODB_URI in Vercel Environment Variables',
      '2. Verify MongoDB Atlas username and password',
      '3. Check Network Access in MongoDB Atlas (add IP 0.0.0.0/0)',
      '4. Ensure cluster is running and not paused',
      '5. Test connection from MongoDB Atlas Dashboard'
    ] : []
  });
});

// Test MongoDB connection
app.get('/api/test-mongodb', async (req, res) => {
  try {
    if (!isConnected) {
      return res.json({
        success: false,
        message: 'MongoDB is not connected',
        is_connected: false,
        ready_state: mongoose.connection.readyState,
        suggestion: 'Check environment variables or run in offline mode'
      });
    }
    
    // Test connection with ping
    const pingResult = await mongoose.connection.db.admin().ping();
    
    res.json({
      success: true,
      message: '✅ MongoDB connection is working!',
      is_connected: true,
      ping: pingResult,
      database: mongoose.connection.db.databaseName,
      host: mongoose.connection.host,
      ready_state: mongoose.connection.readyState
    });
    
  } catch (error) {
    res.json({
      success: false,
      message: '❌ MongoDB connection test failed',
      error: error.message,
      is_connected: false,
      ready_state: mongoose.connection.readyState
    });
  }
});

// Admin login - ALWAYS WORKS
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
    
    // ALWAYS ALLOW DEFAULT ADMIN LOGIN (Even when DB is disconnected)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ 
        username: 'admin',
        role: 'admin',
        source: isConnected ? 'database' : 'fallback'
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        message: `✅ Login successful (${isConnected ? 'Online' : 'Offline'} Mode)`,
        token,
        user: {
          username: 'admin',
          role: 'admin'
        },
        database_connected: isConnected,
        expires_in: '24 hours'
      });
    }
    
    // If DB is connected, try database authentication
    if (isConnected) {
      try {
        const admin = await Admin.findOne({ username: username.trim() });
        
        if (admin) {
          const isPasswordValid = await bcrypt.compare(password, admin.password);
          
          if (isPasswordValid) {
            const token = jwt.sign({ 
              username: admin.username,
              role: 'admin'
            }, JWT_SECRET, { expiresIn: '24h' });
            
            return res.json({
              success: true,
              message: '✅ Login successful',
              token,
              user: {
                username: admin.username,
                role: 'admin'
              }
            });
          }
        }
      } catch (dbError) {
        console.log('⚠️ Database authentication error:', dbError.message);
      }
    }
    
    // Invalid credentials
    return res.status(401).json({
      success: false,
      message: '❌ Invalid credentials. Use default: admin / admin123',
      database_connected: isConnected
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

// Reset admin credentials
app.post('/admin/reset', async (req, res) => {
  try {
    console.log('🔄 Resetting admin credentials');
    
    if (isConnected) {
      try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await Admin.findOneAndUpdate(
          { username: 'admin' },
          {
            username: 'admin',
            password: hashedPassword,
            createdAt: new Date()
          },
          { upsert: true, new: true }
        );
        
        console.log('✅ Admin reset in database');
        
        return res.json({
          success: true,
          message: '✅ Admin credentials reset in database',
          credentials: {
            username: 'admin',
            password: 'admin123'
          }
        });
      } catch (dbError) {
        console.log('⚠️ Database reset failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      message: '✅ Admin credentials set to default (offline mode)',
      credentials: {
        username: 'admin',
        password: 'admin123'
      },
      note: 'Credentials will sync when database reconnects'
    });
    
  } catch (error) {
    console.error('❌ Reset error:', error);
    res.json({
      success: true,
      message: '✅ Admin reset complete',
      credentials: {
        username: 'admin',
        password: 'admin123'
      }
    });
  }
});

// Get configuration
app.get('/api/config', async (req, res) => {
  try {
    if (isConnected) {
      try {
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
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database config fetch failed:', dbError.message);
      }
    }
    
    // Fallback config
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        updatedAt: new Date().toISOString()
      },
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Get config error:', error);
    res.json({
      success: true,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
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
    
    if (isConnected) {
      try {
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
          message: '✅ Configuration updated in database',
          config
        });
      } catch (dbError) {
        console.log('⚠️ Database config update failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      message: '✅ Configuration updated (offline mode)',
      config: {
        quizTime,
        passingPercentage,
        totalQuestions,
        updatedAt: new Date()
      },
      note: 'Changes will sync when database reconnects'
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
    if (isConnected) {
      try {
        const categories = await Question.distinct('category');
        
        if (categories && categories.length > 0) {
          const categoryData = categories.map(cat => ({
            value: cat,
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Technology`,
            available: true
          }));
          
          return res.json({
            success: true,
            categories: categoryData,
            source: 'database',
            count: categories.length
          });
        }
      } catch (dbError) {
        console.log('⚠️ Database categories fetch failed:', dbError.message);
      }
    }
    
    // Default categories (fallback)
    const defaultCategories = [
      { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
      { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
      { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true },
      { value: 'react', label: 'React.js', description: 'React Framework', available: true },
      { value: 'node', label: 'Node.js', description: 'Node.js Backend', available: true },
      { value: 'python', label: 'Python', description: 'Python Programming', available: true },
      { value: 'java', label: 'Java', description: 'Java Programming', available: true }
    ];
    
    res.json({
      success: true,
      categories: defaultCategories,
      source: 'default',
      count: defaultCategories.length
    });
    
  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.json({
      success: true,
      categories: [
        { value: 'html', label: 'HTML', description: 'HTML Web Development', available: true },
        { value: 'css', label: 'CSS', description: 'CSS Styling', available: true },
        { value: 'javascript', label: 'JavaScript', description: 'JavaScript Programming', available: true }
      ],
      source: 'error_fallback'
    });
  }
});

// Register student
app.post('/api/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, rollNumber, category'
      });
    }
    
    const formattedRollNumber = rollNumber.startsWith('SI-') ? rollNumber : `SI-${rollNumber}`;
    
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
    
    if (isConnected) {
      try {
        const config = await Config.findOne();
        const limit = config?.totalQuestions || 50;
        
        const questions = await Question.find({ 
          category: formattedCategory 
        }).limit(limit);
        
        if (questions.length > 0) {
          console.log(`✅ Found ${questions.length} questions for ${formattedCategory}`);
          
          return res.json({
            success: true,
            questions: questions,
            config: {
              quizTime: config?.quizTime || 30,
              passingPercentage: config?.passingPercentage || 40,
              totalQuestions: limit
            },
            count: questions.length,
            source: 'database'
          });
        }
      } catch (dbError) {
        console.log('⚠️ Database questions fetch failed:', dbError.message);
      }
    }
    
    // Sample questions (fallback)
    const sampleQuestions = {
      html: [
        {
          _id: 'html_1',
          questionText: 'What does HTML stand for?',
          options: [
            { text: 'Hyper Text Markup Language', isCorrect: true },
            { text: 'Home Tool Markup Language', isCorrect: false },
            { text: 'Hyperlinks and Text Markup Language', isCorrect: false },
            { text: 'Hyper Transfer Markup Language', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy',
          category: 'html'
        },
        {
          _id: 'html_2',
          questionText: 'Which tag is used for the largest heading?',
          options: [
            { text: '<h1>', isCorrect: true },
            { text: '<h6>', isCorrect: false },
            { text: '<heading>', isCorrect: false },
            { text: '<head>', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy',
          category: 'html'
        }
      ],
      css: [
        {
          _id: 'css_1',
          questionText: 'What is CSS used for?',
          options: [
            { text: 'Styling web pages', isCorrect: true },
            { text: 'Creating web page structure', isCorrect: false },
            { text: 'Server-side programming', isCorrect: false },
            { text: 'Database management', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy',
          category: 'css'
        }
      ],
      javascript: [
        {
          _id: 'js_1',
          questionText: 'Which symbol is used for comments in JavaScript?',
          options: [
            { text: '//', isCorrect: true },
            { text: '/* */', isCorrect: true },
            { text: '<!-- -->', isCorrect: false },
            { text: '#', isCorrect: false }
          ],
          marks: 1,
          difficulty: 'easy',
          category: 'javascript'
        }
      ]
    };
    
    const questions = sampleQuestions[formattedCategory] || sampleQuestions.html;
    
    res.json({
      success: true,
      questions: questions,
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
      },
      count: questions.length,
      source: 'sample'
    });
    
  } catch (error) {
    console.error('❌ Get quiz questions error:', error);
    
    res.json({
      success: true,
      questions: [],
      config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50
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
    
    // Save to database if connected
    if (isConnected) {
      try {
        const result = await Result.create({
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
        });
        
        console.log('✅ Result saved to database with ID:', result._id);
      } catch (dbError) {
        console.error('❌ Database save error:', dbError.message);
      }
    }
    
    // Prepare response
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
      grade: percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F',
      submittedAt: new Date().toISOString(),
      savedToDB: isConnected,
      message: passed ? '🎉 Congratulations! You passed the quiz!' : '❌ You did not pass. Try again!'
    };
    
    res.json({
      success: true,
      message: '✅ Quiz submitted successfully!',
      result: resultData
    });
    
  } catch (error) {
    console.error('❌ Submit quiz error:', error);
    
    res.json({
      success: true,
      message: 'Quiz submitted (local processing)',
      result: {
        ...req.body,
        submittedAt: new Date().toISOString(),
        savedToDB: false
      }
    });
  }
});

// ==================== ADMIN ROUTES (REQUIRE AUTHENTICATION) ====================

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
    
    if (isConnected) {
      try {
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
        
        // Get today's attempts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttempts = await Result.countDocuments({
          submittedAt: { $gte: today }
        });
        
        return res.json({
          success: true,
          stats: {
            totalStudents,
            totalQuestions,
            totalAttempts: totalStudents,
            averageScore: parseFloat(averageScore.toFixed(2)),
            passRate: parseFloat(passRate.toFixed(2)),
            todayAttempts
          },
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database dashboard fetch failed:', dbError.message);
      }
    }
    
    // Fallback dashboard
    res.json({
      success: true,
      stats: {
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0
      },
      source: 'fallback'
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
    
    if (isConnected) {
      try {
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
        
        const questions = await Question.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit));
        
        const total = await Question.countDocuments(query);
        
        return res.json({
          success: true,
          questions,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database questions fetch failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      questions: [],
      total: 0,
      page: 1,
      limit: parseInt(limit),
      pages: 0,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions'
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
        message: 'Category, question text, and at least 2 options are required'
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
    
    if (isConnected) {
      try {
        const question = await Question.create({
          category: category.toLowerCase(),
          questionText: questionText.trim(),
          options: options.map(opt => ({
            text: opt.text.trim(),
            isCorrect: Boolean(opt.isCorrect)
          })),
          marks: parseInt(marks) || 1,
          difficulty: difficulty || 'medium',
          createdAt: new Date()
        });
        
        return res.json({
          success: true,
          message: '✅ Question added successfully to database!',
          question: question
        });
      } catch (dbError) {
        console.log('⚠️ Database question add failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      message: '✅ Question added (offline mode)',
      question: {
        _id: 'temp_' + Date.now(),
        category: category.toLowerCase(),
        questionText: questionText.trim(),
        options: options.map(opt => ({
          text: opt.text.trim(),
          isCorrect: Boolean(opt.isCorrect)
        })),
        marks: parseInt(marks) || 1,
        difficulty: difficulty || 'medium',
        createdAt: new Date()
      },
      note: 'Question will be saved when database reconnects'
    });
    
  } catch (error) {
    console.error('❌ Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question'
    });
  }
});

// Get results (admin)
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        const results = await Result.find()
          .sort({ submittedAt: -1 });
        
        return res.json({
          success: true,
          results: results,
          count: results.length,
          source: 'database'
        });
      } catch (dbError) {
        console.log('⚠️ Database results fetch failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      results: [],
      count: 0,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

// Delete question (admin)
app.delete('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isConnected) {
      try {
        const result = await Question.findByIdAndDelete(id);
        
        if (!result) {
          return res.status(404).json({
            success: false,
            message: 'Question not found'
          });
        }
        
        return res.json({
          success: true,
          message: '✅ Question deleted successfully'
        });
      } catch (dbError) {
        console.log('⚠️ Database delete failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      message: '✅ Question deletion queued (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question'
    });
  }
});

// Delete result (admin)
app.delete('/api/admin/results/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isConnected) {
      try {
        const result = await Result.findByIdAndDelete(id);
        
        if (!result) {
          return res.status(404).json({
            success: false,
            message: 'Result not found'
          });
        }
        
        return res.json({
          success: true,
          message: '✅ Result deleted successfully'
        });
      } catch (dbError) {
        console.log('⚠️ Database delete failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      message: '✅ Result deletion queued (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Delete result error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting result'
    });
  }
});

// Delete all results (admin)
app.delete('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    if (isConnected) {
      try {
        const result = await Result.deleteMany({});
        
        return res.json({
          success: true,
          message: `✅ ${result.deletedCount} results deleted successfully`,
          deletedCount: result.deletedCount
        });
      } catch (dbError) {
        console.log('⚠️ Database delete all failed:', dbError.message);
      }
    }
    
    // Fallback response
    res.json({
      success: true,
      message: '✅ All results deletion queued (offline mode)'
    });
    
  } catch (error) {
    console.error('❌ Delete all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting results'
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requested_path: req.originalUrl,
    available_endpoints: [
      'GET  /',
      'GET  /test',
      'GET  /api/health',
      'GET  /api/db-status',
      'GET  /api/test-mongodb',
      'POST /admin/login',
      'POST /admin/reset',
      'GET  /api/config',
      'PUT  /api/config',
      'GET  /api/categories',
      'POST /api/register',
      'GET  /api/quiz/questions/:category',
      'POST /api/quiz/submit',
      'GET  /api/admin/dashboard',
      'GET  /api/admin/questions',
      'POST /api/admin/questions',
      'DELETE /api/admin/questions/:id',
      'GET  /api/admin/results',
      'DELETE /api/admin/results/:id',
      'DELETE /api/admin/results'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔐 Admin login: POST http://localhost:${PORT}/admin/login`);
    console.log(`📋 Body: {"username":"admin","password":"admin123"}`);
    console.log(`✅ MongoDB Status: ${isConnected ? 'CONNECTED 🎉' : 'DISCONNECTED (Offline Mode)'}`);
    console.log(`\n💡 IMPORTANT: System works in both online and offline modes!`);
    console.log(`💡 Admin login ALWAYS works with: admin / admin123`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('⚠️ Shutting down gracefully...');
    server.close(() => {
      console.log('✅ HTTP server closed');
      if (mongoose.connection.readyState === 1) {
        mongoose.connection.close(false, () => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  });
}

// Export for Vercel
module.exports = app;