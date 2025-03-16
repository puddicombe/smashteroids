/**
 * Asteroids Game - A modern reimagining of the classic arcade game
 * Copyright (c) James Puddicombe 2025
 * 
 * This implementation focuses on enhancing the original gameplay with:
 * - Modern web technologies (HTML5 Canvas, Web Audio API)
 * - Improved physics and collision detection
 * - Server-based high score system
 * - Intelligent enemy behavior
 * - Enhanced visual and audio feedback
 */

// Initialize canvas for rendering game graphics
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state tracking variables
let logMessages = [];        // Stores debug/info messages for development and user feedback
let gameStarted = false;     // Controls game state transitions between menu and gameplay
let gameLoopRunning = false; // Prevents multiple game loops from running simultaneously

// Visual enhancement features
let stars = [];             // Background star field for visual depth
let starsGenerated = false; // Ensures stars are only generated once per screen
let welcomeAsteroids = [];  // Decorative asteroids for the welcome screen
let showLog = false;        // Debug log visibility toggle

/**
 * Alien spacecraft system constants
 * Balanced for challenging but fair combat encounters:
 * - Limited count prevents overwhelming the player
 * - Speed and fire rate allow for strategic dodging
 * - Points reward skilled play
 * - AI behavior creates engaging combat
 */
// ... existing alien constants ...

/**
 * Release notes system
 * Provides players with transparent update history and
 * helps track game evolution and improvements
 */
let showingReleaseNotes = false;
let releaseNotesScroll = 0;
const SCROLL_SPEED = 10;

/**
 * High score system configuration
 * Server-based system allows for:
 * - Global competition
 * - Persistent rankings
 * - Anti-cheat verification
 * - Community engagement
 */
let highScores = [];
const HIGH_SCORE_COUNT = 15;
let playerInitials = "AAA";
let enteringInitials = false;
let currentInitialIndex = 0;
let highScoresFetched = false;

/**
 * Animation state variables
 * Used to create smooth, dynamic visual effects
 * that enhance game feel and user feedback
 */
let titleHoverOffset = 0;
let titleHoverDirection = 1;
let frameCount = 0;

/**
 * Core game state
 * These variables track the essential elements
 * that make up the game's current state
 */
let ship = null;
let asteroids = [];
let bullets = [];
let score = 0;
let lives = 3;
let level = 1;

/**
 * Game mechanics constants
 * Carefully balanced values that create:
 * - Satisfying ship control
 * - Fair combat difficulty
 * - Progressive challenge scaling
 * - Rewarding scoring system
 */
const SHIP_SIZE = 20;                    // Base size of the player's ship
const SHIP_THRUST = 0.5;                 // Acceleration rate
const SHIP_ROTATION_SPEED = 0.1;         // Rotation rate
const FRICTION = 0.99;                   // Friction coefficient (1 = no friction)

// Asteroid constants
const BASE_ASTEROID_SPEED = 1;           // Base speed for asteroids
const ASTEROID_SPEED_SCALING = 0.2;      // Speed increase per level
const MAX_ASTEROID_SPEED = 3;            // Maximum asteroid speed
const ASTEROID_COUNT = 3;                // Starting number of asteroids
const ASTEROID_JAG = 0.4;                // Jaggedness of asteroid shapes
const SCORE_MULTIPLIER = 100;            // Base score for destroying asteroids

// Bullet constants
const BULLET_SPEED = 10;                 // Speed of player bullets
const BULLET_LIFETIME = 50;              // How long bullets last

// Alien constants
const ALIEN_SIZE = 20;                   // Size of alien ships
const ALIEN_SPEED = 2;                   // Maximum alien movement speed
const ALIEN_THRUST = 0.1;                // Alien acceleration rate
const ALIEN_ROTATION_SPEED = 0.1;        // How fast aliens can turn
const ALIEN_FRICTION = 0.99;             // Friction applied to alien movement
const ALIEN_POINTS = 1000;               // Score for destroying an alien
const ALIEN_MAX_COUNT = 1;               // Maximum aliens at once
const ALIEN_CHANGE_DIRECTION_RATE = 60;  // How often aliens change direction
const ALIEN_FIRE_RATE_MIN = 30;          // Minimum frames between alien shots
const ALIEN_FIRE_RATE_MAX = 90;          // Maximum frames between alien shots
const ALIEN_MAX_BULLETS = 3;             // Maximum alien bullets on screen
const ALIEN_BULLET_SPEED = 5;            // Speed of alien bullets
const ALIEN_BULLET_SIZE = 3;             // Size of alien bullets
const ALIEN_BULLET_PULSE_SPEED = 0.2;    // Speed of bullet pulse animation

// Alien spawn timing
const ALIEN_BASE_SPAWN_INTERVAL = 1800;  // Base interval (30 seconds at 60fps)
const ALIEN_SPAWN_INTERVAL_DECREASE = 300; // Decrease per level (5 seconds)
const ALIEN_MIN_SPAWN_INTERVAL = 600;    // Minimum interval (10 seconds)

/**
 * Input state tracking
 * Enables smooth, responsive controls by
 * maintaining the current state of player inputs
 */
let keys = {
    left: false,
    right: false,
    up: false,
    space: false
};

/**
 * Sound system configuration
 * Uses Web Audio API for:
 * - Dynamic sound generation
 * - Real-time audio manipulation
 * - Low latency feedback
 * - Memory efficient sound effects
 */
let soundFX = {
    fire: null,
    thrust: null,
    bangLarge: null,
    bangMedium: null,
    bangSmall: null,
    explode: null
};
let audioContext = null;

/**
 * Ship explosion system
 * Creates dramatic, physics-based destruction
 * that provides satisfying feedback for player death
 */
let shipDebris = [];
const DEBRIS_SPEED = 0.5;
const DEBRIS_ROTATION_SPEED = 0.02;
const DEBRIS_LIFETIME = 180;

/**
 * Safe respawn system
 * Prevents frustrating instant deaths by ensuring
 * players respawn in safe locations
 */
const SAFE_RESPAWN_DISTANCE = 100;

/**
 * Game state control
 * Manages pause functionality and bullet limitations
 * for balanced gameplay
 */
let gamePaused = false;
const MAX_BULLETS = 4;

/**
 * Server communication state
 * Handles high score submission and provides
 * feedback during server interactions
 */
let isSubmittingScore = false;
let scoreSubmitError = null;
let lastScoreSubmitTime = 0;

// ... rest of the existing code ...

/**
 * Canvas resize handler
 * Ensures the game fills the available screen space while
 * maintaining proper scaling and visual elements
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    squareY = canvas.height / 2;
    addLogMessage('Canvas resized to: ' + canvas.width + ' x ' + canvas.height);
    
    // Regenerate stars to fill new dimensions
    starsGenerated = false;
    generateStars();
}

/**
 * Game initialization
 * Sets up the game environment and starts the main loop.
 * Handles one-time setup of:
 * - Audio system
 * - Welcome screen
 * - High score system
 * - Game loop
 */
function init() {
    addLogMessage('Initializing game...');
    resizeCanvas();
    loadSounds();
    initWelcomeAsteroids();
    fetchHighScores();
    
    // Start in welcome screen state
    gameStarted = false;
    enteringInitials = false;
    
    // Prevent multiple game loops
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        requestAnimationFrame(gameLoop);
        addLogMessage('Game loop started in welcome screen mode');
    }
}

/**
 * High score fetching
 * Retrieves scores from server with fallback to local scores
 * to ensure the game remains playable even if server is unavailable
 */
function fetchHighScores() {
    addLogMessage('Fetching high scores from server...');
    
    // Fallback scores if server is unreachable
    const defaultScores = [
        { initials: "JP1", score: 10000 },
        { initials: "JP2", score: 8000 },
        { initials: "JP3", score: 6000 },
        { initials: "JP4", score: 4000 },
        { initials: "JP5", score: 2000 }
    ];
    
    fetch('/api/highscores')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            highScores = data;
            highScoresFetched = true;
            addLogMessage('High scores loaded from server');
        })
        .catch(error => {
            addLogMessage('Error loading high scores: ' + error.message);
            highScores = defaultScores;
            highScoresFetched = true;
        });
}

// Wait for window to fully load
window.addEventListener('load', function() {
    addLogMessage('Window loaded');
    init();
});

/**
 * Main game loop
 * Orchestrates the game's core update and render cycle:
 * - Clears and prepares canvas
 * - Updates game state based on current mode
 * - Renders appropriate screen (welcome, game, or game over)
 * - Handles pause state and overlay systems
 */
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!gameStarted) {
        // Welcome/Game Over screens
        if (enteringInitials) {
            drawGameOver();
        } else {
            drawWelcomeElements();
        }
    } else {
        // Active gameplay
        if (!gamePaused) {
            updateGame();
            updateAliens();
            updateAlienBullets();
        } else {
            drawPauseScreen();
        }
        
        // Always draw game elements for visual continuity
        drawGame();
        drawAliens();
        drawAlienBullets();
    }
    
    // Overlay systems
    if (showingReleaseNotes) drawReleaseNotes();
    drawLog();
    
    requestAnimationFrame(gameLoop);
}

