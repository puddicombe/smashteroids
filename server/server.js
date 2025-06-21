const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // Use Heroku's PORT environment variable or default to 3000

// Add middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve game files from public directory

// Security headers middleware
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Strict transport security (for HTTPS)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
    next();
});

// In-memory high scores
let highScores = [];
const HIGH_SCORE_COUNT = 15; // Store more scores for a larger leaderboard
const SCORE_FILE_PATH = path.join(__dirname, 'highscores.json');

// Check if we're running on Heroku
const isHeroku = process.env.NODE_ENV === 'production';

// Default high scores
const defaultScores = [
    { initials: "JP1", score: 10000, timestamp: Date.now() },
    { initials: "JP2", score: 8000, timestamp: Date.now() },
    { initials: "JP3", score: 6000, timestamp: Date.now() },
    { initials: "JP4", score: 4000, timestamp: Date.now() },
    { initials: "JP5", score: 2000, timestamp: Date.now() }
];

// Load initial high scores
if (isHeroku) {
    // On Heroku, just use the default scores since the filesystem is ephemeral
    console.log('Running on Heroku, using default high scores');
    highScores = [...defaultScores];
} else {
    // In development, try to load from file
    try {
        if (fs.existsSync(SCORE_FILE_PATH)) {
            const data = fs.readFileSync(SCORE_FILE_PATH, 'utf8');
            highScores = JSON.parse(data);
            console.log('Loaded existing high scores from file');
        } else {
            // Initialize with default scores if no file exists
            highScores = [...defaultScores];
            // Save the default scores
            fs.writeFileSync(SCORE_FILE_PATH, JSON.stringify(highScores, null, 2));
            console.log('Created default high scores file');
        }
    } catch (err) {
        console.error('Error loading high scores:', err);
        // Initialize with default scores if there's an error
        highScores = [...defaultScores];
    }
}

// Rate limiting storage
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SUBMISSIONS_PER_WINDOW = 3; // Max 3 submissions per minute per IP

// Rate limiting middleware
function rateLimit(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const now = Date.now();
    
    // Clean old entries
    for (const [ip, data] of rateLimitStore.entries()) {
        if (now - data.timestamp > RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(ip);
        }
    }
    
    // Check rate limit
    const clientData = rateLimitStore.get(clientIP);
    if (clientData) {
        if (clientData.count >= MAX_SUBMISSIONS_PER_WINDOW) {
            return res.status(429).json({ 
                error: 'Too many submissions. Please wait before submitting again.',
                retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.timestamp)) / 1000)
            });
        }
        clientData.count++;
    } else {
        rateLimitStore.set(clientIP, { count: 1, timestamp: now });
    }
    
    next();
}

// Get high scores
app.get('/api/highscores', (req, res) => {
    res.json(highScores);
});

// Submit a high score
app.post('/api/highscores', rateLimit, (req, res) => {
    const { initials, score, gameData } = req.body;
    
    // Add detailed logging for debugging
    console.log('Received highscore submission:');
    console.log('Initials:', initials);
    console.log('Score:', score, typeof score);
    console.log('Game Data:', gameData);
    console.log('IP:', req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']);
    
    // Enhanced validation
    if (!initials || score === undefined || score === null || typeof score !== 'number') {
        console.log('Validation failed: Missing initials or score, or score is not a number');
        return res.status(400).json({ error: 'Invalid score data' });
    }
    
    // More sophisticated score validation
    if (score < 0) {
        console.log('Validation failed: Negative score:', score);
        return res.status(400).json({ error: 'Score cannot be negative' });
    }
    
    // Dynamic score limit based on game data
    let maxScore = 1000000; // Default max
    if (gameData && gameData.level) {
        // Estimate reasonable max score based on level
        // Level 1: ~5000, Level 10: ~50000, etc.
        maxScore = Math.min(1000000, gameData.level * 5000);
    }
    
    if (score > maxScore) {
        console.log('Validation failed: Score exceeds reasonable limit:', score, 'max:', maxScore);
        return res.status(400).json({ 
            error: 'Score exceeds reasonable limit for this level',
            maxScore: maxScore
        });
    }
    
    // Validate game data consistency
    if (gameData) {
        // Check if level and score are consistent
        if (gameData.level && gameData.level > 0) {
            const expectedMinScore = (gameData.level - 1) * 1000; // Minimum expected score for level
            if (score < expectedMinScore) {
                console.log('Validation failed: Score too low for level:', score, 'level:', gameData.level);
                return res.status(400).json({ 
                    error: 'Score too low for claimed level',
                    expectedMinScore: expectedMinScore
                });
            }
        }
        
        // Check timestamp consistency
        if (gameData.timestamp) {
            const submissionTime = Date.now();
            const gameTime = gameData.timestamp;
            const timeDiff = Math.abs(submissionTime - gameTime);
            
            // Allow 5 minute window for submission
            if (timeDiff > 5 * 60 * 1000) {
                console.log('Validation failed: Timestamp too old:', timeDiff, 'ms');
                return res.status(400).json({ error: 'Game session too old' });
            }
        }
    }
    
    // Sanitize initials with enhanced validation
    const sanitizedInitials = (initials || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 3);

    if (!sanitizedInitials) {
        console.log('Validation failed: initials contain no valid characters');
        return res.status(400).json({ error: 'Invalid initials' });
    }
    
    // Check for suspicious patterns
    if (sanitizedInitials === 'AAA' || sanitizedInitials === 'XXX' || sanitizedInitials === 'ZZZ') {
        console.log('Validation failed: Suspicious initials pattern:', sanitizedInitials);
        return res.status(400).json({ error: 'Suspicious initials pattern' });
    }
    
    // Add new score with enhanced metadata
    const newScore = { 
        initials: sanitizedInitials, 
        score, 
        timestamp: Date.now(),
        ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        gameData: gameData || {}
    };
    
    highScores.push(newScore);
    
    // Sort and limit
    highScores.sort((a, b) => b.score - a.score);
    if (highScores.length > HIGH_SCORE_COUNT) {
        highScores = highScores.slice(0, HIGH_SCORE_COUNT);
    }
    
    // Save to file (only in development)
    if (!isHeroku) {
        try {
            fs.writeFileSync(SCORE_FILE_PATH, JSON.stringify(highScores, null, 2));
            console.log('Saved high scores to file');
        } catch (err) {
            console.error('Error saving high scores to file:', err);
        }
    }
    
    res.json({ success: true, highScores });
});

// Start the server
app.listen(port, () => {
    console.log(`Asteroids high score server running on port ${port}`);
    if (!isHeroku) {
        console.log(`Game available at http://localhost:${port}`);
    }
}); 