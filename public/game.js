// Add copyright notice at the top of the file
console.log('Asteroids Game (c) James Puddicombe 2025');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let logMessages = [];
let squareX = 0;
let squareY = 0;
let squareSpeed = 2;
let gameStarted = false;
let gameLoopRunning = false; // Flag to prevent multiple game loops

// Add initial log message
addLogMessage('Game initializing...');

// Add variables for static stars
let stars = [];
let starsGenerated = false;
let welcomeAsteroids = []; // Asteroids for welcome screen
let showLog = false; // Log is hidden by default

// Add variables for high scores - now fetched from server
let highScores = [];
const HIGH_SCORE_COUNT = 15; // Increased from 5 to 15 for server-based scores
let playerInitials = "AAA";
let enteringInitials = false;
let currentInitialIndex = 0;
let highScoresFetched = false; // Flag to track if high scores have been fetched

// Add variables for animations
let titleHoverOffset = 0;
let titleHoverDirection = 1;
let frameCount = 0;

// Game objects and state
let ship = null;
let asteroids = [];
let bullets = [];
let score = 0;
let lives = 3;
let level = 1;

// Constants for game mechanics
const SHIP_SIZE = 20;
const SHIP_THRUST = 0.2;
const SHIP_ROTATION_SPEED = 0.1;
const FRICTION = 0.99;
const BULLET_SPEED = 7;
const BULLET_LIFETIME = 60; // frames
const ASTEROID_SPEED = 1;
const ASTEROID_COUNT = 3; // initial count, increases with level

// Key states for smooth controls
let keys = {
    left: false,
    right: false,
    up: false,
    space: false
};

// Sound effects
let soundFX = {
    fire: null,
    thrust: null,
    bangLarge: null,
    bangMedium: null,
    bangSmall: null,
    explode: null
};

// Audio context for sound generation
let audioContext = null;

// Add variables for ship explosion debris
let shipDebris = [];
const DEBRIS_SPEED = 0.5;
const DEBRIS_ROTATION_SPEED = 0.02;
const DEBRIS_LIFETIME = 180; // 3 seconds at 60fps

// Add a constant for safe respawn distance
const SAFE_RESPAWN_DISTANCE = 100; // Minimum distance from any asteroid

// Add a game paused state variable
let gamePaused = false;

// Update the max bullets constant
const MAX_BULLETS = 4; // Maximum bullets on screen at once (like the original game)

// Add variables for server communication
let isSubmittingScore = false;
let scoreSubmitError = null;
let lastScoreSubmitTime = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    squareY = canvas.height / 2; // Update square position after resize
    addLogMessage('Canvas resized to: ' + canvas.width + ' x ' + canvas.height);
    
    // Regenerate stars for the new canvas size
    starsGenerated = false;
    generateStars();
}

window.addEventListener('resize', resizeCanvas);

// Draw the welcome screen once
function init() {
    addLogMessage('Initializing game...');
    resizeCanvas();
    
    // Load sounds
    loadSounds();
    
    // Initialize welcome screen asteroids
    initWelcomeAsteroids();
    
    // Fetch high scores from server
    fetchHighScores();
    
    // Start in welcome screen state
    gameStarted = false;
    enteringInitials = false;
    
    // Only start game loop if not already running
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        requestAnimationFrame(gameLoop);
        addLogMessage('Game loop started in welcome screen mode');
    }
}

// New function to fetch high scores from server
function fetchHighScores() {
    addLogMessage('Fetching high scores from server...');
    
    // Use default scores if fetch fails
    const defaultScores = [
        { initials: "JP1", score: 10000 },
        { initials: "JP2", score: 8000 },
        { initials: "JP3", score: 6000 },
        { initials: "JP4", score: 4000 },
        { initials: "JP5", score: 2000 }
    ];
    
    fetch('/api/highscores')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            highScores = data;
            highScoresFetched = true;
            addLogMessage('High scores loaded from server');
        })
        .catch(error => {
            addLogMessage('Error loading high scores: ' + error.message);
            // Use default scores if fetch fails
            highScores = defaultScores;
            highScoresFetched = true;
        });
}