/**
 * Debug logging system
 * Provides real-time feedback for:
 * - Development debugging
 * - Player feedback
 * - System state monitoring
 */
function addLogMessage(message) {
    logMessages.push(message);
    if (logMessages.length > 10) logMessages.shift();
}

/**
 * Debug log rendering
 * Creates an overlay for development and player feedback
 * that maintains readability while being unobtrusive
 */
function drawLog() {
    if (!showLog) return;
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, 120);
    
    // Visual border for clarity
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, 120);
    
    // Message display
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    
    logMessages.forEach((msg, index) => {
        ctx.fillText(msg, 60, 25 + index * 18);
    });
}

/**
 * Star field generation
 * Creates a dynamic, twinkling background that:
 * - Adds visual depth to the game
 * - Creates atmosphere
 * - Provides subtle motion cues
 */
function generateStars() {
    if (!starsGenerated) {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                brightness: 0.5 + Math.random() * 0.5,
                twinkleSpeed: 0.01 + Math.random() * 0.03,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
        starsGenerated = true;
        addLogMessage('Stars generated with twinkling effect');
    }
}

/**
 * Welcome screen elements
 * Creates an engaging first impression with:
 * - Animated title
 * - Interactive elements
 * - Game instructions
 * - High score display
 * - Visual polish
 */
function drawWelcomeElements() {
    generateStars();
    
    // Title animation
    frameCount++;
    titleHoverOffset += 0.05 * titleHoverDirection;
    if (titleHoverOffset > 5 || titleHoverOffset < -5) {
        titleHoverDirection *= -1;
    }
    
    // Render starfield with parallax effect
    stars.forEach(star => {
        const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.twinkleOffset);
        const brightness = star.brightness * (0.7 + 0.3 * twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    
    // Welcome screen components
    updateWelcomeAsteroids();
    drawWelcomeAsteroids();

    // Animated title
    ctx.fillStyle = 'white';
    ctx.font = '28px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDS', canvas.width / 2, canvas.height / 5 + titleHoverOffset);

    // Blinking start prompt
    ctx.font = '12px PressStart2P';
    if (Math.floor(frameCount / 30) % 2 === 0) {
        ctx.fillText('PRESS ENTER TO START', canvas.width / 2, canvas.height / 5 + 40);
    }
    
    // Information displays
    drawWelcomeInstructions();
    drawAsteroidScoreInfo();
    drawHighScores();
}

/**
 * Game instructions display
 * Provides clear, concise control information:
 * - Essential controls prominently displayed
 * - Grouped by function
 * - Easy to read formatting
 */
function drawWelcomeInstructions() {
    ctx.fillStyle = 'white';
    ctx.font = '12px PressStart2P';
    ctx.textAlign = 'center';
    
    ctx.fillText('CONTROLS', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '10px PressStart2P';
    const instructions = [
        'ROTATE: LEFT/RIGHT ARROWS or A/D',
        'THRUST: UP ARROW or W',
        'FIRE: SPACEBAR (MAX 4 BULLETS)',
        'PAUSE: P',
        'EXIT: ESC (RETURNS TO MENU)',
        'TOGGLE LOG: L',
        'RELEASE NOTES: N'
    ];
    
    instructions.forEach((instruction, index) => {
        ctx.fillText(instruction, canvas.width / 2, canvas.height / 3 + 25 + index * 20);
    });
}

/**
 * Score information display
 * Visualizes the scoring system with:
 * - Clear point values
 * - Size-based scoring explanation
 * - Visual examples of targets
 */
function drawAsteroidScoreInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '12px PressStart2P';
    ctx.textAlign = 'center';
    
    ctx.fillText('ASTEROID POINTS', canvas.width / 4, canvas.height / 2 + 20);
    
    const asteroidSizes = [
        { size: 3, score: 100, label: 'LARGE' },
        { size: 2, score: 200, label: 'MEDIUM' },
        { size: 1, score: 300, label: 'SMALL' }
    ];
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    
    asteroidSizes.forEach((asteroid, index) => {
        const y = canvas.height / 2 + 50 + index * 40;
        
        // Visual example
        ctx.beginPath();
        const radius = asteroid.size * 10;
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI * 2 / 8;
            const jag = (i % 2 === 0) ? 1 : 0.8;
            const x = canvas.width / 4 - 60 + radius * jag * Math.cos(angle);
            const y2 = y + radius * jag * Math.sin(angle);
            
            if (i === 0) ctx.moveTo(x, y2);
            else ctx.lineTo(x, y2);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Score display
        ctx.fillText(`${asteroid.label}: ${asteroid.score} PTS`, canvas.width / 4 + 40, y + 5);
    });
}

/**
 * Welcome screen asteroid management
 * Updates decorative asteroids that:
 * - Create visual interest
 * - Demonstrate game objects
 * - Maintain consistent motion
 */
function updateWelcomeAsteroids() {
    for (let i = 0; i < welcomeAsteroids.length; i++) {
        // Slower movement for aesthetic effect
        welcomeAsteroids[i].x += welcomeAsteroids[i].velocity.x * 0.5;
        welcomeAsteroids[i].y += welcomeAsteroids[i].velocity.y * 0.5;
        welcomeAsteroids[i].angle += 0.005;
        
        // Screen wrapping for continuous motion
        handleEdgeOfScreen(welcomeAsteroids[i]);
    }
}

/**
 * Welcome screen asteroid rendering
 * Creates visually consistent asteroids that:
 * - Match gameplay appearance
 * - Provide visual interest
 * - Demonstrate game objects
 */
function drawWelcomeAsteroids() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < welcomeAsteroids.length; i++) {
        const asteroid = welcomeAsteroids[i];
        ctx.beginPath();
        
        // Create jagged, organic shapes
        for (let j = 0; j < asteroid.vert; j++) {
            const angle = j * Math.PI * 2 / asteroid.vert;
            const radius = asteroid.radius * asteroid.offset[j];
            const x = asteroid.x + radius * Math.cos(angle + asteroid.angle);
            const y = asteroid.y + radius * Math.sin(angle + asteroid.angle);
            
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        ctx.stroke();
    }
}

/**
 * High score display
 * Shows player rankings with:
 * - Server-synced scores
 * - Loading state handling
 * - Scroll functionality for many entries
 * - Clear formatting
 */
function drawHighScores() {
    ctx.fillStyle = 'white';
    ctx.font = '12px PressStart2P';
    ctx.textAlign = 'center';
    
    ctx.fillText('HIGH SCORES', canvas.width * 3/4, canvas.height / 2 + 20);
    
    // Loading state feedback
    if (!highScoresFetched) {
        ctx.font = '10px PressStart2P';
        ctx.fillText('LOADING...', canvas.width * 3/4, canvas.height / 2 + 50);
        return;
    }
    
    ctx.font = '10px PressStart2P';
    // Dynamic display based on available space
    const availableHeight = canvas.height / 2 + 50;
    const scoreHeight = 20;
    const maxToShow = Math.min(10, highScores.length);
    
    for (let i = 0; i < maxToShow; i++) {
        const yPos = canvas.height / 2 + 50 + i * scoreHeight;
        const formattedScore = highScores[i].score.toLocaleString();
        
        ctx.fillText(
            `${i + 1}. ${highScores[i].initials} - ${formattedScore}`,
            canvas.width * 3/4,
            yPos
        );
    }
    
    // Indicate additional scores
    if (highScores.length > maxToShow) {
        ctx.fillText(
            `+ ${highScores.length - maxToShow} MORE...`,
            canvas.width * 3/4,
            canvas.height / 2 + 50 + maxToShow * scoreHeight
        );
    }
}

/**
 * Game over screen
 * Provides end-game feedback and high score entry:
 * - Clear score display
 * - Interactive initials entry
 * - Server submission status
 * - Visual polish and effects
 */
