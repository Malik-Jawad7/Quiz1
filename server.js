// ================= BACKEND - index.js =================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

// ========== ENV VARIABLES ==========
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_system';
const JWT_SECRET = process.env.JWT_SECRET || 'shamsi-institute-quiz-secret-key-2024';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://frontend-mocha-ten-85.vercel.app',
  'https://frontend-axeda0cz9-khalids-projects-3de9ee65.vercel.app',
  'https://frontend-9mu71kfeg-khalids-projects-3de9ee65.vercel.app',
  'https://*.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regexStr = '^' + allowedOrigin.replace(/\./g, '\\.').replace('*', '.*') + '$';
        return new RegExp(regexStr).test(origin);
      }
      return origin === allowedOrigin;
    });
    if (isAllowed) callback(null, true);
    else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.options('*', cors());

// ========== MIDDLEWARE ==========
app.use(express.json());

// ========== DATABASE CONNECTION ==========
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB connection error:', err.message));

// ========== SCHEMAS ==========
const UserSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  category: String,
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  category: { type: String, enum: ['html','css','javascript','react','node','mongodb','express','mern','python','fullstack'], required: true },
  questionText: { type: String, required: true },
  options: [{ text: String, isCorrect: { type: Boolean, default: false }, optionIndex: Number }],
  marks: { type: Number, default: 1, min: 1, max: 10 },
  difficulty: { type: String, default: 'medium', enum: ['easy','medium','hard'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  quizTime: { type: Number, default: 30 },
  passingPercentage: { type: Number, default: 40 },
  totalQuestions: { type: Number, default: 10 },
  maxMarks: { type: Number, default: 100 },
  updatedAt: { type: Date, default: Date.now }
});

// ========== MODELS ==========
const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);

// ========== INITIAL CONFIG ==========
const initializeConfig = async () => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
      console.log('✅ Default config initialized');
    }
  } catch (err) {
    console.log('⚠️ Error initializing config:', err.message);
  }
};
initializeConfig();

// ========== ADMIN TOKEN MIDDLEWARE ==========
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Not authorized as admin' });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ========== ROUTES ==========

// Root
app.get('/', (req, res) => {
  res.json({ message: '🚀 Quiz API Running', status: 'OK', timestamp: new Date() });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ success: true, db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected', timestamp: new Date() });
});

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    if (!name || !rollNumber || !category) return res.status(400).json({ success: false, message: 'All fields required' });

    let user = await User.findOne({ rollNumber });
    if (user) return res.status(400).json({ success: false, message: 'Roll number exists' });

    user = new User({ name, rollNumber, category: category.toLowerCase() });
    await user.save();
    res.json({ success: true, message: 'Registration successful', user });
  } catch (err) {
    console.log('📝 Registration error:', err.message);
    res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  }
});

// Get Questions
app.get('/api/user/questions/:category', async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    const config = await Config.findOne();
    const questions = await Question.find({ category }).limit(config.totalQuestions || 10);
    res.json({ success: true, questions, timeLimit: config.quizTime || 30 });
  } catch (err) {
    console.log('📝 Get questions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch questions', error: err.message });
  }
});

// Submit Quiz
app.post('/api/user/submit', async (req, res) => {
  try {
    const { userId, answers, category } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const questions = await Question.find({ category: category.toLowerCase() });
    let marksObtained = 0;
    let totalMarks = 0;

    questions.forEach(q => {
      const userAnswer = answers[q._id];
      const correctOption = q.options.find(o => o.isCorrect);
      if (userAnswer && correctOption && correctOption.text === userAnswer.selected) marksObtained += q.marks || 1;
      totalMarks += q.marks || 1;
    });

    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const config = await Config.findOne();
    const passed = percentage >= (config.passingPercentage || 40);

    Object.assign(user, { score: marksObtained, marksObtained, totalMarks, percentage, passed });
    await user.save();

    res.json({ success: true, score: marksObtained, totalMarks, percentage, passed });
  } catch (err) {
    console.log('📝 Submit quiz error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit quiz', error: err.message });
  }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ username, role: 'admin', isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } else res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Get All Questions (Admin)
app.get('/api/admin/questions', verifyAdminToken, async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  res.json({ success: true, questions });
});

// Add Question (Admin)
app.post('/api/admin/questions', verifyAdminToken, async (req, res) => {
  const { category, questionText, options, marks, difficulty } = req.body;
  const question = new Question({ category, questionText, options, marks, difficulty });
  await question.save();
  res.json({ success: true, message: 'Question added', question });
});

// Update Question (Admin)
app.put('/api/admin/questions/:id', verifyAdminToken, async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
  Object.assign(question, req.body, { updatedAt: new Date() });
  await question.save();
  res.json({ success: true, message: 'Question updated', question });
});

// Delete Question (Admin)
app.delete('/api/admin/questions/:id', verifyAdminToken, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Question deleted' });
});

// Get Config (Admin)
app.get('/api/admin/config', verifyAdminToken, async (req, res) => {
  let config = await Config.findOne();
  if (!config) config = await new Config().save();
  res.json({ success: true, config });
});

// Update Config (Admin)
app.put('/api/admin/config', verifyAdminToken, async (req, res) => {
  let config = await Config.findOne();
  Object.assign(config, req.body, { updatedAt: new Date() });
  await config.save();
  res.json({ success: true, message: 'Config updated', config });
});

// Get All Results (Admin)
app.get('/api/admin/results', verifyAdminToken, async (req, res) => {
  const results = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, results });
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', verifyAdminToken, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Result deleted' });
});

// 404 Handler
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ========== SERVER ==========
if (process.env.VERCEL) {
  module.exports = app; // For Vercel serverless
} else {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
