const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Config = require('../models/Config');
const User = require('../models/User');
const Admin = require('../models/Admin');
    
    const [config, setConfig] = useState({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 100
    });
    
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0,
        categoryStats: {},
        categoryMarks: {}
    });
    
    const [categoryMarks, setCategoryMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [resultDetails, setResultDetails] = useState(null);

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        filterResults();
    }, [searchTerm, results]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadConfig(),
                loadResults(),
                loadQuestions(),
                loadDashboardStats()
            ]);
        } catch (error) {
            console.log('Error loading data:', error);
            alert('Failed to load data. Please check if backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const response = await getConfig();
            if (response.data.success) {
                setConfig(response.data.config);
            }
        } catch (error) {
            console.log('Config not available, using defaults');
        }
    };

    const loadResults = async () => {
        try {
            const response = await getResults();
            if (response.data.success) {
                const resultsWithStatus = response.data.results.map(result => {
                    const percentage = parseFloat(result.percentage) || 0;
                    const passed = percentage >= config.passingPercentage;
                    return {
                        ...result,
                        passed,
                        status: passed ? 'PASS' : 'FAIL'
                    };
                });
                setResults(resultsWithStatus);
                setFilteredResults(resultsWithStatus);
            }
        } catch (error) {
            console.log('Results not available');
        }
    };

    const loadQuestions = async () => {
        try {
            const response = await getAllQuestions();
            if (response.data.success) {
                setQuestions(response.data.questions);
                
                const marksData = {};
                response.data.questions.forEach(q => {
                    const marks = q.marks || 1;
                    marksData[q.category] = (marksData[q.category] || 0) + marks;
                });
                setCategoryMarks(marksData);
            }
        } catch (error) {
            console.log('Questions not available');
        }
    };

    const loadDashboardStats = async () => {
        try {
            const response = await getDashboardStats();
            if (response.data.success) {
                setStats(response.data.stats);
                if (response.data.stats.categoryMarks) {
                    setCategoryMarks(response.data.stats.categoryMarks);
                }
            }
        } catch (error) {
            console.log('Dashboard stats not available, calculating manually');
            calculateManualStats();
        }
    };

    const calculateManualStats = () => {
        const totalAttempts = results.length;
        const uniqueStudents = new Set(results.map(r => r.rollNumber)).size;
        
        const totalScore = results.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
        const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : 0;
        
        const passedCount = results.filter(r => (parseFloat(r.percentage) || 0) >= config.passingPercentage).length;
        const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(2) : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttempts = results.filter(r => {
            const resultDate = new Date(r.createdAt);
            return resultDate >= today;
        }).length;

        const categoryStats = {};
        const categoryMarksData = {};
        
        ['mern', 'react', 'node', 'mongodb', 'express'].forEach(category => {
            const categoryQuestions = questions.filter(q => q.category === category);
            categoryStats[category] = categoryQuestions.length;
            
            const totalMarks = categoryQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            categoryMarksData[category] = totalMarks;
        });

        setStats(prev => ({
            ...prev,
            totalStudents: uniqueStudents,
            totalAttempts,
            averageScore,
            passRate,
            todayAttempts,
            totalQuestions: questions.length,
            categoryStats,
            categoryMarks: categoryMarksData
        }));
    };

    const getCategoryStatus = (category) => {
        const currentMarks = categoryMarks[category] || 0;
        const percentage = (currentMarks / 100) * 100;
        const remaining = 100 - currentMarks;
        
        let status = 'available';
        if (currentMarks >= 100) {
            status = 'ready';
        } else if (currentMarks >= 80) {
            status = 'warning';
        }
        
        return {
            currentMarks,
            percentage,
            remaining,
            status
        };
    };

    const handleUpdateConfig = async () => {
        try {
            const response = await updateConfig(config);
            if (response.data.success) {
                alert('✅ Configuration updated successfully!');
                loadAllData();
            }
        } catch (error) {
            alert('Error updating configuration');
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        
        if (!questionData.questionText.trim()) {
            alert('Question text is required');
            return;
        }
        
        const validOptions = questionData.options.filter(opt => opt.text.trim() !== '');
        if (validOptions.length < 2) {
            alert('At least 2 options are required');
            return;
        }
        
        const hasCorrect = validOptions.some(opt => opt.isCorrect);
        if (!hasCorrect) {
            alert('Please mark one option as correct');
            return;
        }

        const categoryStatus = getCategoryStatus(questionData.category);
        if (categoryStatus.currentMarks + questionData.marks > 100) {
            alert(`Cannot add question. ${questionData.category.toUpperCase()} category already has ${categoryStatus.currentMarks}/100 marks. Only ${categoryStatus.remaining} marks remaining.`);
            return;
        }

        try {
            const response = await addQuestion({
                ...questionData,
                options: validOptions
            });
            
            if (response.data.success) {
                alert('✅ Question added successfully!');
                setQuestionData({
                    category: 'mern',
                    questionText: '',
                    options: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                    ],
                    marks: 1,
                    difficulty: 'medium'
                });
                loadQuestions();
                loadDashboardStats();
            } else {
                alert('Failed to add question: ' + response.data.message);
            }
        } catch (error) {
            console.error('Error adding question:', error);
            alert('Error adding question. Please try again.');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                const response = await deleteQuestion(questionId);
                if (response.data.success) {
                    alert('✅ Question deleted successfully!');
                    loadQuestions();
                    loadDashboardStats();
                }
            } catch (error) {
                console.error('Error deleting question:', error);
                alert('Error deleting question');
            }
        }
    };

    const handleDeleteResult = async (resultId, studentName) => {
        if (window.confirm(`Are you sure you want to delete result of ${studentName}?`)) {
            try {
                const response = await deleteResult(resultId);
                if (response.data.success) {
                    alert(`✅ Result deleted successfully!`);
                    loadResults();
                }
            } catch (error) {
                console.error('Error deleting result:', error);
                alert('Error deleting result');
            }
        }
    };

    const handleDeleteAllResults = async () => {
        if (results.length === 0) {
            alert('No results to delete');
            return;
        }
        
        if (window.confirm(`Are you sure you want to delete ALL ${results.length} results? This action cannot be undone!`)) {
            try {
                const response = await deleteAllResults();
                if (response.data.success) {
                    alert(`✅ All results deleted successfully! (${results.length} results removed)`);
                    loadResults();
                }
            } catch (error) {
                console.error('Error deleting all results:', error);
                alert('Error deleting all results');
            }
        }
    };

    const handleViewResultDetails = async (result) => {
        try {
            setSelectedResult(result);
            // Try to get detailed result from API
            const response = await getResultDetails(result._id);
            if (response.data.success) {
                const detailedResult = response.data.result;
                const percentage = parseFloat(detailedResult.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                
                setResultDetails({
                    ...detailedResult,
                    passed,
                    percentage,
                    score: detailedResult.score || 0,
                    totalQuestions: detailedResult.totalQuestions || 100
                });
            } else {
                // Fallback to basic result data
                const percentage = parseFloat(result.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                
                setResultDetails({
                    ...result,
                    passed,
                    percentage,
                    score: result.score || 0,
                    totalQuestions: result.totalQuestions || 100,
                    detailedInfo: {
                        score: result.score || 0,
                        totalQuestions: result.totalQuestions || 100,
                        percentage: parseFloat(result.percentage) || 0,
                        passed: passed,
                        category: result.category,
                        date: result.createdAt,
                        timeTaken: result.timeTaken || 'N/A'
                    }
                });
            }
        } catch (error) {
            console.error('Error loading result details:', error);
            // Fallback to basic result data
            const percentage = parseFloat(result.percentage) || 0;
            const passed = percentage >= config.passingPercentage;
            
            setResultDetails({
                ...result,
                passed,
                percentage,
                score: result.score || 0,
                totalQuestions: result.totalQuestions || 100,
                detailedInfo: {
                    score: result.score || 0,
                    totalQuestions: result.totalQuestions || 100,
                    percentage: parseFloat(result.percentage) || 0,
                    passed: passed,
                    category: result.category,
                    date: result.createdAt,
                    timeTaken: result.timeTaken || 'N/A'
                }
            });
        }
    };

    const closeResultModal = () => {
        setSelectedResult(null);
        setResultDetails(null);
    };

    const addOptionField = () => {
        if (questionData.options.length < 6) {
            setQuestionData({
                ...questionData,
                options: [...questionData.options, { text: '', isCorrect: false }]
            });
        } else {
            alert('Maximum 6 options allowed');
        }
    };

    const removeOptionField = (index) => {
        if (questionData.options.length > 2) {
            const newOptions = questionData.options.filter((_, i) => i !== index);
            setQuestionData({
                ...questionData,
                options: newOptions
            });
        } else {
            alert('Minimum 2 options required');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFullDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filterResults = () => {
        if (!searchTerm.trim()) {
            setFilteredResults(results);
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filtered = results.filter(result => {
            const percentage = parseFloat(result.percentage) || 0;
            const passed = percentage >= config.passingPercentage;
            const statusText = passed ? 'pass' : 'fail';
            
            return (
                result.name.toLowerCase().includes(term) ||
                result.rollNumber.toLowerCase().includes(term) ||
                result.category.toLowerCase().includes(term) ||
                statusText.includes(term) ||
                (passed ? 'passed' : 'failed').includes(term)
            );
        });
        
        setFilteredResults(filtered);
    };

    const exportResults = () => {
        if (filteredResults.length === 0) {
            alert('No results to export');
            return;
        }
        
        const csv = [
            ['Name', 'Roll Number', 'Category', 'Score', 'Total Questions', 'Percentage', 'Status', 'Pass/Fail', 'Date'],
            ...filteredResults.map(r => {
                const percentage = parseFloat(r.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                return [
                    r.name,
                    r.rollNumber,
                    r.category,
                    r.score,
                    r.totalQuestions || 100,
                    `${percentage.toFixed(2)}%`,
                    passed ? 'PASSED' : 'FAILED',
                    passed ? 'PASS' : 'FAIL',
                    formatDate(r.createdAt)
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const exportQuestions = () => {
        if (questions.length === 0) {
            alert('No questions to export');
            return;
        }
        
        const csv = [
            ['Category', 'Question', 'Options', 'Correct Answer', 'Marks', 'Difficulty'],
            ...questions.map(q => [
                q.category,
                q.questionText,
                q.options.map(opt => opt.text).join(' | '),
                q.options.find(opt => opt.isCorrect)?.text || '',
                q.marks || 1,
                q.difficulty || 'medium'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-questions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const renderDashboard = () => {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <h2>📊 Dashboard Overview</h2>
                    <button onClick={loadAllData} className="refresh-btn-small">
                        🔄 Refresh
                    </button>
                </div>
                
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>{stats.totalStudents}</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                            <h3>{stats.totalAttempts}</h3>
                            <p>Quiz Attempts</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">❓</div>
                        <div className="stat-info">
                            <h3>{stats.totalQuestions}</h3>
                            <p>Total Questions</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">💯</div>
                        <div className="stat-info">
                            <h3>100</h3>
                            <p>Marks per Category</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <h3>{stats.averageScore}%</h3>
                            <p>Average Score</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-info">
                            <h3>{stats.passRate}%</h3>
                            <p>Pass Rate</p>
                        </div>
                    </div>
                </div>

                <div className="category-status-section">
                    <h3>🎯 Category Marks Status</h3>
                    <div className="category-grid">
                        {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                            const status = getCategoryStatus(category);
                            return (
                                <div key={category} className={`category-card ${status.status}`}>
                                    <div className="category-name">{category.toUpperCase()}</div>
                                    <div className="marks-info">
                                        <span className="marks-value">{status.currentMarks}/100</span>
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill"
                                                style={{ width: `${status.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="status-text">
                                        {status.status === 'ready' ? '✅ READY' : 
                                         status.status === 'warning' ? `⚠️ ${status.remaining} marks left` : 
                                         '📝 Available'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="recent-activity">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                        {results.slice(0, 5).map((result, index) => {
                            const percentage = parseFloat(result.percentage) || 0;
                            const passed = percentage >= config.passingPercentage;
                            
                            return (
                                <div key={index} className="activity-item">
                                    <div className="activity-icon">
                                        {passed ? '✅' : '❌'}
                                    </div>
                                    <div className="activity-details">
                                        <p><strong>{result.name}</strong> completed {result.category} quiz</p>
                                        <span>Score: {result.score} • Status: {passed ? 'PASS' : 'FAIL'} • {formatDate(result.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderAddQuestions = () => {
        return (
            <div className="add-questions">
                <h2>➕ Add Questions</h2>
                
                <div className="category-limits">
                    <h4>📊 Category Marks Status</h4>
                    <div className="limits-grid">
                        {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                            const status = getCategoryStatus(category);
                            return (
                                <div key={category} className="limit-item">
                                    <span className="limit-category">{category.toUpperCase()}</span>
                                    <span className="limit-marks">{status.currentMarks}/100</span>
                                    <div className="limit-progress">
                                        <div 
                                            className="limit-fill"
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="question-form">
                    <form onSubmit={handleAddQuestion}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    value={questionData.category}
                                    onChange={(e) => setQuestionData({...questionData, category: e.target.value})}
                                >
                                    {['mern', 'react', 'node', 'mongodb', 'express'].map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat.toUpperCase()} ({getCategoryStatus(cat).currentMarks}/100)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Marks</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={questionData.marks}
                                    onChange={(e) => setQuestionData({...questionData, marks: parseInt(e.target.value)})}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Difficulty</label>
                                <select 
                                    value={questionData.difficulty}
                                    onChange={(e) => setQuestionData({...questionData, difficulty: e.target.value})}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Question Text</label>
                            <textarea
                                value={questionData.questionText}
                                onChange={(e) => setQuestionData({...questionData, questionText: e.target.value})}
                                placeholder="Enter question text here..."
                                rows="4"
                                required
                            />
                        </div>
                        
                        <div className="options-section">
                            <h4>Options (Mark correct answer)</h4>
                            {questionData.options.map((option, index) => (
                                <div key={index} className="option-item">
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        checked={option.isCorrect}
                                        onChange={() => {
                                            const newOptions = questionData.options.map((opt, i) => ({
                                                ...opt,
                                                isCorrect: i === index
                                            }));
                                            setQuestionData({...questionData, options: newOptions});
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => {
                                            const newOptions = [...questionData.options];
                                            newOptions[index].text = e.target.value;
                                            setQuestionData({...questionData, options: newOptions});
                                        }}
                                        placeholder={`Option ${index + 1}`}
                                        required={index < 2}
                                    />
                                    {questionData.options.length > 2 && (
                                        <button 
                                            type="button"
                                            onClick={() => removeOptionField(index)}
                                            className="remove-btn"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            <button type="button" onClick={addOptionField} className="add-btn">
                                + Add Option
                            </button>
                        </div>
                        
                        <button type="submit" className="submit-btn">
                            💾 Add Question
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    const renderManageQuestions = () => {
        return (
            <div className="manage-questions">
                <h2>📝 Manage Questions</h2>
                
                <div className="actions-bar">
                    <button onClick={exportQuestions} className="export-btn">
                        📤 Export Questions
                    </button>
                </div>
                
                <div className="questions-list">
                    {questions.length === 0 ? (
                        <p className="no-data">No questions available</p>
                    ) : (
                        questions.map((question, index) => (
                            <div key={question._id || index} className="question-card">
                                <div className="question-header">
                                    <span className="category-badge">{question.category}</span>
                                    <span className="marks-badge">{question.marks} marks</span>
                                    <span className="difficulty-badge">{question.difficulty}</span>
                                </div>
                                <p className="question-text">{question.questionText}</p>
                                <div className="options-list">
                                    {question.options.map((opt, idx) => (
                                        <div key={idx} className={`option ${opt.isCorrect ? 'correct' : ''}`}>
                                            {opt.text}
                                            {opt.isCorrect && <span className="correct-mark">✓</span>}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => handleDeleteQuestion(question._id)}
                                    className="delete-btn"
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderConfig = () => {
        return (
            <div className="config-page">
                <h2>⚙️ Quiz Configuration</h2>
                
                <div className="config-form">
                    <div className="form-group">
                        <label>Quiz Time (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="180"
                            value={config.quizTime}
                            onChange={(e) => setConfig({...config, quizTime: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Passing Percentage (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={config.passingPercentage}
                            onChange={(e) => setConfig({...config, passingPercentage: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Questions per Quiz</label>
                        <input
                            type="number"
                            min="1"
                            value={config.totalQuestions}
                            onChange={(e) => setConfig({...config, totalQuestions: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <button onClick={handleUpdateConfig} className="save-btn">
                        💾 Save Configuration
                    </button>
                </div>
                
                <div className="current-config">
                    <h3>Current Settings</h3>
                    <div className="config-details">
                        <div className="detail">
                            <span>Quiz Time:</span>
                            <span>{config.quizTime} minutes</span>
                        </div>
                        <div className="detail">
                            <span>Passing Percentage:</span>
                            <span>{config.passingPercentage}%</span>
                        </div>
                        <div className="detail">
                            <span>Questions per Quiz:</span>
                            <span>{config.totalQuestions}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        // Calculate summary data
        const passedCount = filteredResults.filter(r => {
            const percentage = parseFloat(r.percentage) || 0;
            return percentage >= config.passingPercentage;
        }).length;
        
        const failedCount = filteredResults.length - passedCount;
        const passRate = filteredResults.length > 0 ? ((passedCount / filteredResults.length) * 100).toFixed(2) : '0';

        return (
            <div className="results-page">
                <h2>📈 Quiz Results</h2>
                
                <div className="results-header">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search by name, roll number, category, or status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="search-icon">🔍</span>
                    </div>
                    
                    <div className="action-buttons">
                        <button onClick={exportResults} className="export-btn">
                            📤 Export CSV
                        </button>
                        <button onClick={handleDeleteAllResults} className="delete-all-btn">
                            🗑️ Delete All
                        </button>
                    </div>
                </div>
                
                <div className="results-table-container">
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Category</th>
                                <th>Score</th>
                                <th>Total</th>
                                <th>Percentage</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((result, index) => {
                                const percentage = parseFloat(result.percentage) || 0;
                                const passed = percentage >= config.passingPercentage;
                                const statusText = passed ? '✅ PASS' : '❌ FAIL';
                                const statusClass = passed ? 'status-passed' : 'status-failed';
                                
                                return (
                                    <tr key={result._id || index} className={passed ? 'passed-row' : 'failed-row'}>
                                        <td>{result.name}</td>
                                        <td>{result.rollNumber}</td>
                                        <td>
                                            <span className="category-tag">{result.category.toUpperCase()}</span>
                                        </td>
                                        <td>
                                            <strong>{result.score}</strong>
                                        </td>
                                        <td>{result.totalQuestions || 100}</td>
                                        <td>
                                            <span className={`percentage-display ${passed ? 'percentage-pass' : 'percentage-fail'}`}>
                                                {percentage.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusClass}`}>
                                                {statusText}
                                            </span>
                                        </td>
                                        <td>{formatDate(result.createdAt)}</td>
                                        <td>
                                            <div className="action-buttons-small">
                                                <button 
                                                    onClick={() => handleViewResultDetails(result)}
                                                    className="view-btn"
                                                    title="View Details"
                                                >
                                                    👁️
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteResult(result._id, result.name)}
                                                    className="delete-btn-small"
                                                    title="Delete Result"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {filteredResults.length === 0 && (
                        <div className="no-data">
                            <p>No results found</p>
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="clear-search-btn"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                    
                    {filteredResults.length > 0 && (
                        <div className="results-summary">
                            <div className="summary-item">
                                <span>Total Results:</span>
                                <strong>{filteredResults.length}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Passed:</span>
                                <strong className="passed-count">
                                    {passedCount}
                                </strong>
                            </div>
                            <div className="summary-item">
                                <span>Failed:</span>
                                <strong className="failed-count">
                                    {failedCount}
                                </strong>
                            </div>
                            <div className="summary-item">
                                <span>Pass Rate:</span>
                                <strong>
                                    {passRate}%
                                </strong>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMarksAnalysis = () => {
        return (
            <div className="marks-analysis">
                <h2>💯 Marks Analysis</h2>
                
                <div className="analysis-header">
                    <h3>Category Progress Towards 100 Marks</h3>
                    <p>Each category needs 100 total marks to become available for quizzes</p>
                </div>
                
                <div className="analysis-grid">
                    {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                        const status = getCategoryStatus(category);
                        return (
                            <div key={category} className="analysis-card">
                                <div className="card-header">
                                    <h3>{category.toUpperCase()}</h3>
                                    <span className={`status-badge ${status.status}`}>
                                        {status.status === 'ready' ? '✅ READY' : 
                                         status.status === 'warning' ? '⚠️ WARNING' : '📝 IN PROGRESS'}
                                    </span>
                                </div>
                                <div className="progress-section">
                                    <div className="progress-info">
                                        <span className="current-marks">{status.currentMarks}/100</span>
                                        <span className="percentage">{status.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="details">
                                    <div className="detail">
                                        <span>Questions Added:</span>
                                        <span>{questions.filter(q => q.category === category).length}</span>
                                    </div>
                                    <div className="detail">
                                        <span>Marks Remaining:</span>
                                        <span>{status.remaining}</span>
                                    </div>
                                    <div className="detail">
                                        <span>Average Marks/Question:</span>
                                        <span>
                                            {questions.filter(q => q.category === category).length > 0 
                                                ? (status.currentMarks / questions.filter(q => q.category === category).length).toFixed(1)
                                                : '0'}
                                        </span>
                                    </div>
                                </div>
                                <div className="recommendation">
                                    {status.status === 'ready' ? 
                                        '✅ Category is ready for student quizzes' :
                                        status.status === 'warning' ?
                                        `⚠️ Add ${status.remaining} more marks to complete this category` :
                                        `📝 Add ${status.remaining} marks to make this category available`
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="summary-section">
                    <h3>📊 Summary</h3>
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-label">Ready Categories:</span>
                            <span className="stat-value">
                                {Object.keys(categoryMarks).filter(cat => getCategoryStatus(cat).status === 'ready').length}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Questions:</span>
                            <span className="stat-value">{questions.length}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Marks:</span>
                            <span className="stat-value">
                                {Object.values(categoryMarks).reduce((a, b) => a + b, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResultDetailsModal = () => {
        if (!resultDetails) return null;

        const percentage = parseFloat(resultDetails.percentage) || 0;
        const passed = resultDetails.passed || percentage >= config.passingPercentage;
        const score = resultDetails.score || 0;
        const totalQuestions = resultDetails.totalQuestions || 100;
        const percentageFormatted = percentage.toFixed(2);
        const scorePercentage = ((score / totalQuestions) * 100).toFixed(2);

        return (
            <div className="modal-overlay" onClick={closeResultModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>📋 Student Result Details</h2>
                        <button onClick={closeResultModal} className="close-btn">×</button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="student-info-section">
                            <h3>👤 Student Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Full Name:</span>
                                    <span className="info-value">{resultDetails.name}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Roll Number:</span>
                                    <span className="info-value">{resultDetails.rollNumber}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Category:</span>
                                    <span className="info-value category-badge-large">{resultDetails.category.toUpperCase()}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Date & Time:</span>
                                    <span className="info-value">{formatFullDate(resultDetails.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`result-status-card ${passed ? 'status-passed' : 'status-failed'}`}>
                            <div className="status-content">
                                <div className="status-icon">
                                    {passed ? (
                                        <div className="icon-success">🎉</div>
                                    ) : (
                                        <div className="icon-failure">📝</div>
                                    )}
                                </div>
                                <div className="status-text">
                                    <h3>{passed ? 'Assessment Passed' : 'Assessment Failed'}</h3>
                                    <p>
                                        {passed 
                                            ? `Student scored ${percentageFormatted}% (${score}/${totalQuestions}) which meets the passing criteria of ${config.passingPercentage}%.`
                                            : `Student scored ${percentageFormatted}% (${score}/${totalQuestions}) which is below the passing criteria of ${config.passingPercentage}%.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="performance-section">
                            <h3>📊 Performance Metrics</h3>
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-icon">📈</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Score Obtained</span>
                                        <span className="metric-value">{score}/{totalQuestions}</span>
                                        <span className="metric-percentage">{scorePercentage}%</span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">💯</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Final Percentage</span>
                                        <span className={`metric-value ${passed ? 'value-success' : 'value-danger'}`}>
                                            {percentageFormatted}%
                                        </span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">🎯</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Status</span>
                                        <span className={`status-badge-large ${passed ? 'badge-success' : 'badge-danger'}`}>
                                            {passed ? '✅ PASSED' : '❌ FAILED'}
                                        </span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">⏱️</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Date</span>
                                        <span className="metric-value">{formatDate(resultDetails.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="performance-visualization">
                            <h3>📈 Performance Analysis</h3>
                            <div className="performance-bar-container">
                                <div className="bar-labels">
                                    <span>0%</span>
                                    <span>Passing ({config.passingPercentage}%)</span>
                                    <span>100%</span>
                                </div>
                                <div className="performance-bar">
                                    <div 
                                        className="performance-fill"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                    <div 
                                        className="passing-marker"
                                        style={{ left: `${config.passingPercentage}%` }}
                                    ></div>
                                </div>
                                <div className="current-performance">
                                    <span className="current-label">Student's Score:</span>
                                    <span className="current-value">{percentageFormatted}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="detailed-breakdown">
                            <h3>📋 Detailed Breakdown</h3>
                            <div className="breakdown-grid">
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Correct Answers:</span>
                                    <span className="breakdown-value success">{score} questions</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Incorrect Answers:</span>
                                    <span className="breakdown-value danger">{totalQuestions - score} questions</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Accuracy Rate:</span>
                                    <span className="breakdown-value">{scorePercentage}%</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Passing Criteria:</span>
                                    <span className="breakdown-value">{config.passingPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button onClick={closeResultModal} className="btn btn-secondary">
                            Close
                        </button>
                        <button 
                            onClick={() => {
                                const printContent = `
                                    <html>
                                        <head>
                                            <title>Result Details - ${resultDetails.name}</title>
                                            <style>
                                                body { font-family: Arial, sans-serif; margin: 20px; }
                                                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                                                .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
                                                .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                                                .status-badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                                                .passed { background: #d4edda; color: #155724; }
                                                .failed { background: #f8d7da; color: #721c24; }
                                                .performance-bar { height: 20px; background: #e0e0e0; border-radius: 10px; margin: 20px 0; position: relative; }
                                                .performance-fill { height: 100%; border-radius: 10px; background: #28a745; }
                                                .passing-marker { position: absolute; top: 0; width: 2px; height: 100%; background: #dc3545; }
                                                @media print { body { font-size: 12px; } }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="header">
                                                <h2>Shamsi Institute of Technology</h2>
                                                <h3>Quiz Result Details</h3>
                                                <h4>${resultDetails.name} - ${resultDetails.rollNumber}</h4>
                                            </div>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <strong>Category:</strong> ${resultDetails.category.toUpperCase()}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Score:</strong> ${score}/${totalQuestions}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Percentage:</strong> ${percentageFormatted}%
                                                </div>
                                                <div class="info-item">
                                                    <strong>Status:</strong> <span class="status-badge ${passed ? 'passed' : 'failed'}">${passed ? 'PASSED' : 'FAILED'}</span>
                                                </div>
                                                <div class="info-item">
                                                    <strong>Date:</strong> ${formatFullDate(resultDetails.createdAt)}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Passing Criteria:</strong> ${config.passingPercentage}%
                                                </div>
                                            </div>
                                            <div class="performance-section">
                                                <h4>Performance Analysis</h4>
                                                <div class="performance-bar">
                                                    <div class="performance-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                                                    <div class="passing-marker" style="left: ${config.passingPercentage}%"></div>
                                                </div>
                                                <p>Student Score: ${percentageFormatted}% | Passing Mark: ${config.passingPercentage}%</p>
                                            </div>
                                        </body>
                                    </html>
                                `;
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(printContent);
                                printWindow.document.close();
                                printWindow.print();
                            }}
                            className="btn btn-primary"
                        >
                            🖨️ Print Result
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-panel">
            <div className="admin-sidebar">
                <div className="sidebar-header">
                    <img src="/images.jpg" alt="Logo" className="logo" />
                    <h3>Shamsi Institute</h3>
                    <p>Admin Dashboard</p>
                </div>
                
                <div className="sidebar-menu">
                    <button 
                        className={activeTab === 'dashboard' ? 'active' : ''}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button 
                        className={activeTab === 'add-questions' ? 'active' : ''}
                        onClick={() => setActiveTab('add-questions')}
                    >
                        ➕ Add Questions
                    </button>
                    <button 
                        className={activeTab === 'manage-questions' ? 'active' : ''}
                        onClick={() => setActiveTab('manage-questions')}
                    >
                        📝 Manage Questions
                    </button>
                    <button 
                        className={activeTab === 'config' ? 'active' : ''}
                        onClick={() => setActiveTab('config')}
                    >
                        ⚙️ Configuration
                    </button>
                    <button 
                        className={activeTab === 'results' ? 'active' : ''}
                        onClick={() => setActiveTab('results')}
                    >
                        📈 View Results
                    </button>
                    <button 
                        className={activeTab === 'marks-analysis' ? 'active' : ''}
                        onClick={() => setActiveTab('marks-analysis')}
                    >
                        💯 Marks Analysis
                    </button>
                </div>
                
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        🔓 Logout
                    </button>
                    <div className="server-status">
                        <span className="status-dot active"></span>
                        <span>Server Online</span>
                    </div>
                </div>
            </div>

            <div className="admin-main">
                <div className="main-header">
                    <h1>Admin Control Panel</h1>
                    <div className="header-actions">
                        <button onClick={loadAllData} className="refresh-btn">
                            🔄 Refresh All
                        </button>
                        {loading && <span className="loading-text">Loading...</span>}
                    </div>
                </div>

                <div className="admin-content">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'add-questions' && renderAddQuestions()}
                    {activeTab === 'manage-questions' && renderManageQuestions()}
                    {activeTab === 'config' && renderConfig()}
                    {activeTab === 'results' && renderResults()}
                    {activeTab === 'marks-analysis' && renderMarksAnalysis()}
                </div>
            </div>

            {selectedResult && renderResultDetailsModal()}
        </div>
    );
};

export default AdminPanel;import React, { useState, useEffect } from 'react';
import { 
    getConfig, 
    updateConfig, 
    getResults, 
    getAllQuestions,
    getDashboardStats,
    addQuestion,
    deleteQuestion,
    deleteResult,
    deleteAllResults,
    getResultDetails
} from '../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [questionData, setQuestionData] = useState({
        category: 'mern',
        questionText: '',
        options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'medium'
    });
    
    const [config, setConfig] = useState({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 100
    });
    
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0,
        categoryStats: {},
        categoryMarks: {}
    });
    
    const [categoryMarks, setCategoryMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [resultDetails, setResultDetails] = useState(null);

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        filterResults();
    }, [searchTerm, results]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadConfig(),
                loadResults(),
                loadQuestions(),
                loadDashboardStats()
            ]);
        } catch (error) {
            console.log('Error loading data:', error);
            alert('Failed to load data. Please check if backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const response = await getConfig();
            if (response.data.success) {
                setConfig(response.data.config);
            }
        } catch (error) {
            console.log('Config not available, using defaults');
        }
    };

    const loadResults = async () => {
        try {
            const response = await getResults();
            if (response.data.success) {
                // Calculate pass/fail status for each result using current config
                const resultsWithStatus = response.data.results.map(result => {
                    const percentage = parseFloat(result.percentage) || 0;
                    const passed = percentage >= config.passingPercentage;
                    return {
                        ...result,
                        passed,
                        status: passed ? 'PASS' : 'FAIL'
                    };
                });
                setResults(resultsWithStatus);
                setFilteredResults(resultsWithStatus);
            }
        } catch (error) {
            console.log('Results not available');
        }
    };

    const loadQuestions = async () => {
        try {
            const response = await getAllQuestions();
            if (response.data.success) {
                setQuestions(response.data.questions);
                
                const marksData = {};
                response.data.questions.forEach(q => {
                    const marks = q.marks || 1;
                    marksData[q.category] = (marksData[q.category] || 0) + marks;
                });
                setCategoryMarks(marksData);
            }
        } catch (error) {
            console.log('Questions not available');
        }
    };

    const loadDashboardStats = async () => {
        try {
            const response = await getDashboardStats();
            if (response.data.success) {
                setStats(response.data.stats);
                if (response.data.stats.categoryMarks) {
                    setCategoryMarks(response.data.stats.categoryMarks);
                }
            }
        } catch (error) {
            console.log('Dashboard stats not available, calculating manually');
            calculateManualStats();
        }
    };

    const calculateManualStats = () => {
        const totalAttempts = results.length;
        const uniqueStudents = new Set(results.map(r => r.rollNumber)).size;
        
        const totalScore = results.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
        const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : 0;
        
        const passedCount = results.filter(r => (parseFloat(r.percentage) || 0) >= config.passingPercentage).length;
        const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(2) : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttempts = results.filter(r => {
            const resultDate = new Date(r.createdAt);
            return resultDate >= today;
        }).length;

        const categoryStats = {};
        const categoryMarksData = {};
        
        ['mern', 'react', 'node', 'mongodb', 'express'].forEach(category => {
            const categoryQuestions = questions.filter(q => q.category === category);
            categoryStats[category] = categoryQuestions.length;
            
            const totalMarks = categoryQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            categoryMarksData[category] = totalMarks;
        });

        setStats(prev => ({
            ...prev,
            totalStudents: uniqueStudents,
            totalAttempts,
            averageScore,
            passRate,
            todayAttempts,
            totalQuestions: questions.length,
            categoryStats,
            categoryMarks: categoryMarksData
        }));
    };

    const getCategoryStatus = (category) => {
        const currentMarks = categoryMarks[category] || 0;
        const percentage = (currentMarks / 100) * 100;
        const remaining = 100 - currentMarks;
        
        let status = 'available';
        if (currentMarks >= 100) {
            status = 'ready';
        } else if (currentMarks >= 80) {
            status = 'warning';
        }
        
        return {
            currentMarks,
            percentage,
            remaining,
            status
        };
    };

    const handleUpdateConfig = async () => {
        try {
            const response = await updateConfig(config);
            if (response.data.success) {
                alert('✅ Configuration updated successfully!');
                loadAllData();
            }
        } catch (error) {
            alert('Error updating configuration');
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        
        if (!questionData.questionText.trim()) {
            alert('Question text is required');
            return;
        }
        
        const validOptions = questionData.options.filter(opt => opt.text.trim() !== '');
        if (validOptions.length < 2) {
            alert('At least 2 options are required');
            return;
        }
        
        const hasCorrect = validOptions.some(opt => opt.isCorrect);
        if (!hasCorrect) {
            alert('Please mark one option as correct');
            return;
        }

        const categoryStatus = getCategoryStatus(questionData.category);
        if (categoryStatus.currentMarks + questionData.marks > 100) {
            alert(`Cannot add question. ${questionData.category.toUpperCase()} category already has ${categoryStatus.currentMarks}/100 marks. Only ${categoryStatus.remaining} marks remaining.`);
            return;
        }

        try {
            const response = await addQuestion({
                ...questionData,
                options: validOptions
            });
            
            if (response.data.success) {
                alert('✅ Question added successfully!');
                setQuestionData({
                    category: 'mern',
                    questionText: '',
                    options: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                    ],
                    marks: 1,
                    difficulty: 'medium'
                });
                loadQuestions();
                loadDashboardStats();
            } else {
                alert('Failed to add question: ' + response.data.message);
            }
        } catch (error) {
            console.error('Error adding question:', error);
            alert('Error adding question. Please try again.');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                const response = await deleteQuestion(questionId);
                if (response.data.success) {
                    alert('✅ Question deleted successfully!');
                    loadQuestions();
                    loadDashboardStats();
                }
            } catch (error) {
                console.error('Error deleting question:', error);
                alert('Error deleting question');
            }
        }
    };

    const handleDeleteResult = async (resultId, studentName) => {
        if (window.confirm(`Are you sure you want to delete result of ${studentName}?`)) {
            try {
                const response = await deleteResult(resultId);
                if (response.data.success) {
                    alert(`✅ Result deleted successfully!`);
                    loadResults();
                }
            } catch (error) {
                console.error('Error deleting result:', error);
                alert('Error deleting result');
            }
        }
    };

    const handleDeleteAllResults = async () => {
        if (results.length === 0) {
            alert('No results to delete');
            return;
        }
        
        if (window.confirm(`Are you sure you want to delete ALL ${results.length} results? This action cannot be undone!`)) {
            try {
                const response = await deleteAllResults();
                if (response.data.success) {
                    alert(`✅ All results deleted successfully! (${results.length} results removed)`);
                    loadResults();
                }
            } catch (error) {
                console.error('Error deleting all results:', error);
                alert('Error deleting all results');
            }
        }
    };

    const handleViewResultDetails = async (result) => {
        try {
            setSelectedResult(result);
            // Try to get detailed result from API
            const response = await getResultDetails(result._id);
            if (response.data.success) {
                const detailedResult = response.data.result;
                const percentage = parseFloat(detailedResult.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                
                setResultDetails({
                    ...detailedResult,
                    passed,
                    percentage,
                    score: detailedResult.score || 0,
                    totalQuestions: detailedResult.totalQuestions || 100
                });
            } else {
                // Fallback to basic result data
                const percentage = parseFloat(result.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                
                setResultDetails({
                    ...result,
                    passed,
                    percentage,
                    score: result.score || 0,
                    totalQuestions: result.totalQuestions || 100,
                    detailedInfo: {
                        score: result.score || 0,
                        totalQuestions: result.totalQuestions || 100,
                        percentage: parseFloat(result.percentage) || 0,
                        passed: passed,
                        category: result.category,
                        date: result.createdAt,
                        timeTaken: result.timeTaken || 'N/A'
                    }
                });
            }
        } catch (error) {
            console.error('Error loading result details:', error);
            // Fallback to basic result data
            const percentage = parseFloat(result.percentage) || 0;
            const passed = percentage >= config.passingPercentage;
            
            setResultDetails({
                ...result,
                passed,
                percentage,
                score: result.score || 0,
                totalQuestions: result.totalQuestions || 100,
                detailedInfo: {
                    score: result.score || 0,
                    totalQuestions: result.totalQuestions || 100,
                    percentage: parseFloat(result.percentage) || 0,
                    passed: passed,
                    category: result.category,
                    date: result.createdAt,
                    timeTaken: result.timeTaken || 'N/A'
                }
            });
        }
    };

    const closeResultModal = () => {
        setSelectedResult(null);
        setResultDetails(null);
    };

    const addOptionField = () => {
        if (questionData.options.length < 6) {
            setQuestionData({
                ...questionData,
                options: [...questionData.options, { text: '', isCorrect: false }]
            });
        } else {
            alert('Maximum 6 options allowed');
        }
    };

    const removeOptionField = (index) => {
        if (questionData.options.length > 2) {
            const newOptions = questionData.options.filter((_, i) => i !== index);
            setQuestionData({
                ...questionData,
                options: newOptions
            });
        } else {
            alert('Minimum 2 options required');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFullDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filterResults = () => {
        if (!searchTerm.trim()) {
            setFilteredResults(results);
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filtered = results.filter(result => {
            const percentage = parseFloat(result.percentage) || 0;
            const passed = percentage >= config.passingPercentage;
            const statusText = passed ? 'pass' : 'fail';
            
            return (
                result.name.toLowerCase().includes(term) ||
                result.rollNumber.toLowerCase().includes(term) ||
                result.category.toLowerCase().includes(term) ||
                statusText.includes(term) ||
                (passed ? 'passed' : 'failed').includes(term)
            );
        });
        
        setFilteredResults(filtered);
    };

    const exportResults = () => {
        if (filteredResults.length === 0) {
            alert('No results to export');
            return;
        }
        
        const csv = [
            ['Name', 'Roll Number', 'Category', 'Score', 'Total Questions', 'Percentage', 'Status', 'Pass/Fail', 'Date'],
            ...filteredResults.map(r => {
                const percentage = parseFloat(r.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                return [
                    r.name,
                    r.rollNumber,
                    r.category,
                    r.score,
                    r.totalQuestions || 100,
                    `${percentage.toFixed(2)}%`,
                    passed ? 'PASSED' : 'FAILED',
                    passed ? 'PASS' : 'FAIL',
                    formatDate(r.createdAt)
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const exportQuestions = () => {
        if (questions.length === 0) {
            alert('No questions to export');
            return;
        }
        
        const csv = [
            ['Category', 'Question', 'Options', 'Correct Answer', 'Marks', 'Difficulty'],
            ...questions.map(q => [
                q.category,
                q.questionText,
                q.options.map(opt => opt.text).join(' | '),
                q.options.find(opt => opt.isCorrect)?.text || '',
                q.marks || 1,
                q.difficulty || 'medium'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-questions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const renderDashboard = () => {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <h2>📊 Dashboard Overview</h2>
                    <button onClick={loadAllData} className="refresh-btn-small">
                        🔄 Refresh
                    </button>
                </div>
                
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>{stats.totalStudents}</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                            <h3>{stats.totalAttempts}</h3>
                            <p>Quiz Attempts</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">❓</div>
                        <div className="stat-info">
                            <h3>{stats.totalQuestions}</h3>
                            <p>Total Questions</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">💯</div>
                        <div className="stat-info">
                            <h3>100</h3>
                            <p>Marks per Category</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <h3>{stats.averageScore}%</h3>
                            <p>Average Score</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-info">
                            <h3>{stats.passRate}%</h3>
                            <p>Pass Rate</p>
                        </div>
                    </div>
                </div>

                <div className="category-status-section">
                    <h3>🎯 Category Marks Status</h3>
                    <div className="category-grid">
                        {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                            const status = getCategoryStatus(category);
                            return (
                                <div key={category} className={`category-card ${status.status}`}>
                                    <div className="category-name">{category.toUpperCase()}</div>
                                    <div className="marks-info">
                                        <span className="marks-value">{status.currentMarks}/100</span>
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill"
                                                style={{ width: `${status.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="status-text">
                                        {status.status === 'ready' ? '✅ READY' : 
                                         status.status === 'warning' ? `⚠️ ${status.remaining} marks left` : 
                                         '📝 Available'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="recent-activity">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                        {results.slice(0, 5).map((result, index) => {
                            const percentage = parseFloat(result.percentage) || 0;
                            const passed = percentage >= config.passingPercentage;
                            
                            return (
                                <div key={index} className="activity-item">
                                    <div className="activity-icon">
                                        {passed ? '✅' : '❌'}
                                    </div>
                                    <div className="activity-details">
                                        <p><strong>{result.name}</strong> completed {result.category} quiz</p>
                                        <span>Score: {result.score} • Status: {passed ? 'PASS' : 'FAIL'} • {formatDate(result.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderAddQuestions = () => {
        return (
            <div className="add-questions">
                <h2>➕ Add Questions</h2>
                
                <div className="category-limits">
                    <h4>📊 Category Marks Status</h4>
                    <div className="limits-grid">
                        {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                            const status = getCategoryStatus(category);
                            return (
                                <div key={category} className="limit-item">
                                    <span className="limit-category">{category.toUpperCase()}</span>
                                    <span className="limit-marks">{status.currentMarks}/100</span>
                                    <div className="limit-progress">
                                        <div 
                                            className="limit-fill"
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="question-form">
                    <form onSubmit={handleAddQuestion}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    value={questionData.category}
                                    onChange={(e) => setQuestionData({...questionData, category: e.target.value})}
                                >
                                    {['mern', 'react', 'node', 'mongodb', 'express'].map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat.toUpperCase()} ({getCategoryStatus(cat).currentMarks}/100)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Marks</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={questionData.marks}
                                    onChange={(e) => setQuestionData({...questionData, marks: parseInt(e.target.value)})}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Difficulty</label>
                                <select 
                                    value={questionData.difficulty}
                                    onChange={(e) => setQuestionData({...questionData, difficulty: e.target.value})}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Question Text</label>
                            <textarea
                                value={questionData.questionText}
                                onChange={(e) => setQuestionData({...questionData, questionText: e.target.value})}
                                placeholder="Enter question text here..."
                                rows="4"
                                required
                            />
                        </div>
                        
                        <div className="options-section">
                            <h4>Options (Mark correct answer)</h4>
                            {questionData.options.map((option, index) => (
                                <div key={index} className="option-item">
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        checked={option.isCorrect}
                                        onChange={() => {
                                            const newOptions = questionData.options.map((opt, i) => ({
                                                ...opt,
                                                isCorrect: i === index
                                            }));
                                            setQuestionData({...questionData, options: newOptions});
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => {
                                            const newOptions = [...questionData.options];
                                            newOptions[index].text = e.target.value;
                                            setQuestionData({...questionData, options: newOptions});
                                        }}
                                        placeholder={`Option ${index + 1}`}
                                        required={index < 2}
                                    />
                                    {questionData.options.length > 2 && (
                                        <button 
                                            type="button"
                                            onClick={() => removeOptionField(index)}
                                            className="remove-btn"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            <button type="button" onClick={addOptionField} className="add-btn">
                                + Add Option
                            </button>
                        </div>
                        
                        <button type="submit" className="submit-btn">
                            💾 Add Question
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    const renderManageQuestions = () => {
        return (
            <div className="manage-questions">
                <h2>📝 Manage Questions</h2>
                
                <div className="actions-bar">
                    <button onClick={exportQuestions} className="export-btn">
                        📤 Export Questions
                    </button>
                </div>
                
                <div className="questions-list">
                    {questions.length === 0 ? (
                        <p className="no-data">No questions available</p>
                    ) : (
                        questions.map((question, index) => (
                            <div key={question._id || index} className="question-card">
                                <div className="question-header">
                                    <span className="category-badge">{question.category}</span>
                                    <span className="marks-badge">{question.marks} marks</span>
                                    <span className="difficulty-badge">{question.difficulty}</span>
                                </div>
                                <p className="question-text">{question.questionText}</p>
                                <div className="options-list">
                                    {question.options.map((opt, idx) => (
                                        <div key={idx} className={`option ${opt.isCorrect ? 'correct' : ''}`}>
                                            {opt.text}
                                            {opt.isCorrect && <span className="correct-mark">✓</span>}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => handleDeleteQuestion(question._id)}
                                    className="delete-btn"
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderConfig = () => {
        return (
            <div className="config-page">
                <h2>⚙️ Quiz Configuration</h2>
                
                <div className="config-form">
                    <div className="form-group">
                        <label>Quiz Time (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="180"
                            value={config.quizTime}
                            onChange={(e) => setConfig({...config, quizTime: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Passing Percentage (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={config.passingPercentage}
                            onChange={(e) => setConfig({...config, passingPercentage: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Questions per Quiz</label>
                        <input
                            type="number"
                            min="1"
                            value={config.totalQuestions}
                            onChange={(e) => setConfig({...config, totalQuestions: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <button onClick={handleUpdateConfig} className="save-btn">
                        💾 Save Configuration
                    </button>
                </div>
                
                <div className="current-config">
                    <h3>Current Settings</h3>
                    <div className="config-details">
                        <div className="detail">
                            <span>Quiz Time:</span>
                            <span>{config.quizTime} minutes</span>
                        </div>
                        <div className="detail">
                            <span>Passing Percentage:</span>
                            <span>{config.passingPercentage}%</span>
                        </div>
                        <div className="detail">
                            <span>Questions per Quiz:</span>
                            <span>{config.totalQuestions}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        // Calculate summary data
        const passedCount = filteredResults.filter(r => {
            const percentage = parseFloat(r.percentage) || 0;
            return percentage >= config.passingPercentage;
        }).length;
        
        const failedCount = filteredResults.length - passedCount;
        const passRate = filteredResults.length > 0 ? ((passedCount / filteredResults.length) * 100).toFixed(2) : '0';

        return (
            <div className="results-page">
                <h2>📈 Quiz Results</h2>
                
                <div className="results-header">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search by name, roll number, category, or status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="search-icon">🔍</span>
                    </div>
                    
                    <div className="action-buttons">
                        <button onClick={exportResults} className="export-btn">
                            📤 Export CSV
                        </button>
                        <button onClick={handleDeleteAllResults} className="delete-all-btn">
                            🗑️ Delete All
                        </button>
                    </div>
                </div>
                
                <div className="results-table-container">
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Category</th>
                                <th>Score</th>
                                <th>Total</th>
                                <th>Percentage</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((result, index) => {
                                const percentage = parseFloat(result.percentage) || 0;
                                const passed = percentage >= config.passingPercentage;
                                const statusText = passed ? '✅ PASS' : '❌ FAIL';
                                const statusClass = passed ? 'status-passed' : 'status-failed';
                                
                                return (
                                    <tr key={result._id || index} className={passed ? 'passed-row' : 'failed-row'}>
                                        <td>{result.name}</td>
                                        <td>{result.rollNumber}</td>
                                        <td>
                                            <span className="category-tag">{result.category.toUpperCase()}</span>
                                        </td>
                                        <td>
                                            <strong>{result.score}</strong>
                                        </td>
                                        <td>{result.totalQuestions || 100}</td>
                                        <td>
                                            <span className={`percentage-display ${passed ? 'percentage-pass' : 'percentage-fail'}`}>
                                                {percentage.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusClass}`}>
                                                {statusText}
                                            </span>
                                        </td>
                                        <td>{formatDate(result.createdAt)}</td>
                                        <td>
                                            <div className="action-buttons-small">
                                                <button 
                                                    onClick={() => handleViewResultDetails(result)}
                                                    className="view-btn"
                                                    title="View Details"
                                                >
                                                    👁️
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteResult(result._id, result.name)}
                                                    className="delete-btn-small"
                                                    title="Delete Result"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {filteredResults.length === 0 && (
                        <div className="no-data">
                            <p>No results found</p>
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="clear-search-btn"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                    
                    {filteredResults.length > 0 && (
                        <div className="results-summary">
                            <div className="summary-item">
                                <span>Total Results:</span>
                                <strong>{filteredResults.length}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Passed:</span>
                                <strong className="passed-count">
                                    {passedCount}
                                </strong>
                            </div>
                            <div className="summary-item">
                                <span>Failed:</span>
                                <strong className="failed-count">
                                    {failedCount}
                                </strong>
                            </div>
                            <div className="summary-item">
                                <span>Pass Rate:</span>
                                <strong>
                                    {passRate}%
                                </strong>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMarksAnalysis = () => {
        return (
            <div className="marks-analysis">
                <h2>💯 Marks Analysis</h2>
                
                <div className="analysis-header">
                    <h3>Category Progress Towards 100 Marks</h3>
                    <p>Each category needs 100 total marks to become available for quizzes</p>
                </div>
                
                <div className="analysis-grid">
                    {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                        const status = getCategoryStatus(category);
                        return (
                            <div key={category} className="analysis-card">
                                <div className="card-header">
                                    <h3>{category.toUpperCase()}</h3>
                                    <span className={`status-badge ${status.status}`}>
                                        {status.status === 'ready' ? '✅ READY' : 
                                         status.status === 'warning' ? '⚠️ WARNING' : '📝 IN PROGRESS'}
                                    </span>
                                </div>
                                <div className="progress-section">
                                    <div className="progress-info">
                                        <span className="current-marks">{status.currentMarks}/100</span>
                                        <span className="percentage">{status.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="details">
                                    <div className="detail">
                                        <span>Questions Added:</span>
                                        <span>{questions.filter(q => q.category === category).length}</span>
                                    </div>
                                    <div className="detail">
                                        <span>Marks Remaining:</span>
                                        <span>{status.remaining}</span>
                                    </div>
                                    <div className="detail">
                                        <span>Average Marks/Question:</span>
                                        <span>
                                            {questions.filter(q => q.category === category).length > 0 
                                                ? (status.currentMarks / questions.filter(q => q.category === category).length).toFixed(1)
                                                : '0'}
                                        </span>
                                    </div>
                                </div>
                                <div className="recommendation">
                                    {status.status === 'ready' ? 
                                        '✅ Category is ready for student quizzes' :
                                        status.status === 'warning' ?
                                        `⚠️ Add ${status.remaining} more marks to complete this category` :
                                        `📝 Add ${status.remaining} marks to make this category available`
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="summary-section">
                    <h3>📊 Summary</h3>
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-label">Ready Categories:</span>
                            <span className="stat-value">
                                {Object.keys(categoryMarks).filter(cat => getCategoryStatus(cat).status === 'ready').length}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Questions:</span>
                            <span className="stat-value">{questions.length}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Marks:</span>
                            <span className="stat-value">
                                {Object.values(categoryMarks).reduce((a, b) => a + b, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResultDetailsModal = () => {
        if (!resultDetails) return null;

        const percentage = parseFloat(resultDetails.percentage) || 0;
        const passed = resultDetails.passed || percentage >= config.passingPercentage;
        const score = resultDetails.score || 0;
        const totalQuestions = resultDetails.totalQuestions || 100;
        const percentageFormatted = percentage.toFixed(2);
        const scorePercentage = ((score / totalQuestions) * 100).toFixed(2);

        return (
            <div className="modal-overlay" onClick={closeResultModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>📋 Student Result Details</h2>
                        <button onClick={closeResultModal} className="close-btn">×</button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="student-info-section">
                            <h3>👤 Student Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Full Name:</span>
                                    <span className="info-value">{resultDetails.name}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Roll Number:</span>
                                    <span className="info-value">{resultDetails.rollNumber}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Category:</span>
                                    <span className="info-value category-badge-large">{resultDetails.category.toUpperCase()}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Date & Time:</span>
                                    <span className="info-value">{formatFullDate(resultDetails.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`result-status-card ${passed ? 'status-passed' : 'status-failed'}`}>
                            <div className="status-content">
                                <div className="status-icon">
                                    {passed ? (
                                        <div className="icon-success">🎉</div>
                                    ) : (
                                        <div className="icon-failure">📝</div>
                                    )}
                                </div>
                                <div className="status-text">
                                    <h3>{passed ? 'Assessment Passed' : 'Assessment Failed'}</h3>
                                    <p>
                                        {passed 
                                            ? `Student scored ${percentageFormatted}% (${score}/${totalQuestions}) which meets the passing criteria of ${config.passingPercentage}%.`
                                            : `Student scored ${percentageFormatted}% (${score}/${totalQuestions}) which is below the passing criteria of ${config.passingPercentage}%.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="performance-section">
                            <h3>📊 Performance Metrics</h3>
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-icon">📈</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Score Obtained</span>
                                        <span className="metric-value">{score}/{totalQuestions}</span>
                                        <span className="metric-percentage">{scorePercentage}%</span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">💯</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Final Percentage</span>
                                        <span className={`metric-value ${passed ? 'value-success' : 'value-danger'}`}>
                                            {percentageFormatted}%
                                        </span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">🎯</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Status</span>
                                        <span className={`status-badge-large ${passed ? 'badge-success' : 'badge-danger'}`}>
                                            {passed ? '✅ PASSED' : '❌ FAILED'}
                                        </span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">⏱️</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Date</span>
                                        <span className="metric-value">{formatDate(resultDetails.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="performance-visualization">
                            <h3>📈 Performance Analysis</h3>
                            <div className="performance-bar-container">
                                <div className="bar-labels">
                                    <span>0%</span>
                                    <span>Passing ({config.passingPercentage}%)</span>
                                    <span>100%</span>
                                </div>
                                <div className="performance-bar">
                                    <div 
                                        className="performance-fill"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                    <div 
                                        className="passing-marker"
                                        style={{ left: `${config.passingPercentage}%` }}
                                    ></div>
                                </div>
                                <div className="current-performance">
                                    <span className="current-label">Student's Score:</span>
                                    <span className="current-value">{percentageFormatted}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="detailed-breakdown">
                            <h3>📋 Detailed Breakdown</h3>
                            <div className="breakdown-grid">
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Correct Answers:</span>
                                    <span className="breakdown-value success">{score} questions</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Incorrect Answers:</span>
                                    <span className="breakdown-value danger">{totalQuestions - score} questions</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Accuracy Rate:</span>
                                    <span className="breakdown-value">{scorePercentage}%</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Passing Criteria:</span>
                                    <span className="breakdown-value">{config.passingPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button onClick={closeResultModal} className="btn btn-secondary">
                            Close
                        </button>
                        <button 
                            onClick={() => {
                                const printContent = `
                                    <html>
                                        <head>
                                            <title>Result Details - ${resultDetails.name}</title>
                                            <style>
                                                body { font-family: Arial, sans-serif; margin: 20px; }
                                                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                                                .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
                                                .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                                                .status-badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                                                .passed { background: #d4edda; color: #155724; }
                                                .failed { background: #f8d7da; color: #721c24; }
                                                .performance-bar { height: 20px; background: #e0e0e0; border-radius: 10px; margin: 20px 0; position: relative; }
                                                .performance-fill { height: 100%; border-radius: 10px; background: #28a745; }
                                                .passing-marker { position: absolute; top: 0; width: 2px; height: 100%; background: #dc3545; }
                                                @media print { body { font-size: 12px; } }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="header">
                                                <h2>Shamsi Institute of Technology</h2>
                                                <h3>Quiz Result Details</h3>
                                                <h4>${resultDetails.name} - ${resultDetails.rollNumber}</h4>
                                            </div>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <strong>Category:</strong> ${resultDetails.category.toUpperCase()}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Score:</strong> ${score}/${totalQuestions}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Percentage:</strong> ${percentageFormatted}%
                                                </div>
                                                <div class="info-item">
                                                    <strong>Status:</strong> <span class="status-badge ${passed ? 'passed' : 'failed'}">${passed ? 'PASSED' : 'FAILED'}</span>
                                                </div>
                                                <div class="info-item">
                                                    <strong>Date:</strong> ${formatFullDate(resultDetails.createdAt)}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Passing Criteria:</strong> ${config.passingPercentage}%
                                                </div>
                                            </div>
                                            <div class="performance-section">
                                                <h4>Performance Analysis</h4>
                                                <div class="performance-bar">
                                                    <div class="performance-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                                                    <div class="passing-marker" style="left: ${config.passingPercentage}%"></div>
                                                </div>
                                                <p>Student Score: ${percentageFormatted}% | Passing Mark: ${config.passingPercentage}%</p>
                                            </div>
                                        </body>
                                    </html>
                                `;
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(printContent);
                                printWindow.document.close();
                                printWindow.print();
                            }}
                            className="btn btn-primary"
                        >
                            🖨️ Print Result
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-panel">
            <div className="admin-sidebar">
                <div className="sidebar-header">
                    <img src="/images.jpg" alt="Logo" className="logo" />
                    <h3>Shamsi Institute</h3>
                    <p>Admin Dashboard</p>
                </div>
                
                <div className="sidebar-menu">
                    <button 
                        className={activeTab === 'dashboard' ? 'active' : ''}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button 
                        className={activeTab === 'add-questions' ? 'active' : ''}
                        onClick={() => setActiveTab('add-questions')}
                    >
                        ➕ Add Questions
                    </button>
                    <button 
                        className={activeTab === 'manage-questions' ? 'active' : ''}
                        onClick={() => setActiveTab('manage-questions')}
                    >
                        📝 Manage Questions
                    </button>
                    <button 
                        className={activeTab === 'config' ? 'active' : ''}
                        onClick={() => setActiveTab('config')}
                    >
                        ⚙️ Configuration
                    </button>
                    <button 
                        className={activeTab === 'results' ? 'active' : ''}
                        onClick={() => setActiveTab('results')}
                    >
                        📈 View Results
                    </button>
                    <button 
                        className={activeTab === 'marks-analysis' ? 'active' : ''}
                        onClick={() => setActiveTab('marks-analysis')}
                    >
                        💯 Marks Analysis
                    </button>
                </div>
                
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        🔓 Logout
                    </button>
                    <div className="server-status">
                        <span className="status-dot active"></span>
                        <span>Server Online</span>
                    </div>
                </div>
            </div>

            <div className="admin-main">
                <div className="main-header">
                    <h1>Admin Control Panel</h1>
                    <div className="header-actions">
                        <button onClick={loadAllData} className="refresh-btn">
                            🔄 Refresh All
                        </button>
                        {loading && <span className="loading-text">Loading...</span>}
                    </div>
                </div>

                <div className="admin-content">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'add-questions' && renderAddQuestions()}
                    {activeTab === 'manage-questions' && renderManageQuestions()}
                    {activeTab === 'config' && renderConfig()}
                    {activeTab === 'results' && renderResults()}
                    {activeTab === 'marks-analysis' && renderMarksAnalysis()}
                </div>
            </div>

            {selectedResult && renderResultDetailsModal()}
        </div>
    );
};

export default AdminPanel;

const checkCategoryReady = async (category) => {
    try {import React, { useState, useEffect } from 'react';
import { 
    getConfig, 
    updateConfig, 
    getResults, 
    getAllQuestions,
    getDashboardStats,
    addQuestion,
    deleteQuestion,
    deleteResult,
    deleteAllResults,
    getResultDetails
} from '../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [questionData, setQuestionData] = useState({
        category: 'mern',
        questionText: '',
        options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'medium'
    });
    
    const [config, setConfig] = useState({
        quizTime: 30,
        passingPercentage: 40,
        totalQuestions: 100
    });
    
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        todayAttempts: 0,
        categoryStats: {},
        categoryMarks: {}
    });
    
    const [categoryMarks, setCategoryMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [resultDetails, setResultDetails] = useState(null);

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        filterResults();
    }, [searchTerm, results]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadConfig(),
                loadResults(),
                loadQuestions(),
                loadDashboardStats()
            ]);
        } catch (error) {
            console.log('Error loading data:', error);
            alert('Failed to load data. Please check if backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const response = await getConfig();
            if (response.data.success) {
                setConfig(response.data.config);
            }
        } catch (error) {
            console.log('Config not available, using defaults');
        }
    };

    const loadResults = async () => {
        try {
            const response = await getResults();
            if (response.data.success) {
                // Calculate pass/fail status for each result using current config
                const resultsWithStatus = response.data.results.map(result => {
                    const percentage = parseFloat(result.percentage) || 0;
                    const passed = percentage >= config.passingPercentage;
                    return {
                        ...result,
                        passed,
                        status: passed ? 'PASS' : 'FAIL'
                    };
                });
                setResults(resultsWithStatus);
                setFilteredResults(resultsWithStatus);
            }
        } catch (error) {
            console.log('Results not available');
        }
    };

    const loadQuestions = async () => {
        try {
            const response = await getAllQuestions();
            if (response.data.success) {
                setQuestions(response.data.questions);
                
                const marksData = {};
                response.data.questions.forEach(q => {
                    const marks = q.marks || 1;
                    marksData[q.category] = (marksData[q.category] || 0) + marks;
                });
                setCategoryMarks(marksData);
            }
        } catch (error) {
            console.log('Questions not available');
        }
    };

    const loadDashboardStats = async () => {
        try {
            const response = await getDashboardStats();
            if (response.data.success) {
                setStats(response.data.stats);
                if (response.data.stats.categoryMarks) {
                    setCategoryMarks(response.data.stats.categoryMarks);
                }
            }
        } catch (error) {
            console.log('Dashboard stats not available, calculating manually');
            calculateManualStats();
        }
    };

    const calculateManualStats = () => {
        const totalAttempts = results.length;
        const uniqueStudents = new Set(results.map(r => r.rollNumber)).size;
        
        const totalScore = results.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
        const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : 0;
        
        const passedCount = results.filter(r => (parseFloat(r.percentage) || 0) >= config.passingPercentage).length;
        const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(2) : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttempts = results.filter(r => {
            const resultDate = new Date(r.createdAt);
            return resultDate >= today;
        }).length;

        const categoryStats = {};
        const categoryMarksData = {};
        
        ['mern', 'react', 'node', 'mongodb', 'express'].forEach(category => {
            const categoryQuestions = questions.filter(q => q.category === category);
            categoryStats[category] = categoryQuestions.length;
            
            const totalMarks = categoryQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            categoryMarksData[category] = totalMarks;
        });

        setStats(prev => ({
            ...prev,
            totalStudents: uniqueStudents,
            totalAttempts,
            averageScore,
            passRate,
            todayAttempts,
            totalQuestions: questions.length,
            categoryStats,
            categoryMarks: categoryMarksData
        }));
    };

    const getCategoryStatus = (category) => {
        const currentMarks = categoryMarks[category] || 0;
        const percentage = (currentMarks / 100) * 100;
        const remaining = 100 - currentMarks;
        
        let status = 'available';
        if (currentMarks >= 100) {
            status = 'ready';
        } else if (currentMarks >= 80) {
            status = 'warning';
        }
        
        return {
            currentMarks,
            percentage,
            remaining,
            status
        };
    };

    const handleUpdateConfig = async () => {
        try {
            const response = await updateConfig(config);
            if (response.data.success) {
                alert('✅ Configuration updated successfully!');
                loadAllData();
            }
        } catch (error) {
            alert('Error updating configuration');
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        
        if (!questionData.questionText.trim()) {
            alert('Question text is required');
            return;
        }
        
        const validOptions = questionData.options.filter(opt => opt.text.trim() !== '');
        if (validOptions.length < 2) {
            alert('At least 2 options are required');
            return;
        }
        
        const hasCorrect = validOptions.some(opt => opt.isCorrect);
        if (!hasCorrect) {
            alert('Please mark one option as correct');
            return;
        }

        const categoryStatus = getCategoryStatus(questionData.category);
        if (categoryStatus.currentMarks + questionData.marks > 100) {
            alert(`Cannot add question. ${questionData.category.toUpperCase()} category already has ${categoryStatus.currentMarks}/100 marks. Only ${categoryStatus.remaining} marks remaining.`);
            return;
        }

        try {
            const response = await addQuestion({
                ...questionData,
                options: validOptions
            });
            
            if (response.data.success) {
                alert('✅ Question added successfully!');
                setQuestionData({
                    category: 'mern',
                    questionText: '',
                    options: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                    ],
                    marks: 1,
                    difficulty: 'medium'
                });
                loadQuestions();
                loadDashboardStats();
            } else {
                alert('Failed to add question: ' + response.data.message);
            }
        } catch (error) {
            console.error('Error adding question:', error);
            alert('Error adding question. Please try again.');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                const response = await deleteQuestion(questionId);
                if (response.data.success) {
                    alert('✅ Question deleted successfully!');
                    loadQuestions();
                    loadDashboardStats();
                }
            } catch (error) {
                console.error('Error deleting question:', error);
                alert('Error deleting question');
            }
        }
    };

    const handleDeleteResult = async (resultId, studentName) => {
        if (window.confirm(`Are you sure you want to delete result of ${studentName}?`)) {
            try {
                const response = await deleteResult(resultId);
                if (response.data.success) {
                    alert(`✅ Result deleted successfully!`);
                    loadResults();
                }
            } catch (error) {
                console.error('Error deleting result:', error);
                alert('Error deleting result');
            }
        }
    };

    const handleDeleteAllResults = async () => {
        if (results.length === 0) {
            alert('No results to delete');
            return;
        }
        
        if (window.confirm(`Are you sure you want to delete ALL ${results.length} results? This action cannot be undone!`)) {
            try {
                const response = await deleteAllResults();
                if (response.data.success) {
                    alert(`✅ All results deleted successfully! (${results.length} results removed)`);
                    loadResults();
                }
            } catch (error) {
                console.error('Error deleting all results:', error);
                alert('Error deleting all results');
            }
        }
    };

    const handleViewResultDetails = async (result) => {
        try {
            setSelectedResult(result);
            // Try to get detailed result from API
            const response = await getResultDetails(result._id);
            if (response.data.success) {
                const detailedResult = response.data.result;
                const percentage = parseFloat(detailedResult.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                
                setResultDetails({
                    ...detailedResult,
                    passed,
                    percentage,
                    score: detailedResult.score || 0,
                    totalQuestions: detailedResult.totalQuestions || 100
                });
            } else {
                // Fallback to basic result data
                const percentage = parseFloat(result.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                
                setResultDetails({
                    ...result,
                    passed,
                    percentage,
                    score: result.score || 0,
                    totalQuestions: result.totalQuestions || 100,
                    detailedInfo: {
                        score: result.score || 0,
                        totalQuestions: result.totalQuestions || 100,
                        percentage: parseFloat(result.percentage) || 0,
                        passed: passed,
                        category: result.category,
                        date: result.createdAt,
                        timeTaken: result.timeTaken || 'N/A'
                    }
                });
            }
        } catch (error) {
            console.error('Error loading result details:', error);
            // Fallback to basic result data
            const percentage = parseFloat(result.percentage) || 0;
            const passed = percentage >= config.passingPercentage;
            
            setResultDetails({
                ...result,
                passed,
                percentage,
                score: result.score || 0,
                totalQuestions: result.totalQuestions || 100,
                detailedInfo: {
                    score: result.score || 0,
                    totalQuestions: result.totalQuestions || 100,
                    percentage: parseFloat(result.percentage) || 0,
                    passed: passed,
                    category: result.category,
                    date: result.createdAt,
                    timeTaken: result.timeTaken || 'N/A'
                }
            });
        }
    };

    const closeResultModal = () => {
        setSelectedResult(null);
        setResultDetails(null);
    };

    const addOptionField = () => {
        if (questionData.options.length < 6) {
            setQuestionData({
                ...questionData,
                options: [...questionData.options, { text: '', isCorrect: false }]
            });
        } else {
            alert('Maximum 6 options allowed');
        }
    };

    const removeOptionField = (index) => {
        if (questionData.options.length > 2) {
            const newOptions = questionData.options.filter((_, i) => i !== index);
            setQuestionData({
                ...questionData,
                options: newOptions
            });
        } else {
            alert('Minimum 2 options required');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFullDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filterResults = () => {
        if (!searchTerm.trim()) {
            setFilteredResults(results);
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filtered = results.filter(result => {
            const percentage = parseFloat(result.percentage) || 0;
            const passed = percentage >= config.passingPercentage;
            const statusText = passed ? 'pass' : 'fail';
            
            return (
                result.name.toLowerCase().includes(term) ||
                result.rollNumber.toLowerCase().includes(term) ||
                result.category.toLowerCase().includes(term) ||
                statusText.includes(term) ||
                (passed ? 'passed' : 'failed').includes(term)
            );
        });
        
        setFilteredResults(filtered);
    };

    const exportResults = () => {
        if (filteredResults.length === 0) {
            alert('No results to export');
            return;
        }
        
        const csv = [
            ['Name', 'Roll Number', 'Category', 'Score', 'Total Questions', 'Percentage', 'Status', 'Pass/Fail', 'Date'],
            ...filteredResults.map(r => {
                const percentage = parseFloat(r.percentage) || 0;
                const passed = percentage >= config.passingPercentage;
                return [
                    r.name,
                    r.rollNumber,
                    r.category,
                    r.score,
                    r.totalQuestions || 100,
                    `${percentage.toFixed(2)}%`,
                    passed ? 'PASSED' : 'FAILED',
                    passed ? 'PASS' : 'FAIL',
                    formatDate(r.createdAt)
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const exportQuestions = () => {
        if (questions.length === 0) {
            alert('No questions to export');
            return;
        }
        
        const csv = [
            ['Category', 'Question', 'Options', 'Correct Answer', 'Marks', 'Difficulty'],
            ...questions.map(q => [
                q.category,
                q.questionText,
                q.options.map(opt => opt.text).join(' | '),
                q.options.find(opt => opt.isCorrect)?.text || '',
                q.marks || 1,
                q.difficulty || 'medium'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-questions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const renderDashboard = () => {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <h2>📊 Dashboard Overview</h2>
                    <button onClick={loadAllData} className="refresh-btn-small">
                        🔄 Refresh
                    </button>
                </div>
                
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>{stats.totalStudents}</h3>
                            <p>Total Students</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                            <h3>{stats.totalAttempts}</h3>
                            <p>Quiz Attempts</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">❓</div>
                        <div className="stat-info">
                            <h3>{stats.totalQuestions}</h3>
                            <p>Total Questions</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">💯</div>
                        <div className="stat-info">
                            <h3>100</h3>
                            <p>Marks per Category</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <h3>{stats.averageScore}%</h3>
                            <p>Average Score</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-info">
                            <h3>{stats.passRate}%</h3>
                            <p>Pass Rate</p>
                        </div>
                    </div>
                </div>

                <div className="category-status-section">
                    <h3>🎯 Category Marks Status</h3>
                    <div className="category-grid">
                        {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                            const status = getCategoryStatus(category);
                            return (
                                <div key={category} className={`category-card ${status.status}`}>
                                    <div className="category-name">{category.toUpperCase()}</div>
                                    <div className="marks-info">
                                        <span className="marks-value">{status.currentMarks}/100</span>
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill"
                                                style={{ width: `${status.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="status-text">
                                        {status.status === 'ready' ? '✅ READY' : 
                                         status.status === 'warning' ? `⚠️ ${status.remaining} marks left` : 
                                         '📝 Available'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="recent-activity">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                        {results.slice(0, 5).map((result, index) => {
                            const percentage = parseFloat(result.percentage) || 0;
                            const passed = percentage >= config.passingPercentage;
                            
                            return (
                                <div key={index} className="activity-item">
                                    <div className="activity-icon">
                                        {passed ? '✅' : '❌'}
                                    </div>
                                    <div className="activity-details">
                                        <p><strong>{result.name}</strong> completed {result.category} quiz</p>
                                        <span>Score: {result.score} • Status: {passed ? 'PASS' : 'FAIL'} • {formatDate(result.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderAddQuestions = () => {
        return (
            <div className="add-questions">
                <h2>➕ Add Questions</h2>
                
                <div className="category-limits">
                    <h4>📊 Category Marks Status</h4>
                    <div className="limits-grid">
                        {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                            const status = getCategoryStatus(category);
                            return (
                                <div key={category} className="limit-item">
                                    <span className="limit-category">{category.toUpperCase()}</span>
                                    <span className="limit-marks">{status.currentMarks}/100</span>
                                    <div className="limit-progress">
                                        <div 
                                            className="limit-fill"
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="question-form">
                    <form onSubmit={handleAddQuestion}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    value={questionData.category}
                                    onChange={(e) => setQuestionData({...questionData, category: e.target.value})}
                                >
                                    {['mern', 'react', 'node', 'mongodb', 'express'].map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat.toUpperCase()} ({getCategoryStatus(cat).currentMarks}/100)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Marks</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={questionData.marks}
                                    onChange={(e) => setQuestionData({...questionData, marks: parseInt(e.target.value)})}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Difficulty</label>
                                <select 
                                    value={questionData.difficulty}
                                    onChange={(e) => setQuestionData({...questionData, difficulty: e.target.value})}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Question Text</label>
                            <textarea
                                value={questionData.questionText}
                                onChange={(e) => setQuestionData({...questionData, questionText: e.target.value})}
                                placeholder="Enter question text here..."
                                rows="4"
                                required
                            />
                        </div>
                        
                        <div className="options-section">
                            <h4>Options (Mark correct answer)</h4>
                            {questionData.options.map((option, index) => (
                                <div key={index} className="option-item">
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        checked={option.isCorrect}
                                        onChange={() => {
                                            const newOptions = questionData.options.map((opt, i) => ({
                                                ...opt,
                                                isCorrect: i === index
                                            }));
                                            setQuestionData({...questionData, options: newOptions});
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => {
                                            const newOptions = [...questionData.options];
                                            newOptions[index].text = e.target.value;
                                            setQuestionData({...questionData, options: newOptions});
                                        }}
                                        placeholder={`Option ${index + 1}`}
                                        required={index < 2}
                                    />
                                    {questionData.options.length > 2 && (
                                        <button 
                                            type="button"
                                            onClick={() => removeOptionField(index)}
                                            className="remove-btn"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            <button type="button" onClick={addOptionField} className="add-btn">
                                + Add Option
                            </button>
                        </div>
                        
                        <button type="submit" className="submit-btn">
                            💾 Add Question
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    const renderManageQuestions = () => {
        return (
            <div className="manage-questions">
                <h2>📝 Manage Questions</h2>
                
                <div className="actions-bar">
                    <button onClick={exportQuestions} className="export-btn">
                        📤 Export Questions
                    </button>
                </div>
                
                <div className="questions-list">
                    {questions.length === 0 ? (
                        <p className="no-data">No questions available</p>
                    ) : (
                        questions.map((question, index) => (
                            <div key={question._id || index} className="question-card">
                                <div className="question-header">
                                    <span className="category-badge">{question.category}</span>
                                    <span className="marks-badge">{question.marks} marks</span>
                                    <span className="difficulty-badge">{question.difficulty}</span>
                                </div>
                                <p className="question-text">{question.questionText}</p>
                                <div className="options-list">
                                    {question.options.map((opt, idx) => (
                                        <div key={idx} className={`option ${opt.isCorrect ? 'correct' : ''}`}>
                                            {opt.text}
                                            {opt.isCorrect && <span className="correct-mark">✓</span>}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => handleDeleteQuestion(question._id)}
                                    className="delete-btn"
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderConfig = () => {
        return (
            <div className="config-page">
                <h2>⚙️ Quiz Configuration</h2>
                
                <div className="config-form">
                    <div className="form-group">
                        <label>Quiz Time (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="180"
                            value={config.quizTime}
                            onChange={(e) => setConfig({...config, quizTime: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Passing Percentage (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={config.passingPercentage}
                            onChange={(e) => setConfig({...config, passingPercentage: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Questions per Quiz</label>
                        <input
                            type="number"
                            min="1"
                            value={config.totalQuestions}
                            onChange={(e) => setConfig({...config, totalQuestions: parseInt(e.target.value)})}
                        />
                    </div>
                    
                    <button onClick={handleUpdateConfig} className="save-btn">
                        💾 Save Configuration
                    </button>
                </div>
                
                <div className="current-config">
                    <h3>Current Settings</h3>
                    <div className="config-details">
                        <div className="detail">
                            <span>Quiz Time:</span>
                            <span>{config.quizTime} minutes</span>
                        </div>
                        <div className="detail">
                            <span>Passing Percentage:</span>
                            <span>{config.passingPercentage}%</span>
                        </div>
                        <div className="detail">
                            <span>Questions per Quiz:</span>
                            <span>{config.totalQuestions}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResults = () => {
        // Calculate summary data
        const passedCount = filteredResults.filter(r => {
            const percentage = parseFloat(r.percentage) || 0;
            return percentage >= config.passingPercentage;
        }).length;
        
        const failedCount = filteredResults.length - passedCount;
        const passRate = filteredResults.length > 0 ? ((passedCount / filteredResults.length) * 100).toFixed(2) : '0';

        return (
            <div className="results-page">
                <h2>📈 Quiz Results</h2>
                
                <div className="results-header">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search by name, roll number, category, or status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="search-icon">🔍</span>
                    </div>
                    
                    <div className="action-buttons">
                        <button onClick={exportResults} className="export-btn">
                            📤 Export CSV
                        </button>
                        <button onClick={handleDeleteAllResults} className="delete-all-btn">
                            🗑️ Delete All
                        </button>
                    </div>
                </div>
                
                <div className="results-table-container">
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Category</th>
                                <th>Score</th>
                                <th>Total</th>
                                <th>Percentage</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((result, index) => {
                                const percentage = parseFloat(result.percentage) || 0;
                                const passed = percentage >= config.passingPercentage;
                                const statusText = passed ? '✅ PASS' : '❌ FAIL';
                                const statusClass = passed ? 'status-passed' : 'status-failed';
                                
                                return (
                                    <tr key={result._id || index} className={passed ? 'passed-row' : 'failed-row'}>
                                        <td>{result.name}</td>
                                        <td>{result.rollNumber}</td>
                                        <td>
                                            <span className="category-tag">{result.category.toUpperCase()}</span>
                                        </td>
                                        <td>
                                            <strong>{result.score}</strong>
                                        </td>
                                        <td>{result.totalQuestions || 100}</td>
                                        <td>
                                            <span className={`percentage-display ${passed ? 'percentage-pass' : 'percentage-fail'}`}>
                                                {percentage.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusClass}`}>
                                                {statusText}
                                            </span>
                                        </td>
                                        <td>{formatDate(result.createdAt)}</td>
                                        <td>
                                            <div className="action-buttons-small">
                                                <button 
                                                    onClick={() => handleViewResultDetails(result)}
                                                    className="view-btn"
                                                    title="View Details"
                                                >
                                                    👁️
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteResult(result._id, result.name)}
                                                    className="delete-btn-small"
                                                    title="Delete Result"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {filteredResults.length === 0 && (
                        <div className="no-data">
                            <p>No results found</p>
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="clear-search-btn"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                    
                    {filteredResults.length > 0 && (
                        <div className="results-summary">
                            <div className="summary-item">
                                <span>Total Results:</span>
                                <strong>{filteredResults.length}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Passed:</span>
                                <strong className="passed-count">
                                    {passedCount}
                                </strong>
                            </div>
                            <div className="summary-item">
                                <span>Failed:</span>
                                <strong className="failed-count">
                                    {failedCount}
                                </strong>
                            </div>
                            <div className="summary-item">
                                <span>Pass Rate:</span>
                                <strong>
                                    {passRate}%
                                </strong>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMarksAnalysis = () => {
        return (
            <div className="marks-analysis">
                <h2>💯 Marks Analysis</h2>
                
                <div className="analysis-header">
                    <h3>Category Progress Towards 100 Marks</h3>
                    <p>Each category needs 100 total marks to become available for quizzes</p>
                </div>
                
                <div className="analysis-grid">
                    {['mern', 'react', 'node', 'mongodb', 'express'].map(category => {
                        const status = getCategoryStatus(category);
                        return (
                            <div key={category} className="analysis-card">
                                <div className="card-header">
                                    <h3>{category.toUpperCase()}</h3>
                                    <span className={`status-badge ${status.status}`}>
                                        {status.status === 'ready' ? '✅ READY' : 
                                         status.status === 'warning' ? '⚠️ WARNING' : '📝 IN PROGRESS'}
                                    </span>
                                </div>
                                <div className="progress-section">
                                    <div className="progress-info">
                                        <span className="current-marks">{status.currentMarks}/100</span>
                                        <span className="percentage">{status.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="details">
                                    <div className="detail">
                                        <span>Questions Added:</span>
                                        <span>{questions.filter(q => q.category === category).length}</span>
                                    </div>
                                    <div className="detail">
                                        <span>Marks Remaining:</span>
                                        <span>{status.remaining}</span>
                                    </div>
                                    <div className="detail">
                                        <span>Average Marks/Question:</span>
                                        <span>
                                            {questions.filter(q => q.category === category).length > 0 
                                                ? (status.currentMarks / questions.filter(q => q.category === category).length).toFixed(1)
                                                : '0'}
                                        </span>
                                    </div>
                                </div>
                                <div className="recommendation">
                                    {status.status === 'ready' ? 
                                        '✅ Category is ready for student quizzes' :
                                        status.status === 'warning' ?
                                        `⚠️ Add ${status.remaining} more marks to complete this category` :
                                        `📝 Add ${status.remaining} marks to make this category available`
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="summary-section">
                    <h3>📊 Summary</h3>
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-label">Ready Categories:</span>
                            <span className="stat-value">
                                {Object.keys(categoryMarks).filter(cat => getCategoryStatus(cat).status === 'ready').length}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Questions:</span>
                            <span className="stat-value">{questions.length}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Marks:</span>
                            <span className="stat-value">
                                {Object.values(categoryMarks).reduce((a, b) => a + b, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResultDetailsModal = () => {
        if (!resultDetails) return null;

        const percentage = parseFloat(resultDetails.percentage) || 0;
        const passed = resultDetails.passed || percentage >= config.passingPercentage;
        const score = resultDetails.score || 0;
        const totalQuestions = resultDetails.totalQuestions || 100;
        const percentageFormatted = percentage.toFixed(2);
        const scorePercentage = ((score / totalQuestions) * 100).toFixed(2);

        return (
            <div className="modal-overlay" onClick={closeResultModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>📋 Student Result Details</h2>
                        <button onClick={closeResultModal} className="close-btn">×</button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="student-info-section">
                            <h3>👤 Student Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Full Name:</span>
                                    <span className="info-value">{resultDetails.name}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Roll Number:</span>
                                    <span className="info-value">{resultDetails.rollNumber}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Category:</span>
                                    <span className="info-value category-badge-large">{resultDetails.category.toUpperCase()}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Date & Time:</span>
                                    <span className="info-value">{formatFullDate(resultDetails.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`result-status-card ${passed ? 'status-passed' : 'status-failed'}`}>
                            <div className="status-content">
                                <div className="status-icon">
                                    {passed ? (
                                        <div className="icon-success">🎉</div>
                                    ) : (
                                        <div className="icon-failure">📝</div>
                                    )}
                                </div>
                                <div className="status-text">
                                    <h3>{passed ? 'Assessment Passed' : 'Assessment Failed'}</h3>
                                    <p>
                                        {passed 
                                            ? `Student scored ${percentageFormatted}% (${score}/${totalQuestions}) which meets the passing criteria of ${config.passingPercentage}%.`
                                            : `Student scored ${percentageFormatted}% (${score}/${totalQuestions}) which is below the passing criteria of ${config.passingPercentage}%.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="performance-section">
                            <h3>📊 Performance Metrics</h3>
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-icon">📈</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Score Obtained</span>
                                        <span className="metric-value">{score}/{totalQuestions}</span>
                                        <span className="metric-percentage">{scorePercentage}%</span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">💯</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Final Percentage</span>
                                        <span className={`metric-value ${passed ? 'value-success' : 'value-danger'}`}>
                                            {percentageFormatted}%
                                        </span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">🎯</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Status</span>
                                        <span className={`status-badge-large ${passed ? 'badge-success' : 'badge-danger'}`}>
                                            {passed ? '✅ PASSED' : '❌ FAILED'}
                                        </span>
                                    </div>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-icon">⏱️</div>
                                    <div className="metric-info">
                                        <span className="metric-label">Date</span>
                                        <span className="metric-value">{formatDate(resultDetails.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="performance-visualization">
                            <h3>📈 Performance Analysis</h3>
                            <div className="performance-bar-container">
                                <div className="bar-labels">
                                    <span>0%</span>
                                    <span>Passing ({config.passingPercentage}%)</span>
                                    <span>100%</span>
                                </div>
                                <div className="performance-bar">
                                    <div 
                                        className="performance-fill"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                    <div 
                                        className="passing-marker"
                                        style={{ left: `${config.passingPercentage}%` }}
                                    ></div>
                                </div>
                                <div className="current-performance">
                                    <span className="current-label">Student's Score:</span>
                                    <span className="current-value">{percentageFormatted}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="detailed-breakdown">
                            <h3>📋 Detailed Breakdown</h3>
                            <div className="breakdown-grid">
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Correct Answers:</span>
                                    <span className="breakdown-value success">{score} questions</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Incorrect Answers:</span>
                                    <span className="breakdown-value danger">{totalQuestions - score} questions</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Accuracy Rate:</span>
                                    <span className="breakdown-value">{scorePercentage}%</span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Passing Criteria:</span>
                                    <span className="breakdown-value">{config.passingPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button onClick={closeResultModal} className="btn btn-secondary">
                            Close
                        </button>
                        <button 
                            onClick={() => {
                                const printContent = `
                                    <html>
                                        <head>
                                            <title>Result Details - ${resultDetails.name}</title>
                                            <style>
                                                body { font-family: Arial, sans-serif; margin: 20px; }
                                                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                                                .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
                                                .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                                                .status-badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                                                .passed { background: #d4edda; color: #155724; }
                                                .failed { background: #f8d7da; color: #721c24; }
                                                .performance-bar { height: 20px; background: #e0e0e0; border-radius: 10px; margin: 20px 0; position: relative; }
                                                .performance-fill { height: 100%; border-radius: 10px; background: #28a745; }
                                                .passing-marker { position: absolute; top: 0; width: 2px; height: 100%; background: #dc3545; }
                                                @media print { body { font-size: 12px; } }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="header">
                                                <h2>Shamsi Institute of Technology</h2>
                                                <h3>Quiz Result Details</h3>
                                                <h4>${resultDetails.name} - ${resultDetails.rollNumber}</h4>
                                            </div>
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <strong>Category:</strong> ${resultDetails.category.toUpperCase()}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Score:</strong> ${score}/${totalQuestions}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Percentage:</strong> ${percentageFormatted}%
                                                </div>
                                                <div class="info-item">
                                                    <strong>Status:</strong> <span class="status-badge ${passed ? 'passed' : 'failed'}">${passed ? 'PASSED' : 'FAILED'}</span>
                                                </div>
                                                <div class="info-item">
                                                    <strong>Date:</strong> ${formatFullDate(resultDetails.createdAt)}
                                                </div>
                                                <div class="info-item">
                                                    <strong>Passing Criteria:</strong> ${config.passingPercentage}%
                                                </div>
                                            </div>
                                            <div class="performance-section">
                                                <h4>Performance Analysis</h4>
                                                <div class="performance-bar">
                                                    <div class="performance-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                                                    <div class="passing-marker" style="left: ${config.passingPercentage}%"></div>
                                                </div>
                                                <p>Student Score: ${percentageFormatted}% | Passing Mark: ${config.passingPercentage}%</p>
                                            </div>
                                        </body>
                                    </html>
                                `;
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(printContent);
                                printWindow.document.close();
                                printWindow.print();
                            }}
                            className="btn btn-primary"
                        >
                            🖨️ Print Result
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-panel">
            <div className="admin-sidebar">
                <div className="sidebar-header">
                    <img src="/images.jpg" alt="Logo" className="logo" />
                    <h3>Shamsi Institute</h3>
                    <p>Admin Dashboard</p>
                </div>
                
                <div className="sidebar-menu">
                    <button 
                        className={activeTab === 'dashboard' ? 'active' : ''}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button 
                        className={activeTab === 'add-questions' ? 'active' : ''}
                        onClick={() => setActiveTab('add-questions')}
                    >
                        ➕ Add Questions
                    </button>
                    <button 
                        className={activeTab === 'manage-questions' ? 'active' : ''}
                        onClick={() => setActiveTab('manage-questions')}
                    >
                        📝 Manage Questions
                    </button>
                    <button 
                        className={activeTab === 'config' ? 'active' : ''}
                        onClick={() => setActiveTab('config')}
                    >
                        ⚙️ Configuration
                    </button>
                    <button 
                        className={activeTab === 'results' ? 'active' : ''}
                        onClick={() => setActiveTab('results')}
                    >
                        📈 View Results
                    </button>
                    <button 
                        className={activeTab === 'marks-analysis' ? 'active' : ''}
                        onClick={() => setActiveTab('marks-analysis')}
                    >
                        💯 Marks Analysis
                    </button>
                </div>
                
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        🔓 Logout
                    </button>
                    <div className="server-status">
                        <span className="status-dot active"></span>
                        <span>Server Online</span>
                    </div>
                </div>
            </div>

            <div className="admin-main">
                <div className="main-header">
                    <h1>Admin Control Panel</h1>
                    <div className="header-actions">
                        <button onClick={loadAllData} className="refresh-btn">
                            🔄 Refresh All
                        </button>
                        {loading && <span className="loading-text">Loading...</span>}
                    </div>
                </div>

                <div className="admin-content">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'add-questions' && renderAddQuestions()}
                    {activeTab === 'manage-questions' && renderManageQuestions()}
                    {activeTab === 'config' && renderConfig()}
                    {activeTab === 'results' && renderResults()}
                    {activeTab === 'marks-analysis' && renderMarksAnalysis()}
                </div>
            </div>

            {selectedResult && renderResultDetailsModal()}
        </div>
    );
};

export default AdminPanel;
        const questions = await Question.find({ category: category });
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        return totalMarks >= 100;
    } catch (error) {
        console.error('Error checking category ready:', error);
        return false;
    }
};

const updateAllCategoryStatus = async () => {
    try {
        const categories = ['mern', 'react', 'node', 'mongodb', 'express'];
        const categoryStatus = {};
        
        for (const category of categories) {
            categoryStatus[category] = await checkCategoryReady(category);
        }
        
        let config = await Config.findOne();
        if (!config) {
            config = new Config({ categoryStatus });
        } else {
            config.categoryStatus = categoryStatus;
            config.updatedAt = new Date();
        }
        
        await config.save();
        return categoryStatus;
    } catch (error) {
        console.error('Error updating category status:', error);
        return null;
    }
};

router.get('/available-categories', async (req, res) => {
    try {
        const config = await Config.findOne();
        const availableCategories = [];
        
        const categories = [
            { value: 'mern', label: 'MERN Stack', icon: '⚛️' },
            { value: 'react', label: 'React.js', icon: '⚛️' },
            { value: 'node', label: 'Node.js', icon: '🟢' },
            { value: 'mongodb', label: 'MongoDB', icon: '🍃' },
            { value: 'express', label: 'Express.js', icon: '🚀' }
        ];
        
        for (const cat of categories) {
            const isReady = config?.categoryStatus?.[cat.value] || false;
            if (isReady) {
                const questions = await Question.find({ category: cat.value });
                const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
                
                availableCategories.push({
                    ...cat,
                    totalMarks,
                    questionCount: questions.length,
                    isReady: true
                });
            }
        }
        
        res.json({
            success: true,
            categories: availableCategories,
            totalAvailable: availableCategories.length
        });
    } catch (error) {
        console.error('Error fetching available categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available categories'
        });
    }
});

router.post('/questions', async (req, res) => {
    try {
        const { category, questionText, options, marks, difficulty } = req.body;
        
        if (!category || !questionText || !options || options.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category, question text, and options are required'
            });
        }
        
        
        const existingQuestions = await Question.find({ category: category.toLowerCase() });
        const currentTotalMarks = existingQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const newQuestionMarks = marks || 1;
        
        if (currentTotalMarks + newQuestionMarks > 100) {
            const remaining = 100 - currentTotalMarks;
            return res.status(400).json({
                success: false,
                message: `Cannot add question. Category "${category}" already has ${currentTotalMarks}/100 marks. Only ${remaining} marks remaining.`,
                currentMarks: currentTotalMarks,
                remainingMarks: remaining
            });
        }
        
        const question = new Question({
            category: category.toLowerCase(),
            questionText: questionText.trim(),
            options: options.map(opt => ({
                text: opt.text.trim(),
                isCorrect: opt.isCorrect || false
            })),
            marks: newQuestionMarks,
            difficulty: difficulty || 'medium'
        });
        
        await question.save();
        
        const newTotalMarks = currentTotalMarks + newQuestionMarks;
        const isCategoryReady = newTotalMarks >= 100;
        
        await updateAllCategoryStatus();
        
        res.json({
            success: true,
            message: '✅ Question added successfully!',
            question: {
                id: question._id,
                category: question.category,
                questionText: question.questionText,
                options: question.options,
                marks: question.marks,
                difficulty: question.difficulty
            },
            categoryStatus: {
                currentMarks: newTotalMarks,
                isReady: isCategoryReady,
                remaining: 100 - newTotalMarks
            }
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

router.get('/category-stats', async (req, res) => {
    try {
        const categories = ['mern', 'react', 'node', 'mongodb', 'express'];
        const stats = {};
        
        for (const category of categories) {
            const questions = await Question.find({ category });
            const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
            const questionCount = questions.length;
            
            stats[category] = {
                totalMarks,
                questionCount,
                isReady: totalMarks >= 100,
                percentage: (totalMarks / 100) * 100,
                remainingMarks: 100 - totalMarks,
                averageMarks: questionCount > 0 ? (totalMarks / questionCount).toFixed(2) : 0
            };
        }
        
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category statistics'
        });
    }
});


router.get('/dashboard-full', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalQuestions = await Question.countDocuments();
        const totalResults = await User.countDocuments({ score: { $gt: 0 } });
        
        
        const categoryStats = await Question.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalMarks: { $sum: '$marks' },
                    questionCount: { $sum: 1 },
                    averageMarks: { $avg: '$marks' }
                }
            }
        ]);
        
        const recentResults = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name rollNumber category score percentage createdAt');
        
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayResults = await User.countDocuments({
            createdAt: { $gte: today }
        });
        
        const config = await Config.findOne();
        
        const categories = ['mern', 'react', 'node', 'mongodb', 'express'];
        const categoryStatus = {};
        for (const cat of categories) {
            const questions = await Question.find({ category: cat });
            const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
            categoryStatus[cat] = {
                totalMarks,
                questionCount: questions.length,
                isReady: totalMarks >= 100,
                percentage: (totalMarks / 100) * 100,
                remaining: 100 - totalMarks
            };
        }
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                totalQuestions,
                totalResults,
                todayResults,
                categoryStats,
                recentResults,
                categoryStatus,
                config: config || {
                    quizTime: 30,
                    passingPercentage: 40,
                    totalQuestions: 100
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data'
        });
    }
});

router.post('/update-category-status', async (req, res) => {
    try {
        const categoryStatus = await updateAllCategoryStatus();
        res.json({
            success: true,
            message: 'Category status updated successfully',
            categoryStatus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.delete('/questions/:id', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        const category = question.category;
        await Question.findByIdAndDelete(req.params.id);
        
        await updateAllCategoryStatus();
        
        res.json({
            success: true,
            message: '✅ Question deleted successfully!',
            deletedQuestion: {
                id: question._id,
                category: question.category,
                questionText: question.questionText
            }
        });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete question'
        });
    }
});

module.exports = router;