function drawGameOver() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Maintain visual consistency with star field
    stars.forEach(star => {
        const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.twinkleOffset);
        const brightness = star.brightness * (0.7 + 0.3 * twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    
    // Game over display
    ctx.fillStyle = 'white';
    ctx.font = '28px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '16px PressStart2P';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 3 + 40);
    
    if (enteringInitials) {
        // High score entry interface
        ctx.fillText('ENTER YOUR INITIALS:', canvas.width / 2, canvas.height / 2);
        
        // Initial entry boxes
        const boxWidth = 40;
        const boxHeight = 50;
        const boxSpacing = 20;
        const totalWidth = (boxWidth * 3) + (boxSpacing * 2);
        const startX = (canvas.width - totalWidth) / 2;
        
        for (let i = 0; i < 3; i++) {
            const x = startX + (i * (boxWidth + boxSpacing));
            const y = canvas.height / 2 + 20;
            
            // Visual feedback for current selection
            ctx.strokeStyle = i === currentInitialIndex ? 'yellow' : 'white';
            ctx.lineWidth = i === currentInitialIndex ? 3 : 1;
            ctx.strokeRect(x, y, boxWidth, boxHeight);
            
            // Initial display
            ctx.fillStyle = 'white';
            ctx.font = '28px PressStart2P';
            ctx.fillText(playerInitials[i], x + boxWidth/2, y + boxHeight/2 + 10);
            
            // Cursor animation
            if (i === currentInitialIndex && Math.floor(frameCount / 15) % 2 === 0) {
                ctx.fillRect(x + boxWidth/2 - 15, y + boxHeight - 10, 30, 3);
            }
        }
        
        // User instructions
        ctx.font = '12px PressStart2P';
        ctx.fillText('USE ARROW KEYS TO SELECT LETTERS', canvas.width / 2, canvas.height / 2 + 100);
        ctx.fillText('PRESS ENTER WHEN DONE', canvas.width / 2, canvas.height / 2 + 125);
        
        // Server communication status
        if (isSubmittingScore) {
            ctx.fillStyle = 'yellow';
            ctx.fillText('SUBMITTING SCORE...', canvas.width / 2, canvas.height / 2 + 150);
        } else if (scoreSubmitError) {
            ctx.fillStyle = 'red';
            ctx.fillText('ERROR: ' + scoreSubmitError, canvas.width / 2, canvas.height / 2 + 150);
            ctx.fillStyle = 'white';
            ctx.fillText('PRESS ENTER TO CONTINUE ANYWAY', canvas.width / 2, canvas.height / 2 + 175);
        }
    } else {
        // Continue prompt
        if (Math.floor(frameCount / 30) % 2 === 0) {
            ctx.font = '12px PressStart2P';
            ctx.fillText('PRESS ENTER TO CONTINUE', canvas.width / 2, canvas.height / 2 + 50);
        }
    }
}

// Draw pause screen overlay
function drawPauseScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pause message
    ctx.fillStyle = 'white';
    ctx.font = '28px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('GAME PAUSED', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '14px PressStart2P';
    ctx.fillText('PRESS P TO RESUME', canvas.width / 2, canvas.height / 2 + 40);
}

// Modify the keydown event handler to handle initials entry and log toggle
window.addEventListener('keydown', (e) => {
    // Handle release notes toggle
    if (e.key === 'n' || e.key === 'N') {
        showingReleaseNotes = !showingReleaseNotes;
        releaseNotesScroll = 0; // Reset scroll position
        addLogMessage('Release notes ' + (showingReleaseNotes ? 'shown' : 'hidden'));
        return;
    }

    // Spawn alien with 'U' key (for testing)
    if ((e.key === 'u' || e.key === 'U') && gameStarted && !gamePaused) {
        if (aliens.length < ALIEN_MAX_COUNT) {
            createAlien();
        }
        return;
    }

    // If release notes are showing, only handle scrolling
    if (showingReleaseNotes) {
        if (e.key === 'ArrowUp') {
            releaseNotesScroll = Math.max(0, releaseNotesScroll - SCROLL_SPEED);
            return;
        } else if (e.key === 'ArrowDown') {
            releaseNotesScroll += SCROLL_SPEED;
            return;
        }
        return; // Ignore other keys while showing release notes
    }

    // Toggle log with 'l' key
    if (e.key === 'l' || e.key === 'L') {
        showLog = !showLog;
        addLogMessage('Log visibility toggled: ' + (showLog ? 'shown' : 'hidden'));
        return;
    }
    
    // Test sound with 't' key
    if (e.key === 't' || e.key === 'T') {
        window.testSound();
        addLogMessage('Testing sound...');
        return;
    }
    
    // Toggle pause with 'p' key when game is active
    if ((e.key === 'p' || e.key === 'P') && gameStarted) {
        gamePaused = !gamePaused;
        addLogMessage('Game ' + (gamePaused ? 'paused' : 'resumed'));
        
        // If resuming, play a sound for feedback
        if (!gamePaused) {
            playSound('bangSmall');
        }
        return;
    }
    
    if (enteringInitials) {
        // Handle initials entry
        if (e.key === 'ArrowUp') {
            // Increment current letter (A-Z)
            let charCode = playerInitials.charCodeAt(currentInitialIndex);
            charCode = charCode === 90 ? 65 : charCode + 1; // Wrap from Z to A
            playerInitials = playerInitials.substring(0, currentInitialIndex) + 
                            String.fromCharCode(charCode) + 
                            playerInitials.substring(currentInitialIndex + 1);
            // Play a sound for feedback
            playSound('fire');
        } else if (e.key === 'ArrowDown') {
            // Decrement current letter (A-Z)
            let charCode = playerInitials.charCodeAt(currentInitialIndex);
            charCode = charCode === 65 ? 90 : charCode - 1; // Wrap from A to Z
            playerInitials = playerInitials.substring(0, currentInitialIndex) + 
                            String.fromCharCode(charCode) + 
                            playerInitials.substring(currentInitialIndex + 1);
            // Play a sound for feedback
            playSound('fire');
        } else if (e.key === 'ArrowRight' && currentInitialIndex < 2) {
            // Move to next initial
            currentInitialIndex++;
            // Play a sound for feedback
            playSound('bangSmall');
        } else if (e.key === 'ArrowLeft' && currentInitialIndex > 0) {
            // Move to previous initial
            currentInitialIndex--;
            // Play a sound for feedback
            playSound('bangSmall');
        } else if (e.key === 'Enter') {
            // Submit initials
            if (isSubmittingScore) {
                return; // Prevent multiple submissions
            }
            
            if (scoreSubmitError) {
                // If there was an error, just continue without resubmitting
                enteringInitials = false;
                addLogMessage(`High score submission failed: ${scoreSubmitError}`);
                playSound('bangLarge');
                return;
            }
            
            submitHighScore(playerInitials, score);
        }
        return;
    }
    
    if (e.key === 'Enter' && !gameStarted) {
        // Transition to the game state
        gameStarted = true;
        gamePaused = false; // Ensure game starts unpaused
        initGame();
        addLogMessage('Game started');
    } else if (e.key === 'Escape' && gameStarted) {
        // Exit game and return to welcome screen
        gameStarted = false;
        gamePaused = false; // Reset pause state
        addLogMessage('Game exited - returned to welcome screen');
    }
    
    // Game controls - only process if game is active and not paused
    if (gameStarted && !gamePaused) {
        switch(e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                break;
            case 'ArrowUp':
            case 'w':
                keys.up = true;
                break;
            case ' ':
                keys.space = true;
                break;
        }
    }
});

// Add keyup event handler for smooth controls
window.addEventListener('keyup', (e) => {
    if (gameStarted && !gamePaused) {
        switch(e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = false;
                break;
            case 'ArrowUp':
            case 'w':
                keys.up = false;
                break;
            case ' ':
                keys.space = false;
                break;
        }
    }
});

// Load sound effects
function loadSounds() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize sound objects
        soundFX = {
            fire: { play: () => playSound('fire') },
            thrust: { 
                play: () => playThrustSound(true),
                pause: () => playThrustSound(false),
                currentTime: 0 // Dummy property for compatibility
            },
            bangLarge: { play: () => playSound('bangLarge') },
            bangMedium: { play: () => playSound('bangMedium') },
            bangSmall: { play: () => playSound('bangSmall') },
            explode: { play: () => playSound('explode') }
        };
        
        // If context is suspended (browser policy), add a click handler to resume it
        if (audioContext.state === 'suspended') {
            const resumeAudio = function() {
                audioContext.resume().then(() => {
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('keydown', resumeAudio);
                });
            };
            
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
        }
        
        addLogMessage('Sound system initialized - Press T to test sound');
    } catch (e) {
        addLogMessage('Error initializing audio system');
    }
}

// Continuous thrust sound
let thrustOscillator = null;

// Play or stop the thrust sound
function playThrustSound(play) {
    if (!audioContext) return;
    
    try {
        if (play) {
            if (thrustOscillator) return; // Already playing
            
            // Create noise for thrust sound
            thrustOscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            // Set up noise generator
            thrustOscillator.type = 'sawtooth';
            thrustOscillator.frequency.setValueAtTime(100, audioContext.currentTime);
            
            // Set up filter for noise shaping
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(400, audioContext.currentTime);
            filter.Q.setValueAtTime(1, audioContext.currentTime);
            
            // Set volume
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            
            // Connect nodes
            thrustOscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Start sound
            thrustOscillator.start();
        } else {
            // Stop thrust sound
            if (thrustOscillator) {
                thrustOscillator.stop();
                thrustOscillator.disconnect();
                thrustOscillator = null;
            }
        }
    } catch (e) {
        addLogMessage('Error with thrust sound');
    }
}