// Wait for window to fully load
window.addEventListener('load', function() {
    addLogMessage('Window loaded');
    init();
});

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw based on game state
    if (!gameStarted) {
        if (enteringInitials) {
            drawGameOver();
        } else {
            drawWelcomeElements();
        }
    } else {
        // Only update game state if not paused
        if (!gamePaused) {
            updateGame();
        } else {
            // Draw pause message
            drawPauseScreen();
        }
        
        // Draw game elements regardless of pause state
        drawGame();
    }
    
    // Draw log last so it's on top
    drawLog();
    
    requestAnimationFrame(gameLoop);
}

function addLogMessage(message) {
    // Remove console.log, only add to the in-game log
    logMessages.push(message);
    if (logMessages.length > 10) {
        logMessages.shift();
    }
}

function drawLog() {
    // Only draw log if showLog is true
    if (!showLog) return;
    
    // Draw log background with border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, 120);
    
    // Add a border
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, 120);
    
    // Draw log text
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    
    logMessages.forEach((msg, index) => {
        ctx.fillText(msg, 60, 25 + index * 18);
    });
}

function drawWelcomeScreen() {
    addLogMessage('Drawing welcome screen');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = 'white';
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }

    // Draw title
    ctx.fillStyle = 'white';
    ctx.font = '20px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDS', canvas.width / 2, canvas.height / 2 - 50);

    // Draw start prompt
    ctx.font = '10px PressStart2P';
    ctx.fillText('PRESS ENTER TO START', canvas.width / 2, canvas.height / 2 + 20);

    // Blink effect for start prompt
    let blink = true;
    setInterval(() => {
        ctx.clearRect(0, canvas.height / 2 + 10, canvas.width, 30);
        if (blink) {
            ctx.fillText('PRESS ENTER TO START', canvas.width / 2, canvas.height / 2 + 20);
        }
        blink = !blink;
    }, 500);
}

// Generate stars once
function generateStars() {
    if (!starsGenerated) {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1, // Vary star size between 1-3 pixels
                brightness: 0.5 + Math.random() * 0.5, // Random brightness
                twinkleSpeed: 0.01 + Math.random() * 0.03, // Random twinkle speed
                twinkleOffset: Math.random() * Math.PI * 2 // Random starting phase
            });
        }
        starsGenerated = true;
        addLogMessage('Stars generated with twinkling effect');
    }
}

// Modify the drawWelcomeElements function to include instructions and asteroid score info
function drawWelcomeElements() {
    // Generate stars if not already done
    generateStars();
    
    // Update animation values
    frameCount++;
    
    // Hover effect for title
    titleHoverOffset += 0.05 * titleHoverDirection;
    if (titleHoverOffset > 5 || titleHoverOffset < -5) {
        titleHoverDirection *= -1;
    }
    
    // Draw stars with twinkling effect
    stars.forEach(star => {
        // Calculate twinkling brightness
        const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.twinkleOffset);
        const brightness = star.brightness * (0.7 + 0.3 * twinkle);
        
        // Apply brightness to star color
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    
    // Update and draw welcome screen asteroids
    updateWelcomeAsteroids();
    drawWelcomeAsteroids();

    // Draw title with hover effect
    ctx.fillStyle = 'white';
    ctx.font = '28px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDS', canvas.width / 2, canvas.height / 5 + titleHoverOffset);

    // Draw start prompt with blinking effect
    ctx.font = '12px PressStart2P';
    if (Math.floor(frameCount / 30) % 2 === 0) {
        ctx.fillText('PRESS ENTER TO START', canvas.width / 2, canvas.height / 5 + 40);
    }
    
    // Draw instructions
    drawWelcomeInstructions();
    
    // Draw asteroid score information
    drawAsteroidScoreInfo();
    
    // Draw high scores
    drawHighScores();
}

// Draw game instructions on welcome screen
function drawWelcomeInstructions() {
    ctx.fillStyle = 'white';
    ctx.font = '12px PressStart2P';
    ctx.textAlign = 'center';
    
    // Title for instructions
    ctx.fillText('CONTROLS', canvas.width / 2, canvas.height / 3);
    
    // Instructions with smaller font
    ctx.font = '10px PressStart2P';
    const instructions = [
        'ROTATE: LEFT/RIGHT ARROWS or A/D',
        'THRUST: UP ARROW or W',
        'FIRE: SPACEBAR (MAX 4 BULLETS)',
        'PAUSE: P',
        'EXIT: ESC (RETURNS TO MENU)',
        'TOGGLE LOG: L'
    ];
    
    instructions.forEach((instruction, index) => {
        ctx.fillText(instruction, canvas.width / 2, canvas.height / 3 + 25 + index * 20);
    });
}

// Draw asteroid score information
function drawAsteroidScoreInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '12px PressStart2P';
    ctx.textAlign = 'center';
    
    // Title for score info
    ctx.fillText('ASTEROID POINTS', canvas.width / 4, canvas.height / 2 + 20);
    
    // Draw asteroid examples and their scores
    const asteroidSizes = [
        { size: 3, score: 100, label: 'LARGE' },
        { size: 2, score: 200, label: 'MEDIUM' },
        { size: 1, score: 300, label: 'SMALL' }
    ];
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    
    asteroidSizes.forEach((asteroid, index) => {
        const y = canvas.height / 2 + 50 + index * 40;
        
        // Draw example asteroid
        ctx.beginPath();
        const radius = asteroid.size * 10;
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI * 2 / 8;
            const jag = (i % 2 === 0) ? 1 : 0.8; // Simple jagged effect
            const x = canvas.width / 4 - 60 + radius * jag * Math.cos(angle);
            const y2 = y + radius * jag * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(x, y2);
            } else {
                ctx.lineTo(x, y2);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw score text
        ctx.fillText(`${asteroid.label}: ${asteroid.score} PTS`, canvas.width / 4 + 40, y + 5);
    });
}

// Update welcome screen asteroids
function updateWelcomeAsteroids() {
    for (let i = 0; i < welcomeAsteroids.length; i++) {
        // Move asteroid
        welcomeAsteroids[i].x += welcomeAsteroids[i].velocity.x * 0.5; // Slower movement for welcome screen
        welcomeAsteroids[i].y += welcomeAsteroids[i].velocity.y * 0.5;
        
        // Rotate asteroid
        welcomeAsteroids[i].angle += 0.005;
        
        // Handle edge of screen (wrap around)
        handleEdgeOfScreen(welcomeAsteroids[i]);
    }
}

// Draw welcome screen asteroids
function drawWelcomeAsteroids() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < welcomeAsteroids.length; i++) {
        const asteroid = welcomeAsteroids[i];
        
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

// Draw high scores - updated to handle more entries
function drawHighScores() {
    ctx.fillStyle = 'white';
    ctx.font = '12px PressStart2P';
    ctx.textAlign = 'center';
    
    ctx.fillText('HIGH SCORES', canvas.width * 3/4, canvas.height / 2 + 20);
    
    // Show loading message if scores haven't been fetched yet
    if (!highScoresFetched) {
        ctx.font = '10px PressStart2P';
        ctx.fillText('LOADING...', canvas.width * 3/4, canvas.height / 2 + 50);
        return;
    }
    
    ctx.font = '10px PressStart2P';
    // Calculate how many scores to show based on available space
    const availableHeight = canvas.height / 2 + 50;
    const scoreHeight = 20; // Height per score entry
    const maxToShow = Math.min(10, highScores.length); // Show at most 10 on welcome screen
    
    for (let i = 0; i < maxToShow; i++) {
        // Adjust vertical spacing
        const yPos = canvas.height / 2 + 50 + i * scoreHeight;
        
        // Format the score with commas for readability
        const formattedScore = highScores[i].score.toLocaleString();
        
        ctx.fillText(
            `${i + 1}. ${highScores[i].initials} - ${formattedScore}`,
            canvas.width * 3/4,
            yPos
        );
    }
    
    // If there are more scores than we can show, indicate that
    if (highScores.length > maxToShow) {
        ctx.fillText(
            `+ ${highScores.length - maxToShow} MORE...`,
            canvas.width * 3/4,
            canvas.height / 2 + 50 + maxToShow * scoreHeight
        );
    }
}

// Draw game over screen with initials entry - updated with server submission status
function drawGameOver() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars for background
    stars.forEach(star => {
        const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.twinkleOffset);
        const brightness = star.brightness * (0.7 + 0.3 * twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    
    ctx.fillStyle = 'white';
    ctx.font = '28px PressStart2P';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '16px PressStart2P';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 3 + 40);
    
    if (enteringInitials) {
        ctx.fillText('ENTER YOUR INITIALS:', canvas.width / 2, canvas.height / 2);
        
        // Draw initials entry boxes
        const boxWidth = 40;
        const boxHeight = 50;
        const boxSpacing = 20;
        const totalWidth = (boxWidth * 3) + (boxSpacing * 2);
        const startX = (canvas.width - totalWidth) / 2;
        
        for (let i = 0; i < 3; i++) {
            const x = startX + (i * (boxWidth + boxSpacing));
            const y = canvas.height / 2 + 20;
            
            // Draw box
            ctx.strokeStyle = i === currentInitialIndex ? 'yellow' : 'white';
            ctx.lineWidth = i === currentInitialIndex ? 3 : 1;
            ctx.strokeRect(x, y, boxWidth, boxHeight);
            
            // Draw letter
            ctx.fillStyle = 'white';
            ctx.font = '28px PressStart2P';
            ctx.fillText(playerInitials[i], x + boxWidth/2, y + boxHeight/2 + 10);
            
            // Draw cursor for current position
            if (i === currentInitialIndex && Math.floor(frameCount / 15) % 2 === 0) {
                ctx.fillRect(x + boxWidth/2 - 15, y + boxHeight - 10, 30, 3);
            }
        }
        
        // Draw instructions
        ctx.font = '12px PressStart2P';
        ctx.fillText('USE ARROW KEYS TO SELECT LETTERS', canvas.width / 2, canvas.height / 2 + 100);
        ctx.fillText('PRESS ENTER WHEN DONE', canvas.width / 2, canvas.height / 2 + 125);
        
        // Show submission status if applicable
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
        // If not entering initials, show prompt to continue
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
    const ASTEROID_JAG = 0.4; // jaggedness (0 = smooth, 1 = very jagged)
    
    let asteroid = {
        x: x,
        y: y,
        size: size,
        radius: size * 20,
        angle: Math.random() * Math.PI * 2,
        vert: Math.floor(Math.random() * (ASTEROID_VERT + 1) + ASTEROID_VERT / 2),
        offset: [],
        velocity: {
            x: Math.random() * ASTEROID_SPEED * 2 - ASTEROID_SPEED,
            y: Math.random() * ASTEROID_SPEED * 2 - ASTEROID_SPEED
        }
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
    // If lives are 0 and ship is exploding, only update debris and asteroids
    if (lives <= 0 && ship.exploding) {
        // Update ship debris
        updateShipDebris();
        
        // Update asteroids
        updateAsteroids();
        
        return; // Skip the rest of the game updates
    }
    
    // Handle ship rotation (reversed left/right)
    if (keys.left) {
        ship.rotation = SHIP_ROTATION_SPEED; // Reversed from negative to positive
    } else if (keys.right) {
        ship.rotation = -SHIP_ROTATION_SPEED; // Reversed from positive to negative
    } else {
        ship.rotation = 0;
    }
    
    // Handle ship thrust and sound
    if (keys.up && !ship.thrusting && !ship.exploding) {
        ship.thrusting = true;
        playThrustSound(true);
    } else if (!keys.up && ship.thrusting) {
        ship.thrusting = false;
        playThrustSound(false);
    }
    
    // Handle firing with sound
    if (keys.space) {
        fireBullet();
        keys.space = false; // Reset to prevent continuous firing
    }
    
    // Update ship
    updateShip();
    
    // Update ship debris
    updateShipDebris();
    
    // Update bullets
    updateBullets();
    
    // Update asteroids
    updateAsteroids();
    
    // Check for collisions
    checkCollisions();
    
    // Check for level completion
    if (asteroids.length === 0) {
        level++;
        createAsteroids();
        addLogMessage('Level ' + level + ' started');
    }
}

// Update ship position and rotation
function updateShip() {
    if (ship.exploding) {
        ship.explodeTime--;
        if (ship.explodeTime === 0) {
            // Find a safe position to respawn
            respawnShipSafely();
        }
        return;
    }
    
    // Rotate ship
    ship.angle += ship.rotation;
    
    // Apply thrust
    if (ship.thrusting) {
        ship.thrust.x += SHIP_THRUST * Math.cos(ship.angle);
        ship.thrust.y -= SHIP_THRUST * Math.sin(ship.angle);
    } else {
        // Apply friction
        ship.thrust.x *= FRICTION;
        ship.thrust.y *= FRICTION;
    }
    
    // Move ship
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
    
    // Handle edge of screen (wrap around)
    handleEdgeOfScreen(ship);
}

// Find a safe position to respawn the ship
function respawnShipSafely() {
    // Start with the center position
    let newX = canvas.width / 2;
    let newY = canvas.height / 2;
    let safePosition = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // Limit attempts to prevent infinite loops
    
    // Try to find a safe position
    while (!safePosition && attempts < MAX_ATTEMPTS) {
        safePosition = true; // Assume position is safe until proven otherwise
        
        // Check distance to all asteroids
        for (let i = 0; i < asteroids.length; i++) {
            const asteroid = asteroids[i];
            
            // Calculate distance from potential spawn point to asteroid
            const distance = distBetweenPoints(newX, newY, asteroid.x, asteroid.y);
            
            // Also consider asteroid's velocity to predict near-future collisions
            const futureX = asteroid.x + asteroid.velocity.x * 30; // Look 30 frames ahead
            const futureY = asteroid.y + asteroid.velocity.y * 30;
            const futureDistance = distBetweenPoints(newX, newY, futureX, futureY);
            
            // If too close to current position or predicted future position
            if (distance < SAFE_RESPAWN_DISTANCE || futureDistance < SAFE_RESPAWN_DISTANCE) {
                safePosition = false;
                
                // Try a different position - divide the canvas into quadrants and try each
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
                
                break; // Break out of the asteroid loop and try the new position
            }
        }
        
        attempts++;
    }
    
    // If we couldn't find a safe position after max attempts, clear some space
    if (!safePosition) {
        // Create a safe zone by removing or moving asteroids near the center
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const distance = distBetweenPoints(canvas.width / 2, canvas.height / 2, asteroids[i].x, asteroids[i].y);
            
            if (distance < SAFE_RESPAWN_DISTANCE) {
                // Move asteroid to the edge of the screen
                const angle = Math.atan2(asteroids[i].y - canvas.height / 2, asteroids[i].x - canvas.width / 2);
                asteroids[i].x = canvas.width / 2 + Math.cos(angle) * SAFE_RESPAWN_DISTANCE * 1.5;
                asteroids[i].y = canvas.height / 2 + Math.sin(angle) * SAFE_RESPAWN_DISTANCE * 1.5;
            }
        }
        
        // Use center position
        newX = canvas.width / 2;
        newY = canvas.height / 2;
    }
    
    // Create new ship at safe position
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
        // Add invulnerability period after respawn
        invulnerable: true,
        invulnerableTime: 180 // 3 seconds at 60fps
    };
    
    addLogMessage('Ship respawned at safe location');
}

// Fire a bullet from the ship
function fireBullet() {
    if (ship.exploding || bullets.length >= MAX_BULLETS) {
        return; // Can't fire while exploding or too many bullets
    }
    
    bullets.push({
        x: ship.x + 4/3 * ship.radius * Math.cos(ship.angle),
        y: ship.y - 4/3 * ship.radius * Math.sin(ship.angle),
        xv: BULLET_SPEED * Math.cos(ship.angle),
        yv: -BULLET_SPEED * Math.sin(ship.angle),
        lifetime: BULLET_LIFETIME
    });
    
    // Play fire sound
    playSound('fire');
}

// Update bullets position and lifetime
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        // Move bullet
        bullets[i].x += bullets[i].xv;
        bullets[i].y += bullets[i].yv;
        
        // Handle edge of screen (wrap around)
        // Ensure bullets wrap around the screen properly
        if (bullets[i].x < 0) {
            bullets[i].x = canvas.width;
        } else if (bullets[i].x > canvas.width) {
            bullets[i].x = 0;
        }
        
        if (bullets[i].y < 0) {
            bullets[i].y = canvas.height;
        } else if (bullets[i].y > canvas.height) {
            bullets[i].y = 0;
        }
        
        // Reduce lifetime
        bullets[i].lifetime--;
        
        // Remove dead bullets
        if (bullets[i].lifetime <= 0) {
            bullets.splice(i, 1);
        }
    }
}

// Update asteroids position
function updateAsteroids() {
    for (let i = 0; i < asteroids.length; i++) {
        // Move asteroid
        asteroids[i].x += asteroids[i].velocity.x;
        asteroids[i].y += asteroids[i].velocity.y;
        
        // Handle edge of screen (wrap around)
        handleEdgeOfScreen(asteroids[i]);
    }
}

// Handle objects going off screen (wrap around)
function handleEdgeOfScreen(obj) {
    if (obj.x < 0 - obj.radius) {
        obj.x = canvas.width + obj.radius;
    } else if (obj.x > canvas.width + obj.radius) {
        obj.x = 0 - obj.radius;
    }
    
    if (obj.y < 0 - obj.radius) {
        obj.y = canvas.height + obj.radius;
    } else if (obj.y > canvas.height + obj.radius) {
        obj.y = 0 - obj.radius;
    }
}

// Check for collisions between objects
function checkCollisions() {
    // Check for asteroid collisions with ship
    if (!ship.exploding && !ship.invulnerable) {
        for (let i = 0; i < asteroids.length; i++) {
            if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.radius + asteroids[i].radius) {
                destroyShip();
                break;
            }
        }
    } else if (ship.invulnerable) {
        // Count down invulnerability time
        ship.invulnerableTime--;
        if (ship.invulnerableTime <= 0) {
            ship.invulnerable = false;
            addLogMessage('Ship vulnerability restored');
        }
    }
    
    // Check for bullet collisions with asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullets[j].x, bullets[j].y, asteroids[i].x, asteroids[i].y) < asteroids[i].radius) {
                // Remove the bullet
                bullets.splice(j, 1);
                
                // Break the asteroid
                destroyAsteroid(i);
                
                // No need to check other bullets for this asteroid
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
    score += 100 * (4 - asteroid.size); // More points for smaller asteroids
    
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
        for (let i = 0; i < 2; i++) {
            asteroids.push(createAsteroid(
                asteroid.x,
                asteroid.y,
                asteroid.size - 1
            ));
        }
    }
    
    // Remove the asteroid
    asteroids.splice(index, 1);
    
    addLogMessage('Asteroid destroyed! Score: ' + score);
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
    // Draw black background for the top info bar
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, 40);
    
    // Draw border for the info bar
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, 40);
    
    // Draw score, level, and lives
    ctx.fillStyle = 'white';
    ctx.font = '16px PressStart2P';
    
    // Score on the left
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 20, 25);
    
    // Level in the center
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL: ' + level, canvas.width / 2, 25);
    
    // Lives on the right
    ctx.textAlign = 'right';
    ctx.fillText('LIVES: ' + lives, canvas.width - 20, 25);
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
                x: Math.random() * ASTEROID_SPEED - ASTEROID_SPEED/2,
                y: Math.random() * ASTEROID_SPEED - ASTEROID_SPEED/2
            }
        });
        
        // Create the asteroid's shape (offset array)
        const ASTEROID_JAG = 0.4;
        for (let j = 0; j < welcomeAsteroids[i].vert; j++) {
            welcomeAsteroids[i].offset.push(
                Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG
            );
        }
    }
    
    addLogMessage('Welcome screen asteroids created');
} 