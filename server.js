const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

// ========== IMPROVED CORS CONFIGURATION FOR VERCEL ==========
const allowedOrigins = [
    // Local development
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    
    // Your Vercel frontend URLs
    'https://frontend-mocha-ten-85.vercel.app',
    'https://frontend-axeda0cz9-khalids-projects-3de9ee65.vercel.app',
    'https://frontend-9mu71kfeg-khalids-projects-3de9ee65.vercel.app',
    
    // Your Vercel backend URLs (if needed)
    'https://backend-malik-jawad7-khalids-projects-3de9ee65.vercel.app',
    'https://backend-bhxg2tixi-khalids-projects-3de9ee65.vercel.app',
    'https://backend-eight-chi-14.vercel.app',
    
    // Wildcard for all Vercel deployments
    'https://*.vercel.app'
];

// Enhanced CORS middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            // Handle wildcard domains
            if (allowedOrigin.includes('*')) {
                const regex = new RegExp(allowedOrigin.replace('*', '.*'));
                return regex.test(origin);
            }
            return origin === allowedOrigin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
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

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0';
        
        console.log('🔌 Attempting MongoDB connection...');
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.log('❌ MongoDB Connection Error:', err.message);
        console.log('📝 Running in demo mode - Some features may be limited');
    }
};

connectDB();

// Database Models
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
    category: {
        type: String,
        enum: ['html', 'css', 'javascript', 'react', 'node', 'mongodb', 'express', 'mern', 'python', 'fullstack'],
        required: true
    },
    questionText: {
        type: String,
        required: true
    },
    options: [{
        text: String,
        isCorrect: { type: Boolean, default: false },
        optionIndex: Number
    }],
    marks: { 
        type: Number, 
        default: 1,
        min: 1,
        max: 10
    },
    difficulty: { 
        type: String, 
        default: 'medium',
        enum: ['easy', 'medium', 'hard']
    },
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

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Config = mongoose.model('Config', ConfigSchema);

// Initialize Config
const initializeConfig = async () => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = new Config();
            await config.save();
            console.log('✅ Config initialized');
        }
    } catch (error) {
        console.log('⚠️ Error initializing config:', error.message);
    }
};

initializeConfig();

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shamsi-institute-quiz-secret-key-2024');
        
        if (!decoded.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized as admin'
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// ========== ROUTES ==========

// ✅ Root Route - FIXED FOR VERCEL
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Shamsi Institute Quiz System API',
        status: 'Running ✅',
        version: '1.0.0',
        deployed: true,
        timestamp: new Date().toISOString(),
        cors: {
            allowedOrigins: allowedOrigins,
            clientOrigin: req.headers.origin || 'No origin'
        },
        environment: process.env.NODE_ENV || 'development',
        endpoints: [
            'GET  /',
            'GET  /api/health',
            'GET  /api/config',
            'POST /api/auth/register',
            'GET  /api/user/questions/:category',
            'POST /api/user/submit',
            'POST /api/admin/login',
            'GET  /api/admin/questions',
            'POST /api/admin/questions',
            'PUT  /api/admin/questions/:id',
            'DELETE /api/admin/questions/:id',
            'GET  /api/admin/results',
            'GET  /api/admin/dashboard',
            'GET  /api/admin/config',
            'PUT  /api/admin/config',
            'DELETE /api/admin/results/:id',
            'DELETE /api/admin/results'
        ]
    });
});

// ✅ Health Check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌';
    
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development',
        cors: {
            origin: req.headers.origin || 'Not specified',
            allowed: true
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
    });
});

// ✅ Get Config (Public)
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
                quizTime: config.quizTime || 30,
                passingPercentage: config.passingPercentage || 40,
                totalQuestions: config.totalQuestions || 10,
                maxMarks: config.maxMarks || 100,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('Config error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching config'
        });
    }
});