// Play a sound effect
function playSound(soundType) {
    if (!audioContext) {
        addLogMessage('Audio context not available');
        return;
    }
    
    try {
        // Create oscillator and gain node
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configure sound based on type
        switch (soundType) {
            case 'fire':
                // Laser-like sound
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.15);
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                
                // Connect and play
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
                
            case 'bangLarge':
                // Low explosion sound
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(60, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.5);
                
                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                // Connect and play
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
                
            case 'bangMedium':
                // Medium explosion sound
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(120, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 0.3);
                
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                // Connect and play
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
                
            case 'bangSmall':
                // Small explosion sound
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + 0.2);
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                // Connect and play
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
                
            case 'explode':
                // Ship explosion - more complex sound
                const noise = audioContext.createOscillator();
                const noiseGain = audioContext.createGain();
                const filter = audioContext.createBiquadFilter();
                
                noise.type = 'sawtooth';
                noise.frequency.setValueAtTime(100, audioContext.currentTime);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1000, audioContext.currentTime);
                filter.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.8);
                
                noiseGain.gain.setValueAtTime(0.6, audioContext.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(audioContext.destination);
                
                noise.start();
                noise.stop(audioContext.currentTime + 0.8);
                break;
                
            default:
                addLogMessage('Unknown sound type: ' + soundType);
                return;
        }
    } catch (e) {
        addLogMessage('Error playing sound');
    }
}

// Test sound function
window.testSound = function() {
    if (!audioContext) {
        try {
            // Try to initialize audio context if it doesn't exist
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            addLogMessage('Could not create audio context');
            return;
        }
    }
    
    try {
        // Resume context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                playTestSound();
            });
        } else {
            playTestSound();
        }
    } catch (e) {
        addLogMessage('Error testing sound');
    }
};

function playTestSound() {
    try {
        // Create a simple beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz = A4
        
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);
        
        addLogMessage('Test sound playing - if you hear nothing, check browser audio permissions');
    } catch (e) {
        addLogMessage('Error playing test sound');
    }
}

// Initialize game objects - updated to reset score submission time
function initGame() {
    // Create player ship
    ship = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: SHIP_SIZE / 2,
        angle: 0,
        rotation: 0,
        thrusting: false,
        thrust: {
            x: 0,
            y: 0
        },
        exploding: false,
        explodeTime: 0,
        // Add invulnerability period after respawn
        invulnerable: true,
        invulnerableTime: 180 // 3 seconds at 60fps
    };
    
    // Reset aliens and spawn timer
    aliens = [];
    alienBullets = [];
    alienSpawnTimer = 0;
    
    // Create asteroids
    createAsteroids();
    
    // Reset game state
    bullets = [];
    score = 0;
    lives = 3;
    level = 1;
    
    // Reset keys
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.space = false;
    
    // Reset player initials
    playerInitials = "AAA";
    currentInitialIndex = 0;
    
    // Reset score submission variables
    isSubmittingScore = false;
    scoreSubmitError = null;
    lastScoreSubmitTime = Date.now();
    
    addLogMessage('Game initialized - Level ' + level);
}

// Create asteroids for the current level
function createAsteroids() {
    asteroids = [];
    let x, y;
    
    // Create asteroids away from the ship
    for (let i = 0; i < ASTEROID_COUNT + level; i++) {
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distBetweenPoints(ship.x, ship.y, x, y) < SHIP_SIZE * 4);
        
        asteroids.push(createAsteroid(x, y, 3)); // Start with large asteroids (size 3)
    }
}

// Create a single asteroid
function createAsteroid(x, y, size) {
    const ASTEROID_VERT = 10; // average number of vertices
    
    // Calculate speed based on level and size
    const levelSpeedBonus = Math.min((level - 1) * ASTEROID_SPEED_SCALING, MAX_ASTEROID_SPEED - BASE_ASTEROID_SPEED);
    const sizeSpeedMultiplier = (4 - size) * 0.4; // Smaller asteroids are faster (size 3: 0.4x, size 2: 0.8x, size 1: 1.2x)
    const currentSpeed = (BASE_ASTEROID_SPEED + levelSpeedBonus) * (1 + sizeSpeedMultiplier);
    
    let asteroid = {
        x: x,
        y: y,
        size: size,
        radius: size * (20 - Math.min(level - 1, 5)), // Asteroids get slightly smaller with level (max 5 levels of shrinking)
        angle: Math.random() * Math.PI * 2,
        vert: Math.floor(Math.random() * (ASTEROID_VERT + 1) + ASTEROID_VERT / 2),
        offset: [],
        velocity: {
            x: Math.random() * currentSpeed * 2 - currentSpeed,
            y: Math.random() * currentSpeed * 2 - currentSpeed
        },
        rotationSpeed: (Math.random() - 0.5) * 0.02 * (1 + (level - 1) * 0.1) * (1 + sizeSpeedMultiplier) // Smaller asteroids rotate faster too
    };
    
    // Create the asteroid's shape (offset array)
    for (let i = 0; i < asteroid.vert; i++) {
        asteroid.offset.push(
            Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG
        );
    }
    
    return asteroid;
}

// Update game state
function updateGame() {
    // Main game loop handles multiple game states:
    // 1. Normal gameplay - all systems active
    // 2. Post-death state - limited updates during explosion animation
    // 3. Level transition - clearing and spawning new objects
    // 4. Paused state - maintaining game state without updates
    
    // Special case: Post-death state with active explosion
    if (lives <= 0 && ship.exploding) {
        // Only update visual effects and passive objects
        updateShipDebris();
        updateAsteroids();
        return; // Skip active gameplay updates
    }
    
    // Handle ship rotation (reversed left/right for more intuitive controls)
    if (keys.left) {
        ship.rotation = SHIP_ROTATION_SPEED; // Reversed from negative to positive
    } else if (keys.right) {
        ship.rotation = -SHIP_ROTATION_SPEED; // Reversed from positive to negative
    } else {
        ship.rotation = 0;
    }
    
    // Handle ship thrust and associated sound effects
    if (keys.up && !ship.thrusting && !ship.exploding) {
        ship.thrusting = true;
        playThrustSound(true);
    } else if (!keys.up && ship.thrusting) {
        ship.thrusting = false;
        playThrustSound(false);
    }
    
    // Handle firing with sound (space key is reset each frame to prevent continuous firing)
    if (keys.space) {
        fireBullet();
        keys.space = false;
    }
    
    // Update all game objects in specific order to ensure proper interaction
    updateShip();
    updateShipDebris();
    updateBullets();
    updateAsteroids();
    checkCollisions();
    
    // Check for level completion and progression
    if (asteroids.length === 0) {
        level++;
        createAsteroids();
        addLogMessage('Level ' + level + ' started');
    }
}

// Update ship position and rotation using vector-based physics
function updateShip() {
    // Handle explosion state if active
    if (ship.exploding) {
        ship.explodeTime--;
        if (ship.explodeTime === 0) {
            respawnShipSafely();
        }
        return;
    }
    
    // Update ship's angular position based on rotation velocity
    ship.angle += ship.rotation;
    
    // Apply thrust using a vector-based physics model:
    // - Thrust is decomposed into x and y components using trigonometry
    // - Y component is negative because canvas coordinates increase downward
    // - Continuous thrust builds up velocity over time, creating momentum
    if (ship.thrusting) {
        ship.thrust.x += SHIP_THRUST * Math.cos(ship.angle);
        ship.thrust.y -= SHIP_THRUST * Math.sin(ship.angle);
    } else {
        // Apply exponential decay friction to gradually slow the ship
        // This creates a smooth deceleration effect while maintaining momentum
        ship.thrust.x *= FRICTION;
        ship.thrust.y *= FRICTION;
    }
    
    // Update position based on current velocity (thrust)
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
    
    // Handle screen wrapping to create infinite space effect
    handleEdgeOfScreen(ship);
}

