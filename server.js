const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://khalid:khalid123@cluster0.e6gmkpo.mongodb.net/quiz_system?retryWrites=true&w=majority&appName=Cluster0";

console.log("🚀 Shamsi Institute API Starting...");

// Simple MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) return true;
    
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    console.log("✅ MongoDB Connected!");
    return true;
  } catch (error) {
    console.log("⚠️ MongoDB Warning:", error.message);
    return false;
  }
};

// ==================== ROUTES ====================

// Home
app.get("/", async (req, res) => {
  const dbStatus = await connectDB();
  
  res.json({
    success: true,
    message: "🎓 Shamsi Institute Quiz API",
    version: "3.0.0",
    database: dbStatus ? "✅ Connected" : "❌ Disconnected",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "GET /api/health",
      dbTest: "GET /api/db-test",
      adminLogin: "POST /admin/login",
      register: "POST /api/register",
      getQuestions: "GET /api/questions/:category",
      submitQuiz: "POST /api/submit"
    }
  });
});

// Health
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// DB Test
app.get("/api/db-test", async (req, res) => {
  try {
    const connected = await connectDB();
    res.json({
      success: connected,
      message: connected ? "Database connected" : "Database not connected"
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Database test failed"
    });
  }
});

// Admin Login (ALWAYS WORKS)
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  
  console.log("🔐 Login attempt:", username);
  
  if (username === "admin" && password === "admin123") {
    res.json({
      success: true,
      message: "Login successful",
      token: "admin_jwt_token_2024",
      user: {
        username: "admin",
        role: "superadmin"
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid username or password"
    });
  }
});

// Student Registration
app.post("/api/register", async (req, res) => {
  try {
    const { name, rollNumber, category } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, roll number, and category"
      });
    }
    
    await connectDB();
    
    // Simple schema
    const Registration = mongoose.model("Registration") || 
      mongoose.model("Registration", {
        name: String,
        rollNumber: String,
        category: String,
        registeredAt: { type: Date, default: Date.now }
      });
    
    const registration = await Registration.create({
      name,
      rollNumber: `SI-${rollNumber}`,
      category: category.toLowerCase()
    });
    
    res.json({
      success: true,
      message: "Registration successful!",
      data: {
        name: registration.name,
        rollNumber: registration.rollNumber,
        category: registration.category,
        registeredAt: registration.registeredAt
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

// Get Questions
app.get("/api/questions/:category", async (req, res) => {
  try {
    const { category } = req.params;
    
    await connectDB();
    
    const Question = mongoose.model("Question") || 
      mongoose.model("Question", {
        category: String,
        questionText: String,
        options: Array,
        marks: { type: Number, default: 1 }
      });
    
    const questions = await Question.find({ 
      category: category.toLowerCase() 
    }).limit(10);
    
    if (questions.length > 0) {
      const safeQuestions = questions.map(q => ({
        id: q._id,
        question: q.questionText,
        options: q.options.map(opt => ({ text: opt.text })),
        marks: q.marks || 1
      }));
      
      return res.json({
        success: true,
        questions: safeQuestions,
        count: safeQuestions.length,
        config: {
          time: 30,
          passingPercentage: 40,
          totalQuestions: 50
        }
      });
    }
    
    // Fallback questions
    res.json({
      success: true,
      questions: [
        {
          id: "1",
          question: "HTML ka full form kya hai?",
          options: [
            { text: "Hyper Text Markup Language" },
            { text: "High Text Machine Language" },
            { text: "Hyper Tabular Markup Language" },
            { text: "None of these" }
          ],
          marks: 1
        },
        {
          id: "2",
          question: "HTML mein image insert karne ke liye kaun sa tag use hota hai?",
          options: [
            { text: "<img>" },
            { text: "<picture>" },
            { text: "<image>" },
            { text: "<src>" }
          ],
          marks: 1
        }
      ],
      count: 2,
      message: "Using sample questions"
    });
    
  } catch (error) {
    res.json({
      success: true,
      questions: [
        {
          id: "1",
          question: "Sample question 1",
          options: [
            { text: "Option A" },
            { text: "Option B" },
            { text: "Option C" },
            { text: "Option D" }
          ],
          marks: 1
        }
      ],
      count: 1,
      message: "Fallback questions"
    });
  }
});

// Submit Quiz
app.post("/api/submit", async (req, res) => {
  try {
    const { name, rollNumber, category, score, percentage } = req.body;
    
    if (!name || !rollNumber || !category) {
      return res.status(400).json({
        success: false,
        message: "Required information missing"
      });
    }
    
    await connectDB();
    
    const User = mongoose.model("User") || 
      mongoose.model("User", {
        name: String,
        rollNumber: String,
        category: String,
        score: Number,
        percentage: Number,
        passed: Boolean,
        submittedAt: { type: Date, default: Date.now }
      });
    
    const result = await User.create({
      name,
      rollNumber: rollNumber.startsWith("SI-") ? rollNumber : `SI-${rollNumber}`,
      category: category.toLowerCase(),
      score: score || 0,
      percentage: percentage || 0,
      passed: (percentage || 0) >= 40
    });
    
    res.json({
      success: true,
      message: "Quiz submitted successfully!",
      result: {
        name: result.name,
        rollNumber: result.rollNumber,
        score: result.score,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit quiz"
    });
  }
});

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// Export for Vercel
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}