// ✅ User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registration request received:', req.body);
        const { name, rollNumber, category } = req.body;
        
        if (!name || !rollNumber || !category) {
            return res.status(400).json({
                success: false,
                message: 'Name, roll number, and category are required'
            });
        }
        
        try {
            const existingUser = await User.findOne({ rollNumber });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Roll number already exists'
                });
            }
            
            const user = new User({
                name,
                rollNumber,
                category: category.toLowerCase()
            });
            
            await user.save();
            
            res.json({
                success: true,
                message: 'Registration successful',
                user: {
                    _id: user._id,
                    name: user.name,
                    rollNumber: user.rollNumber,
                    category: user.category
                }
            });
        } catch (dbError) {
            console.log('📝 DB offline, using demo mode');
            res.json({
                success: true,
                message: 'Registration successful (demo mode)',
                user: {
                    _id: 'demo-' + Date.now(),
                    name: name,
                    rollNumber: rollNumber,
                    category: category.toLowerCase()
                }
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// ✅ Get Questions for Student
app.get('/api/user/questions/:category', async (req, res) => {
    try {
        const category = req.params.category.toLowerCase();
        console.log(`📝 Fetching questions for category: ${category}`);
        
        try {
            const config = await Config.findOne();
            const questions = await Question.find({ category });
            
            if (questions.length === 0) {
                console.log(`📝 No questions in DB for ${category}, returning demo questions`);
                const demoQuestions = getDemoQuestions(category);
                
                return res.json({
                    success: true,
                    questions: demoQuestions,
                    timeLimit: config?.quizTime || 30,
                    totalQuestions: demoQuestions.length,
                    categoryInfo: {
                        name: category.toUpperCase(),
                        totalQuestions: demoQuestions.length
                    }
                });
            }
            
            const totalQuestionsToShow = Math.min(questions.length, config?.totalQuestions || 10);
            // Shuffle questions
            const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
            const limitedQuestions = shuffledQuestions.slice(0, totalQuestionsToShow);
            
            console.log(`📝 Returning ${limitedQuestions.length} questions for ${category}`);
            
            res.json({
                success: true,
                questions: limitedQuestions.map(q => ({
                    _id: q._id,
                    questionText: q.questionText,
                    options: q.options.map(opt => ({
                        text: opt.text,
                        isCorrect: opt.isCorrect
                    })),
                    marks: q.marks,
                    difficulty: q.difficulty
                })),
                timeLimit: config?.quizTime || 30,
                totalQuestions: totalQuestionsToShow,
                categoryInfo: {
                    name: category.toUpperCase(),
                    totalQuestions: questions.length
                }
            });
        } catch (dbError) {
            console.log('📝 DB offline, returning demo questions');
            const demoQuestions = getDemoQuestions(category);
            
            res.json({
                success: true,
                questions: demoQuestions,
                timeLimit: 30,
                totalQuestions: demoQuestions.length,
                categoryInfo: {
                    name: category.toUpperCase(),
                    totalQuestions: demoQuestions.length
                }
            });
        }
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load questions',
            error: error.message
        });
    }
});

// Helper function for demo questions
function getDemoQuestions(category) {
    const allQuestions = {
        html: [
            {
                _id: '1',
                questionText: 'What does HTML stand for?',
                options: [
                    { text: 'Hyper Text Markup Language', isCorrect: true },
                    { text: 'Hyper Transfer Markup Language', isCorrect: false },
                    { text: 'High Tech Modern Language', isCorrect: false },
                    { text: 'Home Tool Markup Language', isCorrect: false }
                ],
                marks: 1,
                difficulty: 'easy'
            },
            {
                _id: '2',
                questionText: 'Which HTML tag is used for the largest heading?',
                options: [
                    { text: '<h1>', isCorrect: true },
                    { text: '<h6>', isCorrect: false },
                    { text: '<head>', isCorrect: false },
                    { text: '<header>', isCorrect: false }
                ],
                marks: 1,
                difficulty: 'easy'
            }
        ],
        css: [
            {
                _id: '3',
                questionText: 'What does CSS stand for?',
                options: [
                    { text: 'Cascading Style Sheets', isCorrect: true },
                    { text: 'Computer Style Sheets', isCorrect: false },
                    { text: 'Creative Style System', isCorrect: false },
                    { text: 'Colorful Style Sheets', isCorrect: false }
                ],
                marks: 1,
                difficulty: 'easy'
            }
        ],
        javascript: [
            {
                _id: '4',
                questionText: 'Which keyword is used to declare a variable in JavaScript?',
                options: [
                    { text: 'var', isCorrect: true },
                    { text: 'int', isCorrect: false },
                    { text: 'string', isCorrect: false },
                    { text: 'variable', isCorrect: false }
                ],
                marks: 1,
                difficulty: 'easy'
            }
        ],
        python: [
            {
                _id: '5',
                questionText: 'What is Python used for?',
                options: [
                    { text: 'Web development, data analysis, AI', isCorrect: true },
                    { text: 'Only game development', isCorrect: false },
                    { text: 'Only mobile apps', isCorrect: false },
                    { text: 'Only database management', isCorrect: false }
                ],
                marks: 1,
                difficulty: 'easy'
            }
        ]
    };
    
    return allQuestions[category] || allQuestions.html;
}

// ✅ Submit Quiz - FIXED VERSION
app.post('/api/user/submit', async (req, res) => {
    try {
        console.log('📝 Submit quiz request received:', JSON.stringify(req.body, null, 2));
        
        const { userId, answers, category, timeSpent } = req.body;
        
        // Check if this is a direct result submission from frontend
        const { userName, rollNumber, score, totalMarks, percentage, passed, totalQuestions, attempted } = req.body;
        
        // If direct result data is provided, use it
        if (userName && rollNumber && score !== undefined) {
            console.log('📝 Direct result submission detected');
            
            try {
                // Check if user exists
                let user = await User.findOne({ rollNumber });
                
                if (!user) {
                    // Create new user
                    user = new User({
                        name: userName,
                        rollNumber: rollNumber,
                        category: category || 'general',
                        score: score || 0,
                        percentage: percentage || 0,
                        marksObtained: score || 0,
                        totalMarks: totalMarks || 100,
                        passed: passed || false,
                        createdAt: new Date()
                    });
                } else {
                    // Update existing user
                    user.score = score || 0;
                    user.percentage = percentage || 0;
                    user.marksObtained = score || 0;
                    user.totalMarks = totalMarks || 100;
                    user.passed = passed || false;
                }
                
                await user.save();
                
                console.log(`📝 Result saved for ${userName}: Score=${score}, Percentage=${percentage}%`);
                
                return res.json({
                    success: true,
                    score: score,
                    marksObtained: score,
                    totalMarks: totalMarks || 100,
                    percentage: parseFloat(percentage) || 0,
                    totalQuestions: totalQuestions || 0,
                    passed: passed || false,
                    category: category || 'general',
                    grade: passed ? 'PASS' : 'FAIL',
                    timeSpent: timeSpent || 0
                });
                
            } catch (dbError) {
                console.log('📝 DB offline, using demo mode for submission');
                
                return res.json({
                    success: true,
                    score: score || 0,
                    marksObtained: score || 0,
                    totalMarks: totalMarks || 100,
                    percentage: parseFloat(percentage) || 0,
                    totalQuestions: totalQuestions || 0,
                    passed: passed || false,
                    category: category || 'general',
                    grade: passed ? 'PASS' : 'FAIL',
                    timeSpent: timeSpent || 0
                });
            }
        }
        
        // Original logic for userId-based submission
        try {
            // Find the user
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Get questions for the category
            const questions = await Question.find({ category: category.toLowerCase() });
            const config = await Config.findOne();
            const totalQuestions = Math.min(questions.length, config?.totalQuestions || 10);
            
            let score = 0;
            let marksObtained = 0;
            let totalPossibleMarks = 0;
            
            // Calculate score
            for (let i = 0; i < totalQuestions; i++) {
                const question = questions[i];
                const userAnswer = answers[question._id];
                const questionMarks = question.marks || 1;
                totalPossibleMarks += questionMarks;
                
                if (userAnswer) {
                    const correctOption = question.options.find(opt => opt.isCorrect);
                    if (correctOption && correctOption.text === userAnswer.selected) {
                        score += 1;
                        marksObtained += questionMarks;
                    }
                }
            }
            
            const percentage = totalPossibleMarks > 0 ? (marksObtained / totalPossibleMarks) * 100 : 0;
            const passed = percentage >= (config?.passingPercentage || 40);
            
            console.log(`📝 Quiz results: Score=${score}, Percentage=${percentage.toFixed(2)}%, Passed=${passed}`);
            
            // Update user record
            user.score = score;
            user.percentage = percentage;
            user.marksObtained = marksObtained;
            user.totalMarks = totalPossibleMarks;
            user.passed = passed;
            await user.save();
            
            res.json({
                success: true,
                score,
                marksObtained,
                totalMarks: totalPossibleMarks,
                percentage: percentage.toFixed(2),
                totalQuestions,
                passed,
                category: category || 'html',
                grade: passed ? 'PASS' : 'FAIL',
                timeSpent: timeSpent || 0
            });
            
        } catch (dbError) {
            console.log('📝 DB offline, using demo mode for submission');
            const demoQuestions = getDemoQuestions(category || 'html');
            
            let score = 0;
            let marksObtained = 0;
            let totalPossibleMarks = demoQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            
            for (const question of demoQuestions) {
                const userAnswer = answers[question._id];
                const questionMarks = question.marks || 1;
                
                if (userAnswer) {
                    const correctOption = question.options.find(opt => opt.isCorrect);
                    if (correctOption && correctOption.text === userAnswer.selected) {
                        score += 1;
                        marksObtained += questionMarks;
                    }
                }
            }
            
            const percentage = totalPossibleMarks > 0 ? (marksObtained / totalPossibleMarks) * 100 : 0;
            const passed = percentage >= 40;
            
            res.json({
                success: true,
                score,
                marksObtained,
                totalMarks: totalPossibleMarks,
                percentage: percentage.toFixed(2),
                totalQuestions: demoQuestions.length,
                passed,
                category: category || 'html',
                grade: passed ? 'PASS' : 'FAIL',
                timeSpent: timeSpent || 0
            });
        }
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit quiz',
            error: error.message
        });
    }
});