// Find a safe position to respawn the ship using a sophisticated placement algorithm
function respawnShipSafely() {
    // Implements a quadrant-based safe respawn system:
    // 1. First tries the center of the screen
    // 2. If unsafe, systematically tries each quadrant of the screen
    // 3. Considers both current and predicted future positions of asteroids
    // 4. As a last resort, forcibly moves asteroids to create safe space
    
    let newX = canvas.width / 2;
    let newY = canvas.height / 2;
    let safePosition = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // Prevent infinite loops while ensuring thorough search
    
    // Systematic search for safe position
    while (!safePosition && attempts < MAX_ATTEMPTS) {
        safePosition = true; // Optimistically assume position is safe
        
        // Check against all asteroids for both current and predicted positions
        for (let i = 0; i < asteroids.length; i++) {
            const asteroid = asteroids[i];
            
            // Check current distance to asteroid
            const distance = distBetweenPoints(newX, newY, asteroid.x, asteroid.y);
            
            // Predict asteroid position to prevent spawning in its path
            // Look ahead 30 frames to account for fast-moving asteroids
            const futureX = asteroid.x + asteroid.velocity.x * 30;
            const futureY = asteroid.y + asteroid.velocity.y * 30;
            const futureDistance = distBetweenPoints(newX, newY, futureX, futureY);
            
            // Position is unsafe if too close to current or predicted asteroid position
            if (distance < SAFE_RESPAWN_DISTANCE || futureDistance < SAFE_RESPAWN_DISTANCE) {
                safePosition = false;
                
                // Systematic quadrant-based position testing
                // Each quadrant is tried with some randomization to avoid patterns
                switch (attempts % 4) {
                    case 0: // Top-left quadrant
                        newX = canvas.width * 0.25 + Math.random() * canvas.width * 0.2;
                        newY = canvas.height * 0.25 + Math.random() * canvas.height * 0.2;
                        break;
                    case 1: // Top-right quadrant
                        newX = canvas.width * 0.75 - Math.random() * canvas.width * 0.2;
                        newY = canvas.height * 0.25 + Math.random() * canvas.height * 0.2;
                        break;
                    case 2: // Bottom-left quadrant
                        newX = canvas.width * 0.25 + Math.random() * canvas.width * 0.2;
                        newY = canvas.height * 0.75 - Math.random() * canvas.height * 0.2;
                        break;
                    case 3: // Bottom-right quadrant
                        newX = canvas.width * 0.75 - Math.random() * canvas.width * 0.2;
                        newY = canvas.height * 0.75 - Math.random() * canvas.height * 0.2;
                        break;
                }
                
                break; // Exit asteroid loop to test new position
            }
        }
        
        attempts++;
    }
    
    // Fallback: If no safe position found, forcibly create one
    if (!safePosition) {
        // Create a safe zone by moving nearby asteroids away from center
        // This prevents the game from becoming unplayable in crowded situations
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const distance = distBetweenPoints(canvas.width / 2, canvas.height / 2, asteroids[i].x, asteroids[i].y);
            
            if (distance < SAFE_RESPAWN_DISTANCE) {
                // Move asteroid radially outward to create safe space
                const angle = Math.atan2(asteroids[i].y - canvas.height / 2, asteroids[i].x - canvas.width / 2);
                asteroids[i].x = canvas.width / 2 + Math.cos(angle) * SAFE_RESPAWN_DISTANCE * 1.5;
                asteroids[i].y = canvas.height / 2 + Math.sin(angle) * SAFE_RESPAWN_DISTANCE * 1.5;
            }
        }
        
        // Use center position after clearing space
        newX = canvas.width / 2;
        newY = canvas.height / 2;
    }
    
    // Create new ship at safe position with reset state
    ship = {
        x: newX,
        y: newY,
        radius: SHIP_SIZE / 2,
        angle: 0,
        rotation: 0,
        thrusting: false,
        thrust: {
            x: 0,
            y: 0
        },
        exploding: false,
        explodeTime: 0,
        invulnerable: true,
        invulnerableTime: INVULNERABILITY_TIME
    };
}

// Manage player bullet firing with arcade-style limitations
function fireBullet() {
    // Bullet system implements classic arcade limitations:
    // 1. Maximum of 4 bullets on screen (like original Asteroids)
    // 2. Bullets inherit ship's momentum for tactical depth
    // 3. Limited lifetime to prevent screen cluttering
    // 4. Automatic cleanup of expired bullets
    
    if (bullets.length < MAX_BULLETS && !ship.exploding) {
        // Calculate bullet spawn position at ship's nose
        const angle = ship.angle;
        const bulletX = ship.x + Math.cos(angle) * ship.radius;
        const bulletY = ship.y - Math.sin(angle) * ship.radius;
        
        // Create bullet with inherited momentum
        bullets.push({
            x: bulletX,
            y: bulletY,
            xv: BULLET_SPEED * Math.cos(angle) + ship.thrust.x,
            yv: -BULLET_SPEED * Math.sin(angle) + ship.thrust.y,
            lifetime: BULLET_LIFETIME
        });
        
        playSound('fire');
    }
}

// Update bullets position and lifetime
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.x += bullet.xv;
        bullet.y += bullet.yv;
        
        // Remove bullet if it goes off screen
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check collision with alien
        if (aliens.length && aliens[0].active) {
            const dx = bullet.x - aliens[0].x;
            const dy = bullet.y - aliens[0].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ALIEN_SIZE) {
                // Remove bullet and destroy alien
                bullets.splice(i, 1);
                aliens[0].active = false;
                aliens = [];
                score += ALIEN_POINTS;
                playSound('bangLarge');
                addLogMessage('Alien destroyed! +' + ALIEN_POINTS + ' points');
                continue;
            }
        }
        
        // Check collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullet.x, bullet.y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius) {
                // Remove the bullet
                bullets.splice(i, 1);
                
                // Break the asteroid
                destroyAsteroid(j);
                
                // No need to check other bullets for this asteroid
                break;
            }
        }
    }
}

// Update asteroids position
function updateAsteroids() {
    for (let i = 0; i < asteroids.length; i++) {
        // Move asteroid
        asteroids[i].x += asteroids[i].velocity.x;
        asteroids[i].y += asteroids[i].velocity.y;
        
        // Rotate asteroid (now with rotation speed)
        asteroids[i].angle += asteroids[i].rotationSpeed;
        
        // Handle edge of screen (wrap around)
        handleEdgeOfScreen(asteroids[i]);
    }
}

// Handle objects going off screen (wrap around)
function handleEdgeOfScreen(obj) {
    // For aliens, use their radius property
    const radius = obj.radius || 0;
    
    if (obj.x < 0 - radius) {
        obj.x = canvas.width + radius;
    } else if (obj.x > canvas.width + radius) {
        obj.x = 0 - radius;
    }
    
    if (obj.y < 0 - radius) {
        obj.y = canvas.height + radius;
    } else if (obj.y > canvas.height + radius) {
        obj.y = 0 - radius;
    }
}

// Check for collisions between game objects
function checkCollisions() {
    // Implement efficient collision detection using distance-based checks
    // Only check collisions between objects that are close enough to possibly collide
    // This reduces unnecessary calculations and improves performance
    
    // Check ship collisions with asteroids (if ship is vulnerable)
    if (ship && !ship.exploding && !ship.invulnerable) {
        for (let i = 0; i < asteroids.length; i++) {
            if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.radius + asteroids[i].radius) {
                destroyShip();
                break;
            }
        }
    }
    
    // Check bullet collisions with asteroids
    // Iterate backwards to safely remove objects during iteration
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullets[i].x, bullets[i].y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius) {
                // Remove bullet and destroy asteroid
                bullets.splice(i, 1);
                destroyAsteroid(j);
                break;
            }
        }
    }
}

// Destroy the ship
function destroyShip() {
    // Create ship debris
    createShipDebris();
    
    // Set ship to exploding state
    ship.exploding = true;
    ship.explodeTime = 180; // 3 seconds at 60fps
    lives--;
    
    // Stop thrust sound if playing
    if (ship.thrusting) {
        ship.thrusting = false;
        playThrustSound(false);
    }
    
    // Play explosion sound
    playSound('explode');
    
    if (lives <= 0) {
        // Game over - but don't immediately return to welcome screen
        addLogMessage('Game Over! Score: ' + score);
        
        // Set a timeout to transition to initials entry after explosion animation
        setTimeout(() => {
            // Stop the player from controlling the ship
            gameStarted = false;
            
            if (isHighScore(score)) {
                // Reset initials for new entry
                playerInitials = "AAA";
                currentInitialIndex = 0;
                enteringInitials = true;
                addLogMessage('New high score! Enter your initials.');
            } else {
                addLogMessage('Game over - returned to welcome screen');
            }
        }, 3000); // Wait for explosion animation to finish
    } else {
        addLogMessage('Ship destroyed! Lives remaining: ' + lives);
    }
}

// Create ship debris when ship is destroyed
function createShipDebris() {
    // Clear any existing debris
    shipDebris = [];
    
    // Calculate ship points using the new ship design
    const noseX = ship.x + 1.7 * ship.radius * Math.cos(ship.angle);
    const noseY = ship.y - 1.7 * ship.radius * Math.sin(ship.angle);
    
    const rearLeftX = ship.x - ship.radius * (0.8 * Math.cos(ship.angle) + 1.2 * Math.sin(ship.angle));
    const rearLeftY = ship.y + ship.radius * (0.8 * Math.sin(ship.angle) - 1.2 * Math.cos(ship.angle));
    
    const rearRightX = ship.x - ship.radius * (0.8 * Math.cos(ship.angle) - 1.2 * Math.sin(ship.angle));
    const rearRightY = ship.y + ship.radius * (0.8 * Math.sin(ship.angle) + 1.2 * Math.cos(ship.angle));
    
    const centerRearX = ship.x - ship.radius * 0.5 * Math.cos(ship.angle);
    const centerRearY = ship.y + ship.radius * 0.5 * Math.sin(ship.angle);
    
    // Create debris for each line segment of the ship
    // Line 1: Nose to rear left
    shipDebris.push({
        x1: noseX,
        y1: noseY,
        x2: rearLeftX,
        y2: rearLeftY,
        centerX: (noseX + rearLeftX) / 2,
        centerY: (noseY + rearLeftY) / 2,
        length: Math.sqrt(Math.pow(noseX - rearLeftX, 2) + Math.pow(noseY - rearLeftY, 2)),
        angle: Math.atan2(rearLeftY - noseY, rearLeftX - noseX),
        rotationSpeed: (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 2,
        velocity: {
            x: ship.thrust.x + (Math.random() - 0.5) * DEBRIS_SPEED,
            y: ship.thrust.y + (Math.random() - 0.5) * DEBRIS_SPEED
        },
        lifetime: DEBRIS_LIFETIME
    });
    
    // Line 2: Rear left to rear right
    shipDebris.push({
        x1: rearLeftX,
        y1: rearLeftY,
        x2: rearRightX,
        y2: rearRightY,
        centerX: (rearLeftX + rearRightX) / 2,
        centerY: (rearLeftY + rearRightY) / 2,
        length: Math.sqrt(Math.pow(rearLeftX - rearRightX, 2) + Math.pow(rearLeftY - rearRightY, 2)),
        angle: Math.atan2(rearRightY - rearLeftY, rearRightX - rearLeftX),
        rotationSpeed: (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 2,
        velocity: {
            x: ship.thrust.x + (Math.random() - 0.5) * DEBRIS_SPEED,
            y: ship.thrust.y + (Math.random() - 0.5) * DEBRIS_SPEED
        },
        lifetime: DEBRIS_LIFETIME
    });
    
    // Line 3: Rear right to nose
    shipDebris.push({
        x1: rearRightX,
        y1: rearRightY,
        x2: noseX,
        y2: noseY,
        centerX: (rearRightX + noseX) / 2,
        centerY: (rearRightY + noseY) / 2,
        length: Math.sqrt(Math.pow(rearRightX - noseX, 2) + Math.pow(rearRightY - noseY, 2)),
        angle: Math.atan2(noseY - rearRightY, noseX - rearRightX),
        rotationSpeed: (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 2,
        velocity: {
            x: ship.thrust.x + (Math.random() - 0.5) * DEBRIS_SPEED,
            y: ship.thrust.y + (Math.random() - 0.5) * DEBRIS_SPEED
        },
        lifetime: DEBRIS_LIFETIME
    });
    
    // Line 4: Center line (nose to center rear)
    shipDebris.push({
        x1: noseX,
        y1: noseY,
        x2: centerRearX,
        y2: centerRearY,
        centerX: (noseX + centerRearX) / 2,
        centerY: (noseY + centerRearY) / 2,
        length: Math.sqrt(Math.pow(noseX - centerRearX, 2) + Math.pow(noseY - centerRearY, 2)),
        angle: Math.atan2(centerRearY - noseY, centerRearX - noseX),
        rotationSpeed: (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 3, // Faster rotation for smaller piece
        velocity: {
            x: ship.thrust.x + (Math.random() - 0.5) * DEBRIS_SPEED * 1.5, // More random movement
            y: ship.thrust.y + (Math.random() - 0.5) * DEBRIS_SPEED * 1.5
        },
        lifetime: DEBRIS_LIFETIME
    });
}

// Update ship debris
function updateShipDebris() {
    for (let i = shipDebris.length - 1; i >= 0; i--) {
        const debris = shipDebris[i];
        
        // Move debris
        debris.centerX += debris.velocity.x;
        debris.centerY += debris.velocity.y;
        
        // Rotate debris
        debris.angle += debris.rotationSpeed;
        
        // Handle edge of screen (wrap around)
        if (debris.centerX < 0) {
            debris.centerX = canvas.width;
        } else if (debris.centerX > canvas.width) {
            debris.centerX = 0;
        }
        
        if (debris.centerY < 0) {
            debris.centerY = canvas.height;
        } else if (debris.centerY > canvas.height) {
            debris.centerY = 0;
        }
        
        // Reduce lifetime
        debris.lifetime--;
        
        // Remove dead debris
        if (debris.lifetime <= 0) {
            shipDebris.splice(i, 1);
        }
    }
}

// Destroy an asteroid and potentially create smaller ones
function destroyAsteroid(index) {
    const asteroid = asteroids[index];
    // Score increases with level
    const levelBonus = Math.floor((level - 1) * 0.5 * SCORE_MULTIPLIER); // 50% more points per level
    score += (SCORE_MULTIPLIER * (4 - asteroid.size)) + levelBonus;
    
    // Play appropriate explosion sound based on asteroid size
    if (asteroid.size === 3) {
        playSound('bangLarge');
    } else if (asteroid.size === 2) {
        playSound('bangMedium');
    } else {
        playSound('bangSmall');
    }
    
    // Create smaller asteroids
    if (asteroid.size > 1) {
        // Higher levels create more child asteroids
        const numChildren = Math.min(2 + Math.floor((level - 1) / 3), 4); // Add an extra child every 3 levels, max 4
        for (let i = 0; i < numChildren; i++) {
            asteroids.push(createAsteroid(
                asteroid.x,
                asteroid.y,
                asteroid.size - 1
            ));
        }
    }
    
    // Remove the asteroid
    asteroids.splice(index, 1);
    
    addLogMessage(`Asteroid destroyed! Score: ${score} (Level ${level} bonus: ${levelBonus})`);
}

// Calculate distance between two points
function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Draw the game
function drawGame() {
    // Draw ship or debris
    if (ship.exploding) {
        drawShipDebris();
    } else {
        drawShip();
    }
    
    // Draw asteroids
    drawAsteroids();
    
    // Draw bullets
    drawBullets();
    
    // Draw game info (score, lives, level)
    drawGameInfo();
}

// Draw the player's ship
function drawShip() {
    // Draw ship
    ctx.strokeStyle = 'white';
    
    // Flash the ship during invulnerability period
    if (ship.invulnerable && Math.floor(frameCount / 5) % 2 === 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent
    }
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Nose of the ship - make it more pronounced by extending it further
    const noseX = ship.x + 1.7 * ship.radius * Math.cos(ship.angle);
    const noseY = ship.y - 1.7 * ship.radius * Math.sin(ship.angle);
    
    // Rear left - widen the base
    const rearLeftX = ship.x - ship.radius * (0.8 * Math.cos(ship.angle) + 1.2 * Math.sin(ship.angle));
    const rearLeftY = ship.y + ship.radius * (0.8 * Math.sin(ship.angle) - 1.2 * Math.cos(ship.angle));
    
    // Rear right - widen the base
    const rearRightX = ship.x - ship.radius * (0.8 * Math.cos(ship.angle) - 1.2 * Math.sin(ship.angle));
    const rearRightY = ship.y + ship.radius * (0.8 * Math.sin(ship.angle) + 1.2 * Math.cos(ship.angle));
    
    // Draw the main triangle
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(rearLeftX, rearLeftY);
    ctx.lineTo(rearRightX, rearRightY);
    ctx.closePath();
    ctx.stroke();
    
    // Add a center line to emphasize direction
    const centerRearX = ship.x - ship.radius * 0.5 * Math.cos(ship.angle);
    const centerRearY = ship.y + ship.radius * 0.5 * Math.sin(ship.angle);
    
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(centerRearX, centerRearY);
    ctx.stroke();
    
    // Draw thruster
    if (ship.thrusting) {
        ctx.fillStyle = 'orangered';
        ctx.beginPath();
        
        // Rear center - position it at the base of the ship
        const rearX = ship.x - ship.radius * 1.2 * Math.cos(ship.angle);
        const rearY = ship.y + ship.radius * 1.2 * Math.sin(ship.angle);
        
        // Make the thruster flame more dynamic
        const flameSize = 0.8 + 0.4 * Math.random(); // Random flicker effect
        const flameTipX = ship.x - ship.radius * (1.2 + flameSize) * Math.cos(ship.angle);
        const flameTipY = ship.y + ship.radius * (1.2 + flameSize) * Math.sin(ship.angle);
        
        ctx.moveTo(rearLeftX, rearLeftY);
        ctx.lineTo(flameTipX, flameTipY);
        ctx.lineTo(rearRightX, rearRightY);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw invulnerability shield
    if (ship.invulnerable) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.arc(ship.x, ship.y, ship.radius * 1.5, 0, Math.PI * 2, false);
        ctx.stroke();
    }
}

// Draw the asteroids
function drawAsteroids() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];
        
        // Draw asteroid
        ctx.beginPath();
        
        // Draw a rough circle with jagged edges
        for (let j = 0; j < asteroid.vert; j++) {
            const angle = j * Math.PI * 2 / asteroid.vert;
            const radius = asteroid.radius * asteroid.offset[j];
            const x = asteroid.x + radius * Math.cos(angle + asteroid.angle);
            const y = asteroid.y + radius * Math.sin(angle + asteroid.angle);
            
            if (j === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
}

// Draw the bullets
function drawBullets() {
    ctx.fillStyle = 'white';
    
    for (let i = 0; i < bullets.length; i++) {
        ctx.beginPath();
        ctx.arc(bullets[i].x, bullets[i].y, 2, 0, Math.PI * 2, false);
        ctx.fill();
    }
}

// Draw game information (score, lives, level)
function drawGameInfo() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, 40); // Black background for info bar
    
    ctx.strokeStyle = 'white';
    ctx.strokeRect(0, 0, canvas.width, 40); // White border
    
    ctx.fillStyle = 'white';
    ctx.font = '16px PressStart2P';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 25);
    
    ctx.textAlign = 'center';
    ctx.fillText(`Level: ${level}`, canvas.width / 2, 25);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${lives}`, canvas.width - 20, 25);
    
    // Add level transition message
    if (asteroids.length === 0) {
        ctx.font = '20px PressStart2P';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${level} COMPLETE!`, canvas.width / 2, canvas.height / 2);
        ctx.font = '12px PressStart2P';
        ctx.fillText('Get Ready for Next Level...', canvas.width / 2, canvas.height / 2 + 30);
        
        // Show level stats
        ctx.font = '10px PressStart2P';
        ctx.fillText(`Asteroid Speed: ${Math.round((BASE_ASTEROID_SPEED + Math.min((level - 1) * ASTEROID_SPEED_SCALING, MAX_ASTEROID_SPEED - BASE_ASTEROID_SPEED)) * 100)}%`, canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText(`Score Multiplier: ${Math.round((1 + (level - 1) * 0.5) * 100)}%`, canvas.width / 2, canvas.height / 2 + 80);
        ctx.fillText(`Asteroid Children: ${Math.min(2 + Math.floor((level - 1) / 3), 4)}`, canvas.width / 2, canvas.height / 2 + 100);
    }
}

// Draw ship debris
function drawShipDebris() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < shipDebris.length; i++) {
        const debris = shipDebris[i];
        
        // Calculate the endpoints based on center, length, and angle
        const halfLength = debris.length / 2;
        const x1 = debris.centerX - halfLength * Math.cos(debris.angle);
        const y1 = debris.centerY - halfLength * Math.sin(debris.angle);
        const x2 = debris.centerX + halfLength * Math.cos(debris.angle);
        const y2 = debris.centerY + halfLength * Math.sin(debris.angle);
        
        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Add a fading effect as lifetime decreases
        if (debris.lifetime < 60) { // Last second
            const opacity = debris.lifetime / 60;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        } else {
            ctx.strokeStyle = 'white';
        }
    }
}

// Check if score is a high score - updated to check against server scores
function isHighScore(score) {
    // If we haven't fetched scores yet, be conservative and assume it's a high score
    if (!highScoresFetched) return true;
    
    // If there are fewer than HIGH_SCORE_COUNT scores, it's definitely a high score
    if (highScores.length < HIGH_SCORE_COUNT) return score > 0;
    
    // Otherwise, check if it's higher than the lowest score
    return score > 0 && score > highScores[highScores.length - 1].score;
}

// New function to submit high score to server
function submitHighScore(initials, score) {
    isSubmittingScore = true;
    scoreSubmitError = null;
    
    // Collect some game data for potential verification
    const gameData = {
        level: level,
        timestamp: Date.now(),
        timePlayed: Date.now() - lastScoreSubmitTime
    };
    
    // Update last submit time
    lastScoreSubmitTime = Date.now();
    
    fetch('/api/highscores', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            initials, 
            score,
            gameData
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server returned error: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        // Update high scores with the latest from server
        highScores = data.highScores;
        isSubmittingScore = false;
        enteringInitials = false;
        addLogMessage(`High score added: ${initials} - ${score}`);
        // Play a sound for feedback
        playSound('bangLarge');
    })
    .catch(error => {
        isSubmittingScore = false;
        scoreSubmitError = error.message;
        addLogMessage(`Error submitting high score: ${error.message}`);
        // Still play a sound for feedback
        playSound('bangSmall');
    });
}

// Initialize welcome screen asteroids
function initWelcomeAsteroids() {
    welcomeAsteroids = [];
    
    // Create some asteroids for the welcome screen
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        welcomeAsteroids.push({
            x: x,
            y: y,
            size: Math.floor(Math.random() * 3) + 1,
            radius: (Math.floor(Math.random() * 3) + 1) * 20,
            angle: Math.random() * Math.PI * 2,
            vert: Math.floor(Math.random() * 6) + 5,
            offset: [],
            velocity: {
                x: Math.random() * BASE_ASTEROID_SPEED - BASE_ASTEROID_SPEED/2,
                y: Math.random() * BASE_ASTEROID_SPEED - BASE_ASTEROID_SPEED/2
            }
        });
        
        // Create the asteroid's shape (offset array)
        for (let j = 0; j < welcomeAsteroids[i].vert; j++) {
            welcomeAsteroids[i].offset.push(
                Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG
            );
        }
    }
    
    addLogMessage('Welcome screen asteroids created');
}

// Draw release notes overlay
function drawReleaseNotes() {
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = 'white';
    ctx.font = '24px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('RELEASE NOTES', canvas.width / 2, 50);

    // Draw close instruction
    ctx.font = '12px PressStart2P';
    ctx.fillText('PRESS N TO CLOSE', canvas.width / 2, 80);

    // Calculate visible area
    const startY = 120 - releaseNotesScroll;
    let currentY = startY;

    // Get today's date for the latest version
    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Release notes with accurate dates
    const releases = [
        {
            version: '1.0.0',
            date: '2025-03-01',
            changes: [
                'Initial release',
                'Basic game mechanics implemented',
                'High score system added',
                'Sound effects added'
            ]
        },
        {
            version: '1.1.0',
            date: '2025-03-10',
            changes: [
                'Added release notes system',
                'Improved asteroid movement',
                'Added pause functionality',
                'Fixed bullet count limit'
            ]
        },
        {
            version: '1.2.0',
            date: '2025-03-16',
            changes: [
                'Added server-based high score system',
                'Implemented safe respawn system',
                'Enhanced asteroid behavior with size-based speed',
                'Added alien spacecraft with intelligent behavior',
                'Improved collision detection and physics',
                'Added dynamic ship explosion animations',
                'Enhanced sound effects using Web Audio API',
                'Added welcome screen with game instructions',
                'Implemented debug log system (toggle with L key)'
            ]
        }
    ];

    // Draw releases
    releases.forEach(release => {
        // Only draw if in visible area
        if (currentY > 100 && currentY < canvas.height - 20) {
            // Draw version and date
            ctx.font = '16px PressStart2P';
            ctx.fillStyle = '#FFD700'; // Gold color for version
            ctx.fillText(`v${release.version} (${release.date})`, canvas.width / 2, currentY);

            // Draw changes
            ctx.font = '12px PressStart2P';
            ctx.fillStyle = 'white';
            release.changes.forEach((change, index) => {
                currentY += 25;
                if (currentY > 100 && currentY < canvas.height - 20) {
                    ctx.fillText(`• ${change}`, canvas.width / 2, currentY);
                }
            });
        }
        currentY += 40; // Space between versions
    });

    // Draw scroll indicators if needed
    if (releaseNotesScroll > 0) {
        drawScrollIndicator('up', 20);
    }
    if (currentY > canvas.height) {
        drawScrollIndicator('down', canvas.height - 20);
    }
}

// Helper function to draw scroll indicators
function drawScrollIndicator(direction, y) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    if (direction === 'up') {
        ctx.moveTo(canvas.width / 2 - 10, y + 10);
        ctx.lineTo(canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2 + 10, y + 10);
    } else {
        ctx.moveTo(canvas.width / 2 - 10, y - 10);
        ctx.lineTo(canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2 + 10, y - 10);
    }
    ctx.closePath();
    ctx.fill();
}

// Create a new alien spacecraft
function createAliens() {
    aliens = [];
    
    // Create aliens based on spawn chance
    for (let i = 0; i < ALIEN_MAX_COUNT; i++) {
        if (Math.random() < ALIEN_SPAWN_CHANCE) {
            aliens.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                dx: Math.random() * ALIEN_SPEED * 2 - ALIEN_SPEED,
                dy: Math.random() * ALIEN_SPEED * 2 - ALIEN_SPEED,
                angle: 0,
                rotation: 0,
                targetAngle: 0,
                fireTimer: 0,
                directionTimer: 0,
                active: true,
                thrusting: false
            });
        }
    }
    
    addLogMessage('Aliens created');
}

// Update alien ships' behavior and state
function updateAliens() {
    // Alien AI implements several sophisticated behaviors:
    // 1. Periodic direction changes to create unpredictable movement
    // 2. Predictive shooting that leads the target
    // 3. Smart positioning that maintains optimal attack distance
    // 4. Asteroid avoidance to prevent self-destruction
    
    // Timer-based spawn system scales with game progression
    alienSpawnTimer--;
    if (alienSpawnTimer <= 0 && aliens.length < ALIEN_MAX_COUNT) {
        // Calculate spawn interval that decreases with level
        const spawnInterval = Math.max(
            ALIEN_MIN_SPAWN_INTERVAL,
            ALIEN_BASE_SPAWN_INTERVAL - (level - 1) * ALIEN_SPAWN_INTERVAL_DECREASE
        );
        alienSpawnTimer = spawnInterval;
        spawnAlien();
    }
    
    // Update each alien's behavior and state
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        
        // Move alien and handle screen wrapping
        alien.x += alien.dx;
        alien.y += alien.dy;
        handleEdgeOfScreen(alien);
        
        // Update direction change timer for unpredictable movement
        alien.directionTimer++;
        if (alien.directionTimer >= ALIEN_CHANGE_DIRECTION_RATE) {
            alien.directionTimer = 0;
            // Choose new random direction and thrust state
            alien.targetAngle = Math.random() * Math.PI * 2;
            alien.thrusting = Math.random() < 0.7; // 70% chance to be moving
        }
        
        // Implement smooth rotation towards target angle
        const angleDiff = (alien.targetAngle - alien.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        if (Math.abs(angleDiff) > 0.01) {
            alien.rotation = Math.sign(angleDiff) * ALIEN_ROTATION_SPEED;
        } else {
            alien.rotation = 0;
        }
        alien.angle += alien.rotation;
        
        // Apply thrust with the same physics model as the player ship
        if (alien.thrusting) {
            alien.dx += Math.cos(alien.angle) * ALIEN_THRUST;
            alien.dy += Math.sin(alien.angle) * ALIEN_THRUST;
        }
        
        // Apply friction to create smooth movement
        alien.dx *= ALIEN_FRICTION;
        alien.dy *= ALIEN_FRICTION;
        
        // Implement intelligent shooting behavior
        if (ship && !ship.exploding && alienBullets.length < ALIEN_MAX_BULLETS) {
            alien.fireTimer++;
            // Randomize fire rate for unpredictability
            const fireRate = ALIEN_FIRE_RATE_MIN + Math.random() * (ALIEN_FIRE_RATE_MAX - ALIEN_FIRE_RATE_MIN);
            
            if (alien.fireTimer >= fireRate) {
                alien.fireTimer = 0;
                
                // Advanced target prediction system:
                // 1. Calculate player's future position based on current velocity
                // 2. Add randomized spread for difficulty balance
                // 3. Consider distance to target for accuracy scaling
                const predictionTime = 30; // Look ahead 30 frames
                const predictedX = ship.x + (ship.thrust.x * predictionTime);
                const predictedY = ship.y + (ship.thrust.y * predictionTime);
                
                // Calculate firing angle with intelligent spread
                const dx = predictedX - alien.x;
                const dy = predictedY - alien.y;
                const angle = Math.atan2(dy, dx);
                const spread = Math.PI / 8; // 22.5 degrees spread
                const finalAngle = angle + (Math.random() * spread - spread/2);
                
                // Create new bullet with calculated trajectory
                alienBullets.push({
                    x: alien.x,
                    y: alien.y,
                    dx: Math.cos(finalAngle) * ALIEN_BULLET_SPEED,
                    dy: Math.sin(finalAngle) * ALIEN_BULLET_SPEED,
                    active: true,
                    size: ALIEN_BULLET_SIZE,
                    pulsePhase: 0
                });
                playSound('fire');
            }
        }
    }
}

// Create a single new alien
function createAlien() {
    // Randomly choose spawn side
    const spawnSide = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y, dx, dy;
    
    switch(spawnSide) {
        case 0: // top
            x = Math.random() * canvas.width;
            y = -ALIEN_SIZE;
            dx = Math.random() * ALIEN_SPEED * 2 - ALIEN_SPEED;
            dy = Math.random() * ALIEN_SPEED;
            break;
        case 1: // right
            x = canvas.width + ALIEN_SIZE;
            y = Math.random() * canvas.height;
            dx = -Math.random() * ALIEN_SPEED;
            dy = Math.random() * ALIEN_SPEED * 2 - ALIEN_SPEED;
            break;
        case 2: // bottom
            x = Math.random() * canvas.width;
            y = canvas.height + ALIEN_SIZE;
            dx = Math.random() * ALIEN_SPEED * 2 - ALIEN_SPEED;
            dy = -Math.random() * ALIEN_SPEED;
            break;
        case 3: // left
            x = -ALIEN_SIZE;
            y = Math.random() * canvas.height;
            dx = Math.random() * ALIEN_SPEED;
            dy = Math.random() * ALIEN_SPEED * 2 - ALIEN_SPEED;
            break;
    }
    
    aliens.push({
        x: x,
        y: y,
        dx: dx,
        dy: dy,
        radius: ALIEN_SIZE, // Add radius property for proper wrapping
        angle: 0,
        rotation: 0,
        targetAngle: 0,
        fireTimer: 0,
        directionTimer: 0,
        active: true,
        thrusting: false
    });
    
    addLogMessage('New alien spacecraft appeared!');
}

// Draw aliens
function drawAliens() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < aliens.length; i++) {
        const alien = aliens[i];
        
        // Save the current context state
        ctx.save();
        
        // Translate to alien's position and rotate
        ctx.translate(alien.x, alien.y);
        ctx.rotate(alien.angle);

        // Draw saucer shape
        ctx.beginPath();
        ctx.moveTo(-ALIEN_SIZE, 0);
        ctx.lineTo(-ALIEN_SIZE/2, -ALIEN_SIZE/2);
        ctx.lineTo(ALIEN_SIZE/2, -ALIEN_SIZE/2);
        ctx.lineTo(ALIEN_SIZE, 0);
        ctx.lineTo(ALIEN_SIZE/2, ALIEN_SIZE/2);
        ctx.lineTo(-ALIEN_SIZE/2, ALIEN_SIZE/2);
        ctx.closePath();
        ctx.stroke();

        // Draw cockpit
        ctx.beginPath();
        ctx.arc(0, 0, ALIEN_SIZE/4, 0, Math.PI * 2);
        ctx.stroke();

        // Draw thrust if active - Fixed direction to match movement
        if (alien.thrusting) {
            ctx.fillStyle = 'orangered';
            ctx.beginPath();
            const flameSize = 0.8 + 0.4 * Math.random(); // Random flicker effect
            ctx.moveTo(-ALIEN_SIZE/2, 0);
            ctx.lineTo(-ALIEN_SIZE - ALIEN_SIZE * flameSize, 0);
            ctx.lineTo(-ALIEN_SIZE/2, ALIEN_SIZE/3);
            ctx.moveTo(-ALIEN_SIZE/2, 0);
            ctx.lineTo(-ALIEN_SIZE/2, -ALIEN_SIZE/3);
            ctx.closePath();
            ctx.fill();
        }

        // Restore the context state
        ctx.restore();
    }
}

// Update alien bullets
function updateAlienBullets() {
    // Remove inactive bullets first
    alienBullets = alienBullets.filter(bullet => bullet.active);

    // Update all existing bullets
    for (let i = alienBullets.length - 1; i >= 0; i--) {
        const bullet = alienBullets[i];
        
        // Move bullet
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        // Update pulse animation
        bullet.pulsePhase = (bullet.pulsePhase + ALIEN_BULLET_PULSE_SPEED) % (Math.PI * 2);
        bullet.size = ALIEN_BULLET_SIZE * (1 + 0.2 * Math.sin(bullet.pulsePhase));

        // Remove if off screen
        if (bullet.x < 0 || bullet.x > canvas.width || 
            bullet.y < 0 || bullet.y > canvas.height) {
            bullet.active = false;
            continue;
        }

        // Check collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullet.x, bullet.y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius) {
                bullet.active = false;
                destroyAsteroid(j);
                break;
            }
        }

        // Check collision with player
        if (ship && !ship.exploding && !ship.invulnerable) {
            if (distBetweenPoints(bullet.x, bullet.y, ship.x, ship.y) < SHIP_SIZE) {
                bullet.active = false;
                destroyShip();
            }
        }
    }
}

// Draw alien bullets
function drawAlienBullets() {
    ctx.lineWidth = 2;
    
    alienBullets.forEach(bullet => {
        // Create gradient for bullet
        const gradient = ctx.createRadialGradient(
            bullet.x, bullet.y, 0,
            bullet.x, bullet.y, bullet.size
        );
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, 'red');
        
        // Draw outer glow
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw main bullet
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
} 