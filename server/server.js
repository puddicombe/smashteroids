const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // Use Heroku's PORT environment variable or default to 3000

// Add middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve game files from public directory

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

// Get high scores
app.get('/api/highscores', (req, res) => {
    res.json(highScores);
});

// Submit a high score
app.post('/api/highscores', (req, res) => {
    const { initials, score, gameData } = req.body;
    
    // Add detailed logging for debugging
    console.log('Received highscore submission:');
    console.log('Initials:', initials);
    console.log('Score:', score, typeof score);
    console.log('Request body:', req.body);
    
    // Basic validation
    if (!initials || score === undefined || score === null || typeof score !== 'number') {
        console.log('Validation failed: Missing initials or score, or score is not a number');
        return res.status(400).json({ error: 'Invalid score data' });
    }
    
    // Simple validation to prevent unreasonable scores
    if (score < 0 || score > 1000000) {
        console.log('Validation failed: Score out of valid range:', score);
        return res.status(400).json({ error: 'Score out of valid range' });
    }
    
    // Sanitize initials
    // 1. Convert to upper case so lowercase letters are accepted
    // 2. Remove any characters outside A-Z
    // 3. Limit to the first 3 characters
    const sanitizedInitials = (initials || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 3);

    // Ensure we still have at least one valid character after sanitising
    if (!sanitizedInitials) {
        console.log('Validation failed: initials contain no valid characters');
        return res.status(400).json({ error: 'Invalid initials' });
    }
    
    // Add new score with timestamp
    const newScore = { 
        initials: sanitizedInitials, 
        score, 
        timestamp: Date.now(),
        // Optionally store game data for verification or statistics
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