// ========== ADMIN ROUTES ==========

// ✅ Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('📝 Admin login attempt:', { username });
        
        // Simple authentication (for demo)
        const adminCredentials = {
            username: 'admin',
            password: 'admin123'
        };
        
        if (username === adminCredentials.username && password === adminCredentials.password) {
            const adminToken = jwt.sign(
                { 
                    username: 'admin',
                    role: 'admin',
                    isAdmin: true
                },
                process.env.JWT_SECRET || 'shamsi-institute-quiz-secret-key-2024',
                { expiresIn: '24h' }
            );
            
            console.log('✅ Admin login successful');
            
            res.json({
                success: true,
                message: 'Admin login successful',
                token: adminToken,
                user: {
                    username: 'admin',
                    role: 'admin'
                }
            });
        } else {
            console.log('❌ Invalid admin credentials');
            res.status(401).json({
                success: false,
                message: 'Invalid credentials. Use username: admin, password: admin123'
            });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Admin login failed',
            error: error.message
        });
    }
});

// ✅ Get All Questions (Admin) - Protected
app.get('/api/admin/questions', verifyAdminToken, async (req, res) => {
    try {
        console.log('📝 Fetching all questions for admin');
        const questions = await Question.find().sort({ category: 1, createdAt: -1 });
        
        res.json({
            success: true,
            count: questions.length,
            questions: questions.map(q => ({
                _id: q._id,
                category: q.category,
                questionText: q.questionText,
                options: q.options.map(opt => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    optionIndex: opt.optionIndex
                })),
                marks: q.marks || 1,
                difficulty: q.difficulty || 'medium',
                createdAt: q.createdAt,
                updatedAt: q.updatedAt
            }))
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch questions',
            error: error.message
        });
    }
});

// ✅ Add Question (Admin) - Protected
app.post('/api/admin/questions', verifyAdminToken, async (req, res) => {
    try {
        console.log('📝 Add question request:', req.body);
        const { category, questionText, options, marks, difficulty } = req.body;
        
        // Validation
        if (!category || !questionText || !options) {
            return res.status(400).json({
                success: false,
                message: 'Category, question text, and options are required'
            });
        }
        
        const validOptions = options.filter(opt => opt.text && opt.text.trim() !== '');
        if (validOptions.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'At least 2 options are required'
            });
        }
        
        const hasCorrectOption = validOptions.some(opt => opt.isCorrect);
        if (!hasCorrectOption) {
            return res.status(400).json({
                success: false,
                message: 'At least one option must be marked as correct'
            });
        }
        
        try {
            const question = new Question({
                category: category.toLowerCase(),
                questionText: questionText.trim(),
                options: validOptions.map((opt, index) => ({
                    text: opt.text.trim(),
                    isCorrect: opt.isCorrect,
                    optionIndex: index + 1
                })),
                marks: marks || 1,
                difficulty: difficulty || 'medium'
            });
            
            await question.save();
            
            console.log('✅ Question saved to database:', question._id);
            
            res.json({
                success: true,
                message: 'Question added successfully',
                question: {
                    _id: question._id,
                    category: question.category,
                    questionText: question.questionText,
                    options: question.options,
                    marks: question.marks,
                    difficulty: question.difficulty
                }
            });
        } catch (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
        }
    } catch (error) {
        console.error('Add question error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add question',
            error: error.message
        });
    }
});

// ✅ Update Question (Admin) - Protected
app.put('/api/admin/questions/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { questionText, options, marks, difficulty, category } = req.body;
        
        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        // Update fields
        if (questionText) question.questionText = questionText;
        if (options) {
            question.options = options.map((opt, index) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                optionIndex: index + 1
            }));
        }
        if (marks) question.marks = marks;
        if (difficulty) question.difficulty = difficulty;
        if (category) question.category = category;
        question.updatedAt = new Date();
        
        await question.save();
        
        res.json({
            success: true,
            message: 'Question updated successfully',
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
        console.error('Update question error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update question',
            error: error.message
        });
    }
});

// ✅ Delete Question (Admin) - Protected
app.delete('/api/admin/questions/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        await Question.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete question',
            error: error.message
        });
    }
});

// ✅ Get Results (Admin) - Protected - FIXED VERSION
app.get('/api/admin/results', verifyAdminToken, async (req, res) => {
    try {
        const results = await User.find().sort({ createdAt: -1 });
        const config = await Config.findOne();
        const passingPercentage = config?.passingPercentage || 40;
        
        const formattedResults = results.map(r => {
            const percentage = parseFloat(r.percentage) || 0;
            const passed = percentage >= passingPercentage;
            
            return {
                _id: r._id,
                name: r.name,
                rollNumber: r.rollNumber,
                category: r.category,
                score: r.score || 0,
                percentage: percentage,
                marksObtained: r.marksObtained || 0,
                totalMarks: r.totalMarks || 0,
                passed: passed,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            };
        });
        
        res.json({
            success: true,
            count: formattedResults.length,
            results: formattedResults
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch results',
            error: error.message
        });
    }
});

// ✅ Add Result Manually (Admin) - NEW ROUTE
app.post('/api/admin/results', verifyAdminToken, async (req, res) => {
    try {
        const { name, rollNumber, category, score, totalMarks } = req.body;
        
        if (!name || !rollNumber || !category || score === undefined || totalMarks === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Calculate percentage
        const percentage = (score / totalMarks) * 100;
        const config = await Config.findOne();
        const passingPercentage = config?.passingPercentage || 40;
        const passed = percentage >= passingPercentage;
        
        // Check if user exists
        let user = await User.findOne({ rollNumber });
        
        if (user) {
            // Update existing user
            user.name = name;
            user.category = category;
            user.score = score;
            user.percentage = percentage;
            user.marksObtained = score;
            user.totalMarks = totalMarks;
            user.passed = passed;
        } else {
            // Create new user
            user = new User({
                name,
                rollNumber,
                category,
                score,
                percentage,
                marksObtained: score,
                totalMarks,
                passed
            });
        }
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Result saved successfully',
            result: {
                _id: user._id,
                name: user.name,
                rollNumber: user.rollNumber,
                category: user.category,
                score: user.score,
                percentage: user.percentage,
                marksObtained: user.marksObtained,
                totalMarks: user.totalMarks,
                passed: user.passed,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Add result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add result',
            error: error.message
        });
    }
});

// ✅ Get Dashboard Stats (Admin) - Protected
app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalQuestions = await Question.countDocuments();
        
        // Get all users with scores
        const usersWithScores = await User.find({ score: { $gt: 0 } });
        const totalResults = usersWithScores.length;
        
        // Calculate average percentage
        const totalPercentage = usersWithScores.reduce((sum, u) => sum + (u.percentage || 0), 0);
        const averageScore = usersWithScores.length > 0 ? (totalPercentage / usersWithScores.length).toFixed(2) : 0;
        
        // Get config for passing percentage
        const config = await Config.findOne();
        const passingPercentage = config?.passingPercentage || 40;
        
        // Calculate pass rate
        const passedCount = usersWithScores.filter(u => (u.percentage || 0) >= passingPercentage).length;
        const passRate = usersWithScores.length > 0 ? ((passedCount / usersWithScores.length) * 100).toFixed(2) : 0;
        
        // Today's attempts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttempts = await User.countDocuments({
            createdAt: { $gte: today }
        });
        
        // Get unique categories count
        const categories = await Question.distinct('category');
        
        // Get active students (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUsers = await User.find({
            createdAt: { $gte: sevenDaysAgo }
        });
        const activeStudents = new Set(recentUsers.map(u => u._id.toString())).size;
        
        // Get category-wise stats
        const categoryStats = {};
        const allCategories = ['html', 'css', 'javascript', 'react', 'node', 'mongodb', 'express', 'mern', 'python', 'fullstack'];
        
        for (const cat of allCategories) {
            const catQuestions = await Question.countDocuments({ category: cat });
            const catResults = await User.countDocuments({ category: cat, score: { $gt: 0 } });
            
            categoryStats[cat] = {
                questions: catQuestions,
                attempts: catResults,
                percentage: totalUsers > 0 ? ((catResults / totalUsers) * 100).toFixed(2) : 0
            };
        }
        
        res.json({
            success: true,
            stats: {
                totalStudents: totalUsers || 0,
                totalQuestions: totalQuestions || 0,
                totalAttempts: totalResults || 0,
                averageScore: parseFloat(averageScore) || 0,
                passRate: parseFloat(passRate) || 0,
                todayAttempts: todayAttempts || 0,
                totalCategories: categories.length || 0,
                activeStudents: activeStudents || 0,
                categoryStats: categoryStats
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
});

// ✅ Get Admin Config (Admin) - Protected
app.get('/api/admin/config', verifyAdminToken, async (req, res) => {
    try {
        console.log('📝 Fetching admin config');
        let config = await Config.findOne();
        
        if (!config) {
            console.log('No config found, creating default');
            // Create default config if doesn't exist
            config = new Config({
                quizTime: 30,
                passingPercentage: 40,
                totalQuestions: 50,
                maxMarks: 100
            });
            await config.save();
        }
        
        res.json({
            success: true,
            config: {
                quizTime: config.quizTime || 30,
                passingPercentage: config.passingPercentage || 40,
                totalQuestions: config.totalQuestions || 50,
                maxMarks: config.maxMarks || 100,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('Get admin config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configuration',
            error: error.message
        });
    }
});

// ✅ Update Admin Config (Admin) - Protected
app.put('/api/admin/config', verifyAdminToken, async (req, res) => {
    try {
        const { quizTime, passingPercentage, totalQuestions, maxMarks } = req.body;
        
        console.log('📝 Updating admin config:', req.body);
        
        let config = await Config.findOne();
        if (!config) {
            config = new Config();
        }
        
        if (quizTime !== undefined) config.quizTime = quizTime;
        if (passingPercentage !== undefined) config.passingPercentage = passingPercentage;
        if (totalQuestions !== undefined) config.totalQuestions = totalQuestions;
        if (maxMarks !== undefined) config.maxMarks = maxMarks;
        config.updatedAt = new Date();
        
        await config.save();
        
        res.json({
            success: true,
            message: 'Configuration updated successfully',
            config: {
                quizTime: config.quizTime,
                passingPercentage: config.passingPercentage,
                totalQuestions: config.totalQuestions,
                maxMarks: config.maxMarks || 100,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('Update admin config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update configuration',
            error: error.message
        });
    }
});

// ✅ Delete Single Result (Admin) - Protected
app.delete('/api/admin/results/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await User.findById(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Result not found'
            });
        }
        
        await User.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Result deleted successfully'
        });
    } catch (error) {
        console.error('Delete result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete result',
            error: error.message
        });
    }
});

// ✅ Delete All Results (Admin) - Protected
app.delete('/api/admin/results', verifyAdminToken, async (req, res) => {
    try {
        await User.deleteMany({});
        
        res.json({
            success: true,
            message: 'All results deleted successfully'
        });
    } catch (error) {
        console.error('Delete all results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete all results',
            error: error.message
        });
    }
});

// Test Route (for debugging)
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        clientOrigin: req.headers.origin || 'No origin header',
        corsAllowed: true,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version
    });
});

// Test Database Connection
app.get('/api/test-db', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState;
        const statusText = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        const questionCount = await Question.countDocuments();
        const userCount = await User.countDocuments();
        
        res.json({
            success: true,
            dbStatus: statusText[dbStatus] || 'unknown',
            dbState: dbStatus,
            questionCount,
            userCount,
            connection: mongoose.connection ? 'Mongoose instance exists' : 'No mongoose connection'
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
    res.json({
        success: true,
        message: 'CORS is working!',
        origin: req.headers.origin,
        allowed: true,
        timestamp: new Date().toISOString()
    });
});

// 404 Handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
        clientOrigin: req.headers.origin || 'No origin header',
        available_routes: [
            'GET  /',
            'GET  /api/health',
            'GET  /api/config',
            'GET  /api/test',
            'GET  /api/test-db',
            'GET  /api/test-cors',
            'POST /api/auth/register',
            'GET  /api/user/questions/:category',
            'POST /api/user/submit',
            'POST /api/admin/login',
            'GET  /api/admin/questions',
            'POST /api/admin/questions',
            'PUT  /api/admin/questions/:id',
            'DELETE /api/admin/questions/:id',
            'GET  /api/admin/results',
            'POST /api/admin/results',
            'GET  /api/admin/dashboard',
            'GET  /api/admin/config',
            'PUT  /api/admin/config',
            'DELETE /api/admin/results/:id',
            'DELETE /api/admin/results'
        ]
    });
});

// Server Start - IMPORTANT FOR VERCEL
const PORT = process.env.PORT || 5000;

// For Vercel, we need to export the app
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.log('🚀 Running in Vercel production mode');
    module.exports = app;
} else {
    // Local development
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API URL: http://localhost:${PORT}`);
        console.log(`✅ Health Check: http://localhost:${PORT}/api/health`);
        console.log(`✅ Test CORS: http://localhost:${PORT}/api/test-cors`);
        console.log(`✅ MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        console.log('\n🎯 CORS Configuration:');
        console.log('   Allowed Origins:', allowedOrigins.join(', '));
        console.log('\n🎯 Admin Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n🔧 React App should be running on: http://localhost:5173');
    });
}