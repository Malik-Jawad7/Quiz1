// mock-server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// Mock data
const mockData = {
    users: [],
    questions: [],
    results: [],
    admins: [{
        username: 'admin',
        password: 'admin123',
        role: 'admin'
    }],
    config: {
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 50,
        maxMarks: 100
    }
};

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Mock backend is running',
        database: 'Connected',
        environment: 'Development'
    });
});

// Get config
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: mockData.config
    });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    const admin = mockData.admins.find(a => a.username === username);
    
    if (admin && admin.password === password) {
        res.json({
            success: true,
            message: 'Login successful',
            token: 'mock_jwt_token_' + Date.now(),
            user: {
                id: 'admin_id',
                username: admin.username,
                role: admin.role
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

// User registration
app.post('/api/auth/register', (req, res) => {
    const user = {
        id: 'user_' + Date.now(),
        ...req.body,
        createdAt: new Date()
    };
    
    mockData.users.push(user);
    
    res.json({
        success: true,
        message: 'Registration successful',
        userId: user.id,
        user: user
    });
});

// Get questions by category
app.get('/api/user/questions/:category', (req, res) => {
    const { category } = req.params;
    
    // Mock questions
    const questions = [
        {
            _id: 'q1_' + Date.now(),
            category: category,
            questionText: 'What does HTML stand for?',
            difficulty: 'easy',
            marks: 1,
            options: [
                { text: 'Hyper Text Markup Language', isCorrect: true, optionIndex: 1 },
                { text: 'High Tech Modern Language', isCorrect: false, optionIndex: 2 },
                { text: 'Hyper Transfer Markup Language', isCorrect: false, optionIndex: 3 },
                { text: 'Home Tool Markup Language', isCorrect: false, optionIndex: 4 }
            ]
        },
        {
            _id: 'q2_' + Date.now(),
            category: category,
            questionText: 'What does CSS stand for?',
            difficulty: 'easy',
            marks: 1,
            options: [
                { text: 'Computer Style Sheets', isCorrect: false, optionIndex: 1 },
                { text: 'Cascading Style Sheets', isCorrect: true, optionIndex: 2 },
                { text: 'Creative Style System', isCorrect: false, optionIndex: 3 },
                { text: 'Colorful Style Sheets', isCorrect: false, optionIndex: 4 }
            ]
        },
        {
            _id: 'q3_' + Date.now(),
            category: category,
            questionText: 'Which language runs in a web browser?',
            difficulty: 'easy',
            marks: 1,
            options: [
                { text: 'Java', isCorrect: false, optionIndex: 1 },
                { text: 'C', isCorrect: false, optionIndex: 2 },
                { text: 'Python', isCorrect: false, optionIndex: 3 },
                { text: 'JavaScript', isCorrect: true, optionIndex: 4 }
            ]
        },
        {
            _id: 'q4_' + Date.now(),
            category: category,
            questionText: 'What does SQL stand for?',
            difficulty: 'medium',
            marks: 2,
            options: [
                { text: 'Structured Query Language', isCorrect: true, optionIndex: 1 },
                { text: 'Stylish Question Language', isCorrect: false, optionIndex: 2 },
                { text: 'Statement Question Language', isCorrect: false, optionIndex: 3 },
                { text: 'Standard Query Language', isCorrect: false, optionIndex: 4 }
            ]
        },
        {
            _id: 'q5_' + Date.now(),
            category: category,
            questionText: 'Which is used for styling web pages?',
            difficulty: 'easy',
            marks: 1,
            options: [
                { text: 'HTML', isCorrect: false, optionIndex: 1 },
                { text: 'CSS', isCorrect: true, optionIndex: 2 },
                { text: 'JavaScript', isCorrect: false, optionIndex: 3 },
                { text: 'Python', isCorrect: false, optionIndex: 4 }
            ]
        }
    ];
    
    res.json({
        success: true,
        questions: questions
    });
});

// Submit quiz
app.post('/api/user/submit', (req, res) => {
    const { rollNumber, category, answers } = req.body;
    
    // Calculate score
    let score = 0;
    let totalMarks = 5; // 5 questions * 1 mark each
    
    answers.forEach(answer => {
        if (answer.selectedOption === 1) score += 1; // All correct answers are option 1 in mock
    });
    
    const percentage = (score / totalMarks) * 100;
    const passed = percentage >= mockData.config.passingPercentage;
    
    const result = {
        id: 'result_' + Date.now(),
        rollNumber,
        category,
        score,
        totalMarks,
        percentage,
        passed,
        passingPercentage: mockData.config.passingPercentage,
        createdAt: new Date()
    };
    
    mockData.results.push(result);
    
    res.json({
        success: true,
        message: 'Quiz submitted successfully',
        result: result
    });
});

// Admin routes
app.get('/api/admin/users', (req, res) => {
    res.json({
        success: true,
        results: mockData.results
    });
});

app.get('/api/admin/questions', (req, res) => {
    const allQuestions = [];
    ['html', 'css', 'javascript', 'react', 'nodejs'].forEach(category => {
        const questions = [
            {
                _id: 'admin_q1_' + category,
                category,
                questionText: `Sample ${category} question 1`,
                difficulty: 'easy',
                marks: 1,
                options: [
                    { text: 'Correct Answer', isCorrect: true, optionIndex: 1 },
                    { text: 'Wrong Answer', isCorrect: false, optionIndex: 2 },
                    { text: 'Wrong Answer', isCorrect: false, optionIndex: 3 },
                    { text: 'Wrong Answer', isCorrect: false, optionIndex: 4 }
                ]
            },
            {
                _id: 'admin_q2_' + category,
                category,
                questionText: `Sample ${category} question 2`,
                difficulty: 'medium',
                marks: 2,
                options: [
                    { text: 'Wrong Answer', isCorrect: false, optionIndex: 1 },
                    { text: 'Correct Answer', isCorrect: true, optionIndex: 2 },
                    { text: 'Wrong Answer', isCorrect: false, optionIndex: 3 },
                    { text: 'Wrong Answer', isCorrect: false, optionIndex: 4 }
                ]
            }
        ];
        allQuestions.push(...questions);
    });
    
    res.json({
        success: true,
        questions: allQuestions
    });
});

app.get('/api/admin/dashboard', (req, res) => {
    res.json({
        success: true,
        stats: {
            totalStudents: mockData.users.length,
            totalQuestions: mockData.questions.length,
            totalAttempts: mockData.results.length,
            averageScore: mockData.results.length > 0 
                ? mockData.results.reduce((sum, r) => sum + r.percentage, 0) / mockData.results.length 
                : 0,
            passRate: mockData.results.length > 0
                ? (mockData.results.filter(r => r.passed).length / mockData.results.length) * 100
                : 0,
            todayAttempts: mockData.results.filter(r => {
                const today = new Date();
                return new Date(r.createdAt).toDateString() === today.toDateString();
            }).length,
            totalCategories: 5,
            activeStudents: Math.min(mockData.users.length, 10)
        }
    });
});

// Test database
app.get('/api/test-db', (req, res) => {
    res.json({
        success: true,
        mode: 'Mock Database',
        counts: {
            users: mockData.users.length,
            questions: mockData.questions.length,
            results: mockData.results.length
        }
    });
});

// Update config
app.put('/api/admin/config', (req, res) => {
    mockData.config = { ...mockData.config, ...req.body };
    res.json({
        success: true,
        message: 'Configuration updated',
        config: mockData.config
    });
});

// Add question
app.post('/api/admin/questions', (req, res) => {
    const question = {
        _id: 'new_q_' + Date.now(),
        ...req.body,
        createdAt: new Date()
    };
    
    mockData.questions.push(question);
    
    res.json({
        success: true,
        message: 'Question added',
        question: question
    });
});

// Add result
app.post('/api/admin/results', (req, res) => {
    const result = {
        _id: 'new_r_' + Date.now(),
        ...req.body,
        createdAt: new Date()
    };
    
    mockData.results.push(result);
    
    res.json({
        success: true,
        message: 'Result added',
        result: result
    });
});

// Delete result
app.delete('/api/admin/results/:id', (req, res) => {
    const index = mockData.results.findIndex(r => r._id === req.params.id);
    if (index !== -1) {
        mockData.results.splice(index, 1);
    }
    
    res.json({
        success: true,
        message: 'Result deleted'
    });
});

// Delete all results
app.delete('/api/admin/results', (req, res) => {
    mockData.results = [];
    res.json({
        success: true,
        message: 'All results deleted'
    });
});

// Delete question
app.delete('/api/admin/questions/:id', (req, res) => {
    const index = mockData.questions.findIndex(q => q._id === req.params.id);
    if (index !== -1) {
        mockData.questions.splice(index, 1);
    }
    
    res.json({
        success: true,
        message: 'Question deleted'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Mock server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});