/**
 * SMASHTEROIDS - A modern reimagining inspired by the classic Asteroids arcade game
 * Copyright (c) James Puddicombe 2025
 * 
 * This implementation enhances the original Asteroids concept with:
 * - Modern web technologies (HTML5 Canvas, Web Audio API)
 * - Improved physics and collision detection
 * - Server-based high score system
 * - Intelligent enemy behavior
 * - Enhanced visual and audio feedback
 */

// Initialize canvas for rendering game graphics
let canvas;
let ctx;

// Game state tracking variables
let logMessages = [];        // Stores debug/info messages for development and user feedback
let gameStarted = false;     // Controls game state transitions between menu and gameplay
let gameLoopRunning = false; // Prevents multiple game loops from running simultaneously

// Score animation variables
let displayScore = 0;
let targetScore = 0;
let scoreAnimationSpeed = 5; // Points per frame

// Score pop-up system
let scorePopups = [];
const SCORE_POPUP_LIFETIME = 60;  // 1 second at 60fps
const SCORE_POPUP_SPEED = 1.5;    // Pixels per frame - increased for more movement
const SCORE_POPUP_FADE_START = 45; // When to start fading (frames remaining)
const SCORE_POPUP_BOUNCE_AMPLITUDE = 0.3; // Bounce effect amplitude

// Create a score popup at the given position
function createScorePopup(x, y, points) {
    scorePopups.push({
        x: x,
        y: y,
        points: points,
        lifetime: SCORE_POPUP_LIFETIME,
        scale: 0.5, // Start smaller for a pop-in effect
        opacity: 1,
        rotation: (Math.random() - 0.5) * 0.2, // Slight random rotation
        bouncePhase: Math.random() * Math.PI * 2 // Random bounce phase
    });
}

// Update score popups
function updateScorePopups() {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const popup = scorePopups[i];
        
        // Move popup upward with a slight bounce effect
        popup.y -= SCORE_POPUP_SPEED;
        
        // Update lifetime
        popup.lifetime--;
        
        // Scale up quickly at start for pop-in effect
        if (popup.lifetime > SCORE_POPUP_LIFETIME - 10) {
            popup.scale = 1 + (SCORE_POPUP_LIFETIME - popup.lifetime) * 0.05;
        } else {
            // Add a subtle bounce effect
            popup.scale = 1 + Math.sin(popup.bouncePhase + (SCORE_POPUP_LIFETIME - popup.lifetime) * 0.2) * SCORE_POPUP_BOUNCE_AMPLITUDE;
        }
        
        // Start fading out
        if (popup.lifetime < SCORE_POPUP_FADE_START) {
            popup.opacity = popup.lifetime / SCORE_POPUP_FADE_START;
        }
        
        // Remove dead popups
        if (popup.lifetime <= 0) {
            scorePopups.splice(i, 1);
        }
    }
}

// Draw score popups
function drawScorePopups() {
    ctx.textAlign = 'center';
    
    scorePopups.forEach(popup => {
        ctx.save();
        
        // Set up text style
        ctx.font = '18px "Press Start 2P"';
        
        // Determine color based on score value
        let color1, color2;
        if (popup.points >= 1000) {
            // Alien kills - Gold/Yellow
            color1 = '#FFD700';
            color2 = '#FFA500';
        } else if (popup.points >= 300) {
            // Small asteroid - Purple/Pink
            color1 = '#FF69B4';
            color2 = '#9370DB';
        } else if (popup.points >= 200) {
            // Medium asteroid - Blue/Cyan
            color1 = '#00BFFF';
            color2 = '#4169E1';
        } else {
            // Large asteroid - Green/Teal
            color1 = '#98FB98';
            color2 = '#20B2AA';
        }
        
        // Create gradient
        const gradient = ctx.createLinearGradient(
            popup.x,
            popup.y - 10,
            popup.x,
            popup.y + 10
        );
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        // Apply scale and rotation transform
        ctx.translate(popup.x, popup.y);
        ctx.scale(popup.scale, popup.scale);
        ctx.rotate(popup.rotation);
        
        // Draw score with gradient and glow effect
        ctx.shadowColor = color1;
        ctx.shadowBlur = 15;
        ctx.fillStyle = gradient;
        ctx.globalAlpha = popup.opacity;
        
        // Draw text with + prefix
        ctx.fillText(`+${popup.points}`, 0, 0);
        
        ctx.restore();
    });
}

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
let frameCount = 0;
let titleHoverOffset = 0;
let titleHoverVelocity = 0.5; // Add initial upward velocity
const TITLE_HOVER_SPEED = 0.02;      // Slightly slower for smoother movement
const TITLE_HOVER_RANGE = 40;        // Increased range for more dramatic movement
const TITLE_DAMPING = 0.9995;        // Almost no damping for sustained motion
const TITLE_SPRING = 0.001;          // Very weak spring force for larger oscillations
const TITLE_TRAIL_COUNT = 5;         // Number of trailing shadows

/**
 * Core game state
 * These variables track the essential elements
 * that make up the game's current state
 */
let ship = null;
let asteroids = [];
let bullets = [];
let aliens = [];           // Array to hold alien ships
let alienBullets = [];     // Array to hold alien bullets
let alienSpawnTimer = 0;   // Timer for alien spawning
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
const SHIP_SIZE = 30;                    // Increased from 20 to 30 for a bigger ship
const SHIP_THRUST = 0.1;                 // Reduced from 0.5 to 0.3 for more controlled movement
const SHIP_MAX_THRUST = 0.3;             // Reduced from 0.5 to match new thrust value
const SHIP_ROTATION_SPEED = 0.1;         // Rotation rate unchanged
const FRICTION = 0.99;                   // Friction coefficient unchanged
const INVULNERABILITY_TIME = 180;        // Invulnerability duration unchanged

// Visual Enhancement 1 - Thrust Effects
const THRUST_FLAME_BASE = 0.6;           // Reduced from 0.8 for smaller flame
const THRUST_FLAME_VARIANCE = 0.2;       // Reduced from 0.3 for more subtle variance
const THRUST_SHAKE_AMOUNT = 0.15;        // Reduced from 0.2 for less shake
const THRUST_PARTICLE_COUNT = 12;        // Reduced from 15 for fewer particles
const THRUST_PARTICLE_LIFETIME = 15;     // Reduced from 20 for shorter trails
const THRUST_PARTICLE_SPEED = 1.2;       // Reduced from 1.5 for slower particles
const THRUST_PARTICLE_SPREAD = 0.25;     // Reduced from 0.3 for tighter spread
const THRUST_PARTICLE_SPIN = 0.15;       // Reduced from 0.2 for less spin
const THRUST_PARTICLE_SIZE = 1.5;        // Reduced from 2 for smaller particles
const THRUST_PARTICLE_PULSE_SPEED = 0.25; // Reduced from 0.3 for slower pulsing

// Asteroid constants
const BASE_ASTEROID_SPEED = 1;           // Base speed for asteroids
const ASTEROID_SPEED_SCALING = 0.2;      // Speed increase per level
const MAX_ASTEROID_SPEED = 3;            // Maximum asteroid speed
const ASTEROID_COUNT = 3;                // Starting number of asteroids
const ASTEROID_JAG = 0.3;                // Jaggedness of asteroid shapes
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
const ALIEN_SPAWN_DELAY = 20000;         // Base delay between aliens (20 seconds)
const ALIEN_SPAWN_RANDOM = 10000;        // Additional random delay (up to 10 seconds)

// Add alien spawn and invulnerability constants
const ALIEN_INVULNERABILITY_TIME = 180; // 3 seconds at 60fps
const ALIEN_SPAWN_EFFECT_DURATION = 60; // 1 second spawn animation
const ALIEN_SPAWN_PARTICLES = 20;

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

// Near the top of the file, add a variable to store the high score
// ... existing code ...
let pendingHighScore = 0; // Add this variable to store the score for high score submission

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
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize cursor as visible (for menu)
    canvas.style.cursor = 'default';
    
    // Set up game controls
    document.addEventListener('keydown', function(event) {
        switch(event.key) {
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
                if (gameStarted) {
                    keys.space = true;
                }
                break;
            case 'Enter':
                if (!gameStarted) {
                    initGame();
                }
                break;
            case 'p':
            case 'P':
                if (gameStarted) {
                    gamePaused = !gamePaused;
                    updateCursorVisibility();
                }
                break;
            case 'Escape':
                if (gameStarted) {
                    gameStarted = false;
                    updateCursorVisibility();
                }
                break;
            case 'n':
            case 'N':
                showingReleaseNotes = !showingReleaseNotes;
                updateCursorVisibility();
                break;
            case 'l':
            case 'L':
                showLog = !showLog;
                break;
        }
    });
    
    document.addEventListener('keyup', function(event) {
        switch(event.key) {
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
    });
    
    // Load game sounds
    loadSounds();
    
    // Initialize welcome screen
    generateStars();
    initWelcomeAsteroids();
    
    // Start game loop
    gameLoop();
    
    // Fetch high scores
    fetchHighScores();
}

/**
 * High score fetching
 * Retrieves scores from server with fallback to local scores
 * to ensure the game remains playable even if server is unavailable
 */
function fetchHighScores() {
    fetch('/api/highscores')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            highScores = Array.isArray(data) ? data : [];
            highScoresFetched = true;
            addLogMessage('High scores loaded from server');
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScores = [];
            highScoresFetched = true;
            addLogMessage('Failed to load high scores');
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
    // Increment frame counter for animations
    frameCount++;
    
    // Update high score submission cooldown
    if (highScoreSubmitCooldown > 0) {
        highScoreSubmitCooldown--;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update cursor visibility based on game state
    updateCursorVisibility();
    
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
            updateScorePopups();
            updateAlienDebris();
            updateLevelAnnouncement();
        } else {
            drawPauseScreen();
        }
        
        // Always draw game elements for visual continuity
        drawGame();
        drawAlienDebris();
        drawAliens();
        drawAlienBullets();
        drawLevelAnnouncement();
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
    ctx.font = '14px "Press Start 2P"';
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
    
    // Draw the enhanced title
    drawWelcomeTitle();
    
    // Information displays
    drawWelcomeInstructions();
    drawAsteroidScoreInfo();
    drawHighScores();
}

// Draw the welcome screen title with enhanced styling and trail effect
function drawWelcomeTitle() {
    const baseY = canvas.height * 0.25;
    
    // Add small random impulse occasionally to maintain motion
    if (Math.random() < 0.03) { // 3% chance each frame
        titleHoverVelocity += (Math.random() - 0.5) * 0.2;
    }
    
    // Update title physics for smooth floating motion
    const targetOffset = 0; // Center position
    const springForce = (targetOffset - titleHoverOffset) * 0.001; // Spring constant
    titleHoverVelocity += springForce;
    titleHoverVelocity *= 0.9995; // Damping
    titleHoverOffset += titleHoverVelocity;
    
    // Clamp the range of movement
    if (Math.abs(titleHoverOffset) > 40) { // Max range
        titleHoverOffset = Math.sign(titleHoverOffset) * 40;
        titleHoverVelocity *= -0.8; // Bounce
    }
    
    ctx.save();
    ctx.textAlign = 'center';
    
    // Draw trailing shadows
    for (let i = 5; i > 0; i--) {
        const trailOffset = titleHoverOffset * (i / 5);
        const scale = 1 - (i * 0.03); // Each trail slightly smaller
        const alpha = 0.15 - (i * 0.02); // Each trail more transparent
        
        ctx.save();
        ctx.translate(canvas.width / 2, baseY + trailOffset);
        ctx.scale(scale, scale);
        
        // Draw shadow with gradient
        ctx.font = '48px "Press Start 2P"';
        ctx.fillStyle = `rgba(100, 149, 237, ${alpha})`; // Cornflower blue with fade
        ctx.fillText('SMASHTEROIDS', 0, 0);
        ctx.restore();
    }
    
    // Main title with glow
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 20;
    ctx.font = '48px "Press Start 2P"';
    
    // Draw outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText('SMASHTEROIDS', canvas.width / 2, baseY + titleHoverOffset);
    
    // Draw filled text
    ctx.fillStyle = 'white';
    ctx.fillText('SMASHTEROIDS', canvas.width / 2, baseY + titleHoverOffset);
    
    ctx.restore();
    
    // Press enter to start (flashing)
    ctx.textAlign = 'center';
    ctx.font = '20px "Press Start 2P"';
    const startY = canvas.height * 0.35;
    if (Math.floor(frameCount / 30) % 2 === 0) {
        ctx.fillText('PRESS ENTER TO START', canvas.width / 2, startY);
    }
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
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    const centerX = canvas.width * 0.35;
    let startY = canvas.height * 0.45;
    const lineHeight = 40; // Increased to make room for animations
    
    ctx.fillText('CONTROLS:', centerX, startY);
    startY += lineHeight;
    
    // Ship size for illustrations
    const shipRadius = 12;
    const illustrationX = centerX - 120; // Position for illustrations
    
    ctx.font = '12px "Press Start 2P"';
    
    // ROTATE control with animation
    const rotateY = startY;
    ctx.fillText('ROTATE: LEFT/RIGHT ARROWS', centerX, rotateY);
    
    // Draw rotating ship
    ctx.save();
    ctx.translate(illustrationX, rotateY);
    
    // Animate rotation
    const rotationAngle = Math.sin(frameCount * 0.05) * Math.PI / 4; // Oscillate rotation
    ctx.rotate(rotationAngle);
    
    // Draw ship
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    drawShipShape(0, 0, shipRadius);
    ctx.stroke();
    
    // Draw rotation arrows
    const arrowSize = 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(0, 0, shipRadius + 6, 0, Math.PI * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, shipRadius + 6, Math.PI, Math.PI * 1.8);
    ctx.stroke();
    
    // Draw arrowheads
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(shipRadius + 10, -4);
    ctx.lineTo(shipRadius + 6, 0);
    ctx.lineTo(shipRadius + 10, 4);
    ctx.fill();
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(-shipRadius - 10, -4);
    ctx.lineTo(-shipRadius - 6, 0);
    ctx.lineTo(-shipRadius - 10, 4);
    ctx.fill();
    
    ctx.restore();
    startY += lineHeight;
    
    // THRUST control with animation
    const thrustY = startY;
    ctx.fillText('THRUST: UP ARROW', centerX, thrustY);
    
    // Draw ship with thrust
    ctx.save();
    ctx.translate(illustrationX, thrustY);
    
    // Draw ship
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    drawShipShape(0, 0, shipRadius);
    ctx.stroke();
    
    // Animate thrust flame
    const flameSize = 0.6 + Math.random() * 0.2; // Random flicker
    const rearX = -shipRadius * 0.5;
    const flameTipX = -shipRadius * (1 + flameSize);
    
    // Create gradient for flame
    const gradient = ctx.createLinearGradient(rearX, 0, flameTipX, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');   // White core
    gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.8)');  // Yellow/orange
    gradient.addColorStop(0.4, 'rgba(255, 100, 50, 0.6)');  // Orange/red
    gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');       // Fade to transparent
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(rearX, -shipRadius * 0.3);
    ctx.lineTo(flameTipX, 0);
    ctx.lineTo(rearX, shipRadius * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Draw thrust particles
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
        const particleLife = (frameCount / 3 + i * 5) % 15;
        if (particleLife < 15) {
            const lifeRatio = 1 - (particleLife / 15);
            const particleX = flameTipX - (10 * lifeRatio);
            const particleY = (Math.random() - 0.5) * 6;
            const particleSize = 1.5 * lifeRatio;
            
            ctx.fillStyle = `rgba(255, ${100 + Math.floor(lifeRatio * 155)}, 50, ${lifeRatio})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw up arrow indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -shipRadius - 12);
    ctx.lineTo(5, -shipRadius - 7);
    ctx.lineTo(-5, -shipRadius - 7);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    startY += lineHeight;
    
    // FIRE control with animation
    const fireY = startY;
    ctx.fillText('FIRE: SPACE', centerX, fireY);
    
    // Draw ship with firing bullet
    ctx.save();
    ctx.translate(illustrationX, fireY);
    
    // Draw ship
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    drawShipShape(0, 0, shipRadius);
    ctx.stroke();
    
    // Animate bullet firing
    const bulletCycle = Math.floor(frameCount / 20) % 3; // 0, 1, 2 states
    
    if (bulletCycle === 0) {
        // Ready to fire state
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(shipRadius + 3, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Firing animation
        const bulletDist = (bulletCycle === 1) ? 10 : 20;
        
        // Draw bullet
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(shipRadius + bulletDist, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw bullet trail
        const gradient = ctx.createLinearGradient(shipRadius, 0, shipRadius + bulletDist, 0);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(shipRadius, 0);
        ctx.lineTo(shipRadius + bulletDist, 0);
        ctx.stroke();
    }
    
    // Draw space bar indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-20, shipRadius + 7, 40, 10);
    
    ctx.restore();
    startY += lineHeight;
    
    // Regular text for remaining controls
    ctx.fillText('PAUSE: P', centerX, startY);
    startY += lineHeight;
    ctx.fillText('QUIT: ESC', centerX, startY);
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
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    const centerX = canvas.width * 0.65;
    let startY = canvas.height * 0.45;
    const lineHeight = 30;
    
    ctx.fillText('POINTS:', centerX, startY);
    startY += lineHeight;
    
    // Draw asteroid examples with scores
    const asteroidSizes = [
        { size: 3, score: 100, label: 'LARGE' },
        { size: 2, score: 200, label: 'MEDIUM' },
        { size: 1, score: 300, label: 'SMALL' }
    ];
    
    ctx.font = '12px "Press Start 2P"';
    
    // Use frameCount for rotation animation
    const rotationSpeed = 0.01;
    
    asteroidSizes.forEach((asteroid, index) => {
        const y = startY + index * lineHeight;
        
        // Draw asteroid example with more realistic shape
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        
        // Save context for rotation
        ctx.save();
        ctx.translate(centerX - 50, y);
        
        // Apply continuous rotation based on frameCount
        const rotation = frameCount * rotationSpeed * (index % 2 === 0 ? 1 : -1); // Alternate rotation direction
        ctx.rotate(rotation);
        
        // Draw more realistic asteroid shape with more vertices
        const radius = asteroid.size * 8;
        const vertices = 10 + asteroid.size; // More vertices for larger asteroids
        
        ctx.beginPath();
        for (let i = 0; i < vertices; i++) {
            const angle = i * Math.PI * 2 / vertices;
            // Create more varied jagged edges for realism
            const jag = 0.7 + Math.sin(i * 3.7) * 0.3 + Math.cos(i * 2.3) * 0.2;
            const x = radius * jag * Math.cos(angle);
            const y2 = radius * jag * Math.sin(angle);
            
            if (i === 0) ctx.moveTo(x, y2);
            else ctx.lineTo(x, y2);
        }
        ctx.closePath();
        
        // Add texture with a subtle fill
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.fill();
        ctx.stroke();
        
        // Restore context after rotation
        ctx.restore();
        
        // Draw score text
        ctx.textAlign = 'left';
        ctx.fillStyle = 'white';
        ctx.fillText(`${asteroid.label}: ${asteroid.score}`, centerX - 20, y + 5);
        ctx.textAlign = 'center';
    });
    
    // Draw alien ship with score
    const alienY = startY + asteroidSizes.length * lineHeight;
    
    // Draw alien ship icon
    ctx.save();
    ctx.translate(centerX - 50, alienY);
    
    // Draw saucer shape
    ctx.beginPath();
    const alienSize = 12;
    ctx.moveTo(-alienSize, 0);
    ctx.lineTo(-alienSize/2, -alienSize/2);
    ctx.lineTo(alienSize/2, -alienSize/2);
    ctx.lineTo(alienSize, 0);
    ctx.lineTo(alienSize/2, alienSize/2);
    ctx.lineTo(-alienSize/2, alienSize/2);
    ctx.closePath();
    ctx.stroke();
    
    // Draw cockpit
    ctx.beginPath();
    ctx.arc(0, 0, alienSize/4, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
    
    // Draw alien score text
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.fillText(`ALIEN: 1000`, centerX - 20, alienY + 5);
    ctx.textAlign = 'center';
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
    ctx.textAlign = 'center';
    
    // Draw high scores header
    ctx.font = '24px "Press Start 2P"';
    ctx.fillText('HIGH SCORES', canvas.width * 0.5, canvas.height * 0.75);
    
    // If scores haven't been fetched yet, show loading message
    if (!highScoresFetched) {
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('Loading...', canvas.width * 0.5, canvas.height * 0.8);
        
        // Add copyright message
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('© James Puddicombe 2025', canvas.width * 0.5, canvas.height * 0.95);
        return;
    }
    
    // If no scores available, show message
    if (!highScores || highScores.length === 0) {
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('No high scores yet!', canvas.width * 0.5, canvas.height * 0.8);
        
        // Add copyright message
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('© James Puddicombe 2025', canvas.width * 0.5, canvas.height * 0.95);
        return;
    }
    
    // Draw high scores
    ctx.font = '12px "Press Start 2P"';
    const startY = canvas.height * 0.8;
    const lineHeight = 25;
    
    // Display scores in two columns if there are more than 5
    if (highScores.length > 5) {
        for (let i = 0; i < Math.min(5, highScores.length); i++) {
            const score = highScores[i];
            const text = `${score.initials} ${score.score.toString().padStart(6, '0')}`;
            ctx.fillText(text, canvas.width * 0.35, startY + i * lineHeight);
        }
        
        for (let i = 5; i < Math.min(10, highScores.length); i++) {
            const score = highScores[i];
            const text = `${score.initials} ${score.score.toString().padStart(6, '0')}`;
            ctx.fillText(text, canvas.width * 0.65, startY + (i - 5) * lineHeight);
        }
    } else {
        // Single column for 5 or fewer scores
        for (let i = 0; i < Math.min(highScores.length, 10); i++) {
            const score = highScores[i];
            const text = `${score.initials} ${score.score.toString().padStart(6, '0')}`;
            ctx.fillText(text, canvas.width * 0.5, startY + i * lineHeight);
        }
    }
    
    // Add copyright message
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('© James Puddicombe 2025', canvas.width * 0.5, canvas.height * 0.95);
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
    // Darken the background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game over text
    ctx.fillStyle = 'white';
    ctx.font = '28px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '16px "Press Start 2P"';
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
    // Darken the background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pause text
    ctx.fillStyle = 'white';
    ctx.font = '28px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME PAUSED', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText('PRESS P TO RESUME', canvas.width / 2, canvas.height / 3 + 40);
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
    
    if (e.key === 'Enter' && !gameStarted && !enteringInitials) {
        // Don't start game if we're in the post-submission cooldown period
        // or if we're showing the submission confirmation
        if (highScoreSubmitCooldown > 0 || inScoreSubmissionTransition) {
            return;
        }
        
        // Transition to the game state ONLY if not entering initials
        gameStarted = true;
        gamePaused = false; // Ensure game starts unpaused
        initGame();
        addLogMessage('Game started');
    } else if (e.key === 'Escape' && gameStarted) {
        // Exit game and return to welcome screen
        gameStarted = false;
        gamePaused = false; // Reset pause state
        
        // Don't reset score if entering initials (preserve for high score submission)
        if (!enteringInitials) {
            score = 0; // Only reset score if not in high score entry
        }
        
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
        
        // Initialize sound nodes
        soundNodes = {};
        let levelStartNode;
        
        // If context is suspended (browser policy), add a click handler to resume it
        if (audioContext.state === 'suspended') {
            const resumeAudio = function() {
                audioContext.resume().then(() => {
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('keydown', resumeAudio);
                }).catch(err => {
                    console.error('Failed to resume audio context:', err);
                });
            };
            
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
        }
        
        // Load the AudioWorklet module
        const timestamp = new Date().getTime();
        audioContext.audioWorklet.addModule(`audioWorklet.js?v=${timestamp}`)
            .then(() => {
                // Level start sound (triumphant rising tone)
                levelStartNode = new AudioWorkletNode(audioContext, 'sound-generator');
                // ... existing code ...
            })
            .catch(error => {
                // ... existing code ...
            });
    } catch (e) {
        // ... existing code ...
    }
}

// Continuous thrust sound
let thrustNode = null;
let thrustOscillator = null;

// Play or stop the thrust sound
function playThrustSound(play) {
    if (!audioContext) {
        console.error('Audio context not available for thrust sound');
        return;
    }
    
    try {
        if (play) {
            if (thrustNode) {
                return; // Already playing
            }
            
            // Create AudioWorklet node for thrust sound
            thrustNode = new AudioWorkletNode(audioContext, 'sound-generator');
            
            // Configure for thrust sound
            const message = {
                type: 'thrust',
                start: true,
                duration: 60, // Long duration
                amplitude: 0.25 // Reduced amplitude for quieter thrust
            };
            thrustNode.port.postMessage(message);
            
            // Connect to output
            thrustNode.connect(audioContext.destination);
            
            // Store reference
            if (!soundNodes) {
                soundNodes = {};
            }
            soundNodes.thrust = thrustNode;
        } else {
            // Stop thrust sound
            if (thrustNode) {
                thrustNode.port.postMessage({ stop: true });
                thrustNode.disconnect();
                thrustNode = null;
            }
        }
    } catch (e) {
        // ... existing code ...
    }
}

// Play a sound effect
function playSound(soundType) {
    if (!audioContext) {
        console.error('Audio context not available');
        addLogMessage('Audio context not available');
        return;
    }
    
    try {
        // Create a new AudioWorkletNode for each sound
        const soundNode = new AudioWorkletNode(audioContext, 'sound-generator');
        
        // Configure sound based on type
        const message = {
            type: soundType,
            start: true,
            duration: 1.0  // Default duration
        };
        
        // Add custom amplitude for asteroid explosions
        if (soundType === 'bangLarge') {
            message.amplitude = 0.8; // Higher amplitude for large explosions
        } else if (soundType === 'bangMedium') {
            message.amplitude = 0.6; // Medium amplitude for medium explosions
        }
        
        soundNode.port.postMessage(message);
        
        // Connect to output and start
        soundNode.connect(audioContext.destination);
        
        // Store reference to stop later if needed
        if (!soundNodes) {
            soundNodes = {};
        }
        soundNodes[soundType] = soundNode;
        
    } catch (e) {
        console.error('Error playing sound:', e);
        // Fallback to original implementation
        try {
            // ... existing code ...
        } catch (innerError) {
            // ... existing code ...
        }
    }
}

// ... existing code ...

// Initialize game objects - updated to reset score submission time
function initGame() {
    // Reset game state
    score = 0;
    displayScore = 0;
    targetScore = 0;
    
    // Only reset pendingHighScore if not in the process of submitting a score
    if (!enteringInitials && !isSubmittingScore) {
        pendingHighScore = 0; // Reset pending high score
    }
    
    level = 1;
    lives = 3;
    gameStarted = true;
    gamePaused = false;
    aliens = []; // Start with empty aliens array
    alienBullets = [];
    bullets = [];
    asteroids = [];
    logMessages = [];
    shipDebris = [];
    alienDebris = [];
    asteroidDebris = [];
    
    // Reset alien spawn timer
    alienSpawnTimer = 0;
    
    // Hide cursor immediately when game starts
    updateCursorVisibility();
    
    // Create ship first
    respawnShipSafely();
    
    // Then create asteroids (which need ship position)
    createAsteroids();
    
    // Start level announcement
    startLevelAnnouncement();
    
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
        } while (ship && distBetweenPoints(ship.x, ship.y, x, y) < SHIP_SIZE * 4);
        
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
    // Skip updates if ship doesn't exist yet
    if (!ship) return;
    
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
    updateThrustParticles();
    updateBullets();
    updateAsteroids();
    checkCollisions();
    
    // Check for level completion and progression
    if (asteroids.length === 0) {
        level++;
        
        // Announce new level
        startLevelAnnouncement();
        
        // Create asteroids for new level
        createAsteroids();
        
        // Initialize alien spawn timer for level 2 and beyond
        if (level >= 2) {
            // Set the full spawn delay when entering a new level
            // This ensures aliens don't appear immediately
            const spawnInterval = Math.max(
                ALIEN_MIN_SPAWN_INTERVAL,
                ALIEN_BASE_SPAWN_INTERVAL - (level - 2) * ALIEN_SPAWN_INTERVAL_DECREASE
            );
            // Add some extra delay for the first alien of the level
            alienSpawnTimer = spawnInterval * 1.5;
            addLogMessage('Alien spacecraft detected in the vicinity');
        }
    }
}

// Update ship position and rotation using vector-based physics
function updateShip() {
    // Handle spawn animation if active
    if (ship.spawning) {
        // Update spawn timer
        ship.spawnTime--;
        
        // Calculate animation progress (0 to 1)
        const progress = 1 - (ship.spawnTime / 60);
        
        // Update spawn scale with easing
        ship.spawnScale = Math.sin(progress * Math.PI / 2);
        
        // Update spawn rotation
        ship.spawnRotation = progress * Math.PI * 4; // Two full rotations
        
        // Update spawn particles
        ship.spawnParticles.forEach(particle => {
            // Move particles toward ship with easing
            const ease = Math.sin(progress * Math.PI / 2);
            particle.x = particle.targetX + (particle.x - particle.targetX) * (1 - ease);
            particle.y = particle.targetY + (particle.y - particle.targetY) * (1 - ease);
            particle.alpha = 1 - progress;
        });
        
        // End spawn animation
        if (ship.spawnTime <= 0) {
            ship.spawning = false;
            ship.spawnParticles = [];
        }
        
        return; // Skip regular updates during spawn
    }
    
    // Handle explosion state if active
    if (ship.exploding) {
        ship.explodeTime--;
        if (ship.explodeTime === 0) {
            respawnShipSafely();
        }
        return;
    }
    
    // Update invulnerability timer
    if (ship.invulnerable) {
        ship.invulnerableTime--;
        if (ship.invulnerableTime <= 0) {
            ship.invulnerable = false;
        }
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
        invulnerableTime: INVULNERABILITY_TIME,
        // Add spawn animation properties
        spawning: true,
        spawnTime: 60, // 1 second at 60fps
        spawnParticles: [],
        spawnScale: 0,
        spawnRotation: 0
    };

    // Create spawn particles
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        ship.spawnParticles.push({
            x: newX + Math.cos(angle) * SHIP_SIZE * 2,
            y: newY + Math.sin(angle) * SHIP_SIZE * 2,
            targetX: newX,
            targetY: newY,
            alpha: 1,
            size: Math.random() * 2 + 1
        });
    }
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
        
        // Update bullet position
        bullet.x += bullet.xv;
        bullet.y += bullet.yv;
        
        // Wrap bullets around screen edges
        if (bullet.x < 0) bullet.x = canvas.width;
        if (bullet.x > canvas.width) bullet.x = 0;
        if (bullet.y < 0) bullet.y = canvas.height;
        if (bullet.y > canvas.height) bullet.y = 0;
        
        // Check for bullet lifetime
        bullet.lifetime--;
        if (bullet.lifetime <= 0) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check collision with alien
        if (aliens.length > 0) {
            const alien = aliens[0];
            if (alien.active && !alien.invulnerable) {
                const dx = bullet.x - alien.x;
                const dy = bullet.y - alien.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ALIEN_SIZE) {
                    // Remove bullet
                    bullets.splice(i, 1);
                    
                    // Calculate hit angle for directional explosion
                    const hitAngle = Math.atan2(dy, dx);
                    
                    // Destroy alien with bullet hit effect
                    destroyAlien(alien, true, hitAngle);
                    continue;
                }
            }
        }
        
        // Check collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullet.x, bullet.y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius) {
                bullets.splice(i, 1);
                destroyAsteroid(j);
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
    // Check ship collisions with asteroids (if ship is vulnerable)
    if (ship && !ship.exploding && !ship.invulnerable) {
        for (let i = 0; i < asteroids.length; i++) {
            if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.radius + asteroids[i].radius) {
                destroyShip();
                break;
            }
        }
    }
    
    // Check ship collisions with aliens
    if (ship && !ship.exploding && !ship.invulnerable) {
        for (let i = aliens.length - 1; i >= 0; i--) {
            const alien = aliens[i];
            if (!alien.invulnerable && distBetweenPoints(ship.x, ship.y, alien.x, alien.y) < ship.radius + ALIEN_SIZE) {
                // Destroy both ship and alien
                destroyShip();
                destroyAlien(alien, false); // false indicates collision rather than shot
                break;
            }
        }
    }
    
    // Check alien collisions with asteroids
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        if (!alien.invulnerable) { // Only check collisions if not invulnerable
            for (let j = asteroids.length - 1; j >= 0; j--) {
                const asteroid = asteroids[j];
                const dx = alien.x - asteroid.x;
                const dy = alien.y - asteroid.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ALIEN_SIZE + asteroid.radius) {
                    // Calculate collision angle for debris direction
                    const collisionAngle = Math.atan2(dy, dx);
                    
                    // Destroy both alien and asteroid
                    destroyAlien(alien, false, collisionAngle);
                    destroyAsteroid(j, collisionAngle);
                    
                    // Add dramatic collision effect
                    createCollisionEffect(
                        (alien.x + asteroid.x) / 2,
                        (alien.y + asteroid.y) / 2,
                        collisionAngle
                    );
                    
                    // Break out of asteroid loop since alien is destroyed
                    break;
                }
            }
        }
    }
}

// Add collision effect function
function createCollisionEffect(x, y, angle) {
    // Create a bright flash
    alienDebris.push({
        x: x,
        y: y,
        radius: 1,
        maxRadius: ALIEN_EXPLOSION_RADIUS * 1.5,
        lifetime: 20,
        type: 'shockwave',
        color: '#FFFFFF' // White flash
    });
    
    // Create intersection debris
    for (let i = 0; i < 8; i++) {
        const debrisAngle = angle + (Math.random() - 0.5) * Math.PI;
        const speed = ALIEN_DEBRIS_SPEED * (0.8 + Math.random() * 0.4);
        
        alienDebris.push({
            x: x,
            y: y,
            vx: Math.cos(debrisAngle) * speed,
            vy: Math.sin(debrisAngle) * speed,
            size: 3 + Math.random() * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.4,
            lifetime: ALIEN_DEBRIS_LIFETIME * 0.7,
            color: '#FFA500', // Orange for collision debris
            type: 'line'
        });
    }
    
    // Play a more intense explosion sound
    playSound('explode');
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
        
        // Save final score for debugging and submission
        window.lastKnownScore = score;
        pendingHighScore = score; // Store the score for high score submission
        console.log('Game over - final score:', score);
        
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
    
    // Calculate ship points based on the dart shape in drawShipShape
    const angle = ship.angle;
    const x = ship.x;
    const y = ship.y;
    const radius = ship.radius;
    
    // Calculate the vertices of the dart ship
    const noseX = x + radius * Math.cos(angle);
    const noseY = y - radius * Math.sin(angle);
    
    const rearLeftX = x - radius * (0.8 * Math.cos(angle) + 0.6 * Math.sin(angle));
    const rearLeftY = y + radius * (0.8 * Math.sin(angle) - 0.6 * Math.cos(angle));
    
    const centerRearX = x - radius * 0.5 * Math.cos(angle);
    const centerRearY = y + radius * 0.5 * Math.sin(angle);
    
    const rearRightX = x - radius * (0.8 * Math.cos(angle) - 0.6 * Math.sin(angle));
    const rearRightY = y + radius * (0.8 * Math.sin(angle) + 0.6 * Math.cos(angle));
    
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
    
    // Line 2: Rear left to center rear
    shipDebris.push({
        x1: rearLeftX,
        y1: rearLeftY,
        x2: centerRearX,
        y2: centerRearY,
        centerX: (rearLeftX + centerRearX) / 2,
        centerY: (rearLeftY + centerRearY) / 2,
        length: Math.sqrt(Math.pow(rearLeftX - centerRearX, 2) + Math.pow(rearLeftY - centerRearY, 2)),
        angle: Math.atan2(centerRearY - rearLeftY, centerRearX - rearLeftX),
        rotationSpeed: (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 2,
        velocity: {
            x: ship.thrust.x + (Math.random() - 0.5) * DEBRIS_SPEED,
            y: ship.thrust.y + (Math.random() - 0.5) * DEBRIS_SPEED
        },
        lifetime: DEBRIS_LIFETIME
    });
    
    // Line 3: Center rear to rear right
    shipDebris.push({
        x1: centerRearX,
        y1: centerRearY,
        x2: rearRightX,
        y2: rearRightY,
        centerX: (centerRearX + rearRightX) / 2,
        centerY: (centerRearY + rearRightY) / 2,
        length: Math.sqrt(Math.pow(centerRearX - rearRightX, 2) + Math.pow(centerRearY - rearRightY, 2)),
        angle: Math.atan2(rearRightY - centerRearY, rearRightX - centerRearX),
        rotationSpeed: (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 2,
        velocity: {
            x: ship.thrust.x + (Math.random() - 0.5) * DEBRIS_SPEED,
            y: ship.thrust.y + (Math.random() - 0.5) * DEBRIS_SPEED
        },
        lifetime: DEBRIS_LIFETIME
    });
    
    // Line 4: Rear right to nose
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
    const points = (SCORE_MULTIPLIER * (4 - asteroid.size)) + levelBonus;
    score += points;
    
    // Create score popup
    createScorePopup(asteroid.x, asteroid.y, points);
    
    // Play sound based on asteroid size
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
    
    // Draw score popups
    drawScorePopups();
    
    // Draw game info (score, lives, level)
    drawGameInfo();
}

// Initialize particle system
let thrustParticles = [];

// Draw the player's ship
function drawShip() {
    if (ship.spawning) {
        // Draw spawn particles
        ctx.strokeStyle = 'white';
        ship.spawnParticles.forEach(particle => {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw materializing ship
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.spawnRotation);
        ctx.scale(ship.spawnScale, ship.spawnScale);
        
        // Draw ship with special effects
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Create energy field effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ship.radius * 2);
        gradient.addColorStop(0, 'rgba(100, 200, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, ship.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw ship outline with glow
        ctx.shadowColor = '#4169E1';
        ctx.shadowBlur = 10;
        drawShipShape(0, 0, ship.radius);
        
        ctx.restore();
        return;
    }

    // Apply thrust shake if thrusting
    let drawX = ship.x;
    let drawY = ship.y;
    if (ship.thrusting) {
        drawX += (Math.random() - 0.5) * THRUST_SHAKE_AMOUNT;
        drawY += (Math.random() - 0.5) * THRUST_SHAKE_AMOUNT;
    }

    // Draw ship
    ctx.strokeStyle = 'white';
    
    // Flash the ship during invulnerability period
    if (ship.invulnerable && Math.floor(frameCount / 5) % 2 === 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent
    }
    
    ctx.lineWidth = 2;
    
    // Draw the dart-shaped ship
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(-ship.angle); // Negative angle to fix the rotation direction
    drawShipShape(0, 0, ship.radius);
    ctx.stroke();
    ctx.restore();
    
    // Draw enhanced thruster with gradient
    if (ship.thrusting) {
        // Create gradient for flame
        const rearX = drawX - ship.radius * 1.2 * Math.cos(ship.angle);
        const rearY = drawY + ship.radius * 1.2 * Math.sin(ship.angle);
        const flameSize = THRUST_FLAME_BASE + Math.random() * THRUST_FLAME_VARIANCE;
        const flameTipX = drawX - ship.radius * (1.2 + flameSize) * Math.cos(ship.angle);
        const flameTipY = drawY + ship.radius * (1.2 + flameSize) * Math.sin(ship.angle);
        
        const gradient = ctx.createLinearGradient(rearX, rearY, flameTipX, flameTipY);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');   // White core
        gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.8)');  // Yellow/orange
        gradient.addColorStop(0.4, 'rgba(255, 100, 50, 0.6)');  // Orange/red
        gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');       // Fade to transparent
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // Adjust thruster position to match the dart shape's rear
        const thrustLeftX = drawX - ship.radius * (0.8 * Math.cos(ship.angle) + 0.6 * Math.sin(ship.angle));
        const thrustLeftY = drawY + ship.radius * (0.8 * Math.sin(ship.angle) - 0.6 * Math.cos(ship.angle));
        const thrustRightX = drawX - ship.radius * (0.8 * Math.cos(ship.angle) - 0.6 * Math.sin(ship.angle));
        const thrustRightY = drawY + ship.radius * (0.8 * Math.sin(ship.angle) + 0.6 * Math.cos(ship.angle));
        
        ctx.moveTo(thrustLeftX, thrustLeftY);
        ctx.lineTo(flameTipX, flameTipY);
        ctx.lineTo(thrustRightX, thrustRightY);
        ctx.closePath();
        ctx.fill();
        
        // Add new particles with enhanced properties
        if (thrustParticles.length < THRUST_PARTICLE_COUNT) {
            const angle = ship.angle + Math.PI + (Math.random() - 0.5) * THRUST_PARTICLE_SPREAD;
            addThrustParticle(rearX, rearY, angle, THRUST_PARTICLE_SPEED, ship.thrust.x, ship.thrust.y);
        }
    }
    
    // Draw thrust particles with enhanced rotation and pulsing
    ctx.lineWidth = 1;
    for (let i = thrustParticles.length - 1; i >= 0; i--) {
        const particle = thrustParticles[i];
        const lifeRatio = particle.life / THRUST_PARTICLE_LIFETIME;
        const pulseSize = particle.baseSize * (0.8 + 0.4 * Math.sin(frameCount * 0.2 + particle.pulseOffset));
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Create particle gradient with more vibrant colors
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize * 2);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${lifeRatio})`);
        gradient.addColorStop(0.4, `rgba(255, 200, 50, ${lifeRatio * 0.8})`);
        gradient.addColorStop(0.7, `rgba(255, 100, 50, ${lifeRatio * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // Draw more dynamic particle shape
        const innerSize = pulseSize * 0.5;
        ctx.moveTo(0, -pulseSize);
        ctx.lineTo(innerSize, -innerSize);
        ctx.lineTo(pulseSize, 0);
        ctx.lineTo(innerSize, innerSize);
        ctx.lineTo(0, pulseSize);
        ctx.lineTo(-innerSize, innerSize);
        ctx.lineTo(-pulseSize, 0);
        ctx.lineTo(-innerSize, -innerSize);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // Draw enhanced invulnerability shield
    if (ship.invulnerable) {
        const warningPhase = ship.invulnerableTime < 60; // Last second warning
        const pulseSpeed = warningPhase ? 0.4 : 0.1; // Faster pulse during warning
        const baseOpacity = warningPhase ? 0.5 : 0.3;
        const pulseOpacity = Math.sin(frameCount * pulseSpeed) * 0.2 + baseOpacity;
        
        // Warning flicker effect
        if (!warningPhase || Math.floor(frameCount / 3) % 2 === 0) {
            // Inner shield
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 200, 255, ${pulseOpacity})`;
            ctx.lineWidth = 2;
            ctx.arc(drawX, drawY, ship.radius * 1.5, 0, Math.PI * 2, false);
            ctx.stroke();
            
            // Outer glow
            ctx.beginPath();
            const gradient = ctx.createRadialGradient(
                drawX, drawY, ship.radius * 1.3,
                drawX, drawY, ship.radius * 2
            );
            gradient.addColorStop(0, `rgba(100, 200, 255, ${pulseOpacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.arc(drawX, drawY, ship.radius * 2, 0, Math.PI * 2, false);
            ctx.fill();
            
            // Energy particles
            const particleCount = warningPhase ? 3 : 6;
            for (let i = 0; i < particleCount; i++) {
                const angle = (frameCount * 0.05) + (i * Math.PI * 2 / particleCount);
                const orbitRadius = ship.radius * 1.5;
                const particleX = drawX + Math.cos(angle) * orbitRadius;
                const particleY = drawY + Math.sin(angle) * orbitRadius;
                
                ctx.beginPath();
                ctx.fillStyle = `rgba(150, 220, 255, ${pulseOpacity})`;
                ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

// Update thrust particles with enhanced animation
function updateThrustParticles() {
    for (let i = thrustParticles.length - 1; i >= 0; i--) {
        const particle = thrustParticles[i];
        
        // Update position with velocity
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply continuous rotation
        particle.rotation += particle.rotationSpeed;
        
        // Handle screen wrapping
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Update lifetime
        particle.life--;
        
        // Remove dead particles
        if (particle.life <= 0) {
            thrustParticles.splice(i, 1);
        }
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
    // Update animated score
    if (targetScore !== score) {
        targetScore = score;
    }
    
    if (displayScore < targetScore) {
        // Animate score going up
        displayScore += Math.max(1, Math.ceil((targetScore - displayScore) / scoreAnimationSpeed));
        if (displayScore > targetScore) displayScore = targetScore;
    } else if (displayScore > targetScore) {
        // Handle score going down (rare case)
        displayScore = targetScore;
    }
    
    // Draw score with retro effect
    ctx.fillStyle = 'white';
    ctx.font = '18px "Press Start 2P"';
    ctx.textAlign = 'left';
    
    // Add glow effect to score
    ctx.shadowColor = '#4169E1';
    ctx.shadowBlur = displayScore !== targetScore ? 15 : 5;
    
    // Scale effect when score is changing
    if (displayScore !== targetScore) {
        ctx.save();
        const scaleAmount = 1 + Math.sin(frameCount * 0.2) * 0.05;
        ctx.translate(20, 25);
        ctx.scale(scaleAmount, scaleAmount);
        ctx.fillText(`Score: ${displayScore}`, 0, 0);
        ctx.restore();
    } else {
        ctx.fillText(`Score: ${displayScore}`, 20, 25);
    }
    
    // Reset shadow for other elements
    ctx.shadowBlur = 0;
    
    // Draw level
    ctx.textAlign = 'center';
    ctx.fillText(`Level: ${level}`, canvas.width / 2, 25);
    
    // Draw lives as ship icons
    ctx.textAlign = 'right';
    ctx.fillText('Lives:', canvas.width - 20 - (lives * 30), 25);
    
    // Draw ship icons for lives
    for (let i = 0; i < lives; i++) {
        ctx.save();
        
        const iconX = canvas.width - 15 - (i * 25);
        const iconY = 20;
        const iconSize = 8;
        
        // Animate the ships with a subtle hover effect
        const hoverOffset = Math.sin((frameCount + i * 10) * 0.1) * 2;
        
        ctx.translate(iconX, iconY + hoverOffset);
        ctx.rotate(-Math.PI / 2); // Rotate to point upward
        
        // Draw ship icon
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        drawShipShape(0, 0, iconSize);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Add level transition message
    if (asteroids.length === 0) {
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${level} COMPLETE!`, canvas.width / 2, canvas.height / 2);
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('Get Ready for Next Level...', canvas.width / 2, canvas.height / 2 + 30);
        
        // Show level stats
        ctx.font = '10px "Press Start 2P"';
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
    console.log('Checking if score is high score:', score, 'pendingHighScore:', pendingHighScore);
    
    // Use the higher of current score or pendingHighScore
    const actualScore = Math.max(score, pendingHighScore);
    
    // If we haven't fetched scores yet, be conservative and assume it's a high score
    if (!highScoresFetched) return true;
    
    // If there are fewer than HIGH_SCORE_COUNT scores, it's definitely a high score
    if (highScores.length < HIGH_SCORE_COUNT) return actualScore > 0;
    
    // Otherwise, check if it's higher than the lowest score
    return actualScore > 0 && actualScore > highScores[highScores.length - 1].score;
}

// New function to submit high score to server
function submitHighScore(initials, score) {
    isSubmittingScore = true;
    scoreSubmitError = null;
    
    // Capture score values before they can be reset by other operations
    // Store locally within this function closure to protect from external changes
    const finalPendingScore = pendingHighScore;
    const finalWindowScore = window.lastKnownScore;
    const finalCurrentScore = score;
    
    // Use pendingHighScore instead of current score value which may have been reset
    // Create a prioritized selection logic to use the highest available score
    let scoreToSubmit = 0;
    if (finalPendingScore > 0) {
        scoreToSubmit = finalPendingScore;
    } else if (finalCurrentScore > 0) {
        scoreToSubmit = finalCurrentScore;
    } else if (finalWindowScore > 0) {
        scoreToSubmit = finalWindowScore;
    }
    
    // Add debug logging for score value
    console.log('Submitting highscore - diagnostic information:');
    console.log('- Current score value:', finalCurrentScore);
    console.log('- Pending high score value:', finalPendingScore);
    console.log('- Window last known score:', finalWindowScore);
    console.log('- Final score to submit:', scoreToSubmit);
    
    // Debug: Check if score is being passed correctly
    if (scoreToSubmit === 0) {
        console.warn('WARNING: Attempting to submit a zero score despite fallback mechanisms');
        return; // Prevent submission of zero scores
    }
    
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
            score: scoreToSubmit, // Use the stored score value
            gameData
        }),
    })
    .then(response => {
        if (!response.ok) {
            // Get more detailed error info
            return response.text().then(text => {
                console.error('Error response body:', text);
                throw new Error('Server returned error: ' + response.status + ' - ' + text);
            });
        }
        return response.json();
    })
    .then(data => {
        // Update high scores with the latest from server
        highScores = data.highScores;
        
        // Reset game state immediately
        isSubmittingScore = false;
        enteringInitials = false;
        pendingHighScore = 0;
        gameStarted = false;
        gamePaused = false;
        
        // Display a simple confirmation toast
        addLogMessage(`High score added: ${initials} - ${scoreToSubmit}`);
        
        // Play a sound for feedback
        playSound('bangLarge');
        
        // Set cooldown to prevent immediate restart
        highScoreSubmitCooldown = 90;
    })
    .catch(error => {
        isSubmittingScore = false;
        scoreSubmitError = error.message;
        addLogMessage(`Error submitting high score: ${error.message}`);
        // Still play a sound for feedback
        playSound('bangSmall');
        
        // Handle error case and prevent game restart
        setTimeout(() => {
            enteringInitials = false;
            gameStarted = false;
        }, 3000);
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
    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('RELEASE NOTES', canvas.width / 2, 80);

    // Draw close instruction
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText('PRESS N TO CLOSE', canvas.width / 2, 110);

    // Calculate visible area
    const startY = 150 - releaseNotesScroll;
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
            ctx.font = '16px "Press Start 2P"';
            ctx.fillStyle = '#FFD700'; // Gold color for version
            ctx.fillText(`v${release.version} (${release.date})`, canvas.width / 2, currentY);

            // Draw changes
            ctx.font = '12px "Press Start 2P"';
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
    // Only spawn aliens if we're past level 1
    if (level <= 1) {
        return; // Skip alien updates entirely in level 1
    }
    
    // Timer-based spawn system scales with game progression
    if (alienSpawnTimer > 0) {
        alienSpawnTimer--;
        if (alienSpawnTimer === 0 && aliens.length < ALIEN_MAX_COUNT) {
            createAlien();
            
            // Calculate spawn interval for next alien
            const spawnInterval = Math.max(
                ALIEN_MIN_SPAWN_INTERVAL,
                ALIEN_BASE_SPAWN_INTERVAL - (level - 2) * ALIEN_SPAWN_INTERVAL_DECREASE
            );
            alienSpawnTimer = spawnInterval;
        }
    }
    
    // Update each alien's behavior and state
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        
        // Update spawn animation
        if (alien.spawnTime > 0) {
            alien.spawnTime--;
            alien.scale = 1 - (alien.spawnTime / ALIEN_SPAWN_EFFECT_DURATION);
        }
        
        // Update invulnerability
        if (alien.invulnerable) {
            alien.invulnerableTime--;
            if (alien.invulnerableTime <= 0) {
                alien.invulnerable = false;
                // Add a flash effect when invulnerability ends
                alienDebris.push({
                    x: alien.x,
                    y: alien.y,
                    radius: 1,
                    maxRadius: ALIEN_SIZE * 2,
                    lifetime: 20,
                    type: 'shockwave',
                    color: '#00FFFF'
                });
            }
        }
        
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
        if (!alien.invulnerable && alien.active && ship && !ship.exploding && alienBullets.length < ALIEN_MAX_BULLETS) {
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
    
    // Create spawn particles in a circle around spawn point
    for (let i = 0; i < ALIEN_SPAWN_PARTICLES; i++) {
        const angle = (i / ALIEN_SPAWN_PARTICLES) * Math.PI * 2;
        const distance = ALIEN_SIZE * 3;
        alienDebris.push({
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            vx: Math.cos(angle) * -2,
            vy: Math.sin(angle) * -2,
            size: 2 + Math.random() * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            lifetime: ALIEN_SPAWN_EFFECT_DURATION,
            color: '#00FFFF',
            type: 'circle',
            isSpawnEffect: true
        });
    }

    // Create the shockwave effect
    alienDebris.push({
        x: x,
        y: y,
        radius: 1,
        maxRadius: ALIEN_SIZE * 4,
        lifetime: ALIEN_SPAWN_EFFECT_DURATION,
        type: 'shockwave',
        color: '#00FFFF',
        isSpawnEffect: true
    });
    
    aliens.push({
        x: x,
        y: y,
        dx: dx,
        dy: dy,
        radius: ALIEN_SIZE,
        angle: 0,
        rotation: 0,
        targetAngle: 0,
        fireTimer: 0,
        directionTimer: 0,
        active: true,
        thrusting: false,
        invulnerable: true,
        invulnerableTime: ALIEN_INVULNERABILITY_TIME,
        spawnTime: ALIEN_SPAWN_EFFECT_DURATION,
        scale: 0 // Start small and grow
    });
    
    playSound('spawn'); // Add a spawn sound effect
    addLogMessage('New alien spacecraft warped in!');
}

// Draw aliens
function drawAliens() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < aliens.length; i++) {
        const alien = aliens[i];
        
        ctx.save();
        
        // Apply spawn scaling effect
        if (alien.spawnTime > 0) {
            ctx.translate(alien.x, alien.y);
            ctx.scale(alien.scale, alien.scale);
            ctx.translate(-alien.x, -alien.y);
        }
        
        // Translate to alien's position and rotate
        ctx.translate(alien.x, alien.y);
        ctx.rotate(alien.angle);

        // Flash effect for invulnerability
        if (alien.invulnerable) {
            ctx.strokeStyle = `hsl(${frameCount * 10 % 360}, 100%, 50%)`;
            ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.2) * 0.5;
        }

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

        // Draw invulnerability shield effect
        if (alien.invulnerable) {
            ctx.beginPath();
            ctx.arc(0, 0, ALIEN_SIZE * 1.2, 0, Math.PI * 2);
            ctx.strokeStyle = `hsl(${frameCount * 5 % 360}, 100%, 70%)`;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
        }

        // Draw thrust if active
        if (alien.thrusting) {
            ctx.fillStyle = 'orangered';
            ctx.beginPath();
            const flameSize = 0.8 + 0.4 * Math.random(); // Random flicker effect
            
            // Center the flame at the back of the saucer
            ctx.moveTo(-ALIEN_SIZE, -ALIEN_SIZE/4);
            ctx.lineTo(-ALIEN_SIZE - ALIEN_SIZE * flameSize, 0);
            ctx.lineTo(-ALIEN_SIZE, ALIEN_SIZE/4);
            ctx.closePath();
            ctx.fill();
        }

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

// Add new particles with rotation and pulse properties
function addThrustParticle(x, y, angle, baseSpeed, inheritedVx, inheritedVy) {
    const speed = baseSpeed * (0.5 + Math.random());
    thrustParticles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed + inheritedVx,
        vy: -Math.sin(angle) * speed + inheritedVy,
        life: THRUST_PARTICLE_LIFETIME,
        rotation: Math.random() * Math.PI * 2,        // Random initial rotation
        rotationSpeed: (Math.random() - 0.5) * 0.4,  // Increased rotation speed
        pulseOffset: Math.random() * Math.PI * 2,     // Random pulse phase
        baseSize: THRUST_PARTICLE_SIZE * (0.7 + Math.random() * 0.6)
    });
}

// Helper function to draw ship shape
function drawShipShape(x, y, radius) {
    ctx.beginPath();
    // Slightly adjusted ratios for a sleeker look with the smaller size
    ctx.moveTo( // nose of the ship
        x + radius * Math.cos(0),
        y - radius * Math.sin(0)
    );
    ctx.lineTo( // rear left
        x - radius * (0.8 * Math.cos(0) + 0.6 * Math.sin(0)),
        y + radius * (0.8 * Math.sin(0) - 0.6 * Math.cos(0))
    );
    ctx.lineTo( // rear center
        x - radius * 0.5 * Math.cos(0),
        y + radius * 0.5 * Math.sin(0)
    );
    ctx.lineTo( // rear right
        x - radius * (0.8 * Math.cos(0) - 0.6 * Math.sin(0)),
        y + radius * (0.8 * Math.sin(0) + 0.6 * Math.cos(0))
    );
    ctx.closePath();
}

// Add alien explosion system constants
const ALIEN_DEBRIS_COUNT = 15;
const ALIEN_DEBRIS_SPEED = 3;
const ALIEN_DEBRIS_LIFETIME = 60;
const ALIEN_EXPLOSION_RADIUS = 40;

// Add alien debris array to store explosion particles
let alienDebris = [];

// Update alien explosion function to be more dramatic
function destroyAlien(alien, wasShot = true, collisionAngle = null) {
    const ENHANCED_DEBRIS_COUNT = 25; // More debris
    const ENHANCED_EXPLOSION_RADIUS = 60; // Larger explosion
    const CORE_FLASH_COUNT = 3; // Multiple flash rings
    
    // Create multiple shockwave rings
    for (let i = 0; i < CORE_FLASH_COUNT; i++) {
        const delay = i * 5; // Stagger the rings
        setTimeout(() => {
            alienDebris.push({
                x: alien.x,
                y: alien.y,
                radius: 1,
                maxRadius: ENHANCED_EXPLOSION_RADIUS * (1 - i * 0.2),
                lifetime: 30 - i * 5,
                type: 'shockwave',
                color: i === 0 ? '#FFFFFF' : (wasShot ? '#FF4500' : '#FFA500')
            });
        }, delay);
    }
    
    // Create core explosion particles
    for (let i = 0; i < ENHANCED_DEBRIS_COUNT; i++) {
        let angle;
        if (collisionAngle !== null) {
            // Directional explosion for collisions
            angle = collisionAngle + (Math.random() - 0.5) * Math.PI;
        } else {
            // Circular explosion pattern
            angle = (i / ENHANCED_DEBRIS_COUNT) * Math.PI * 2;
        }
        
        const speed = ALIEN_DEBRIS_SPEED * (0.5 + Math.random());
        const size = 2 + Math.random() * 3;
        
        // Create main debris
        alienDebris.push({
            x: alien.x,
            y: alien.y,
            vx: Math.cos(angle) * speed + (alien.dx || 0) * 0.5,
            vy: Math.sin(angle) * speed + (alien.dy || 0) * 0.5,
            size: size,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.4,
            lifetime: ALIEN_DEBRIS_LIFETIME,
            color: Math.random() < 0.6 ? '#FF4500' : (Math.random() < 0.5 ? '#FFD700' : '#FFFFFF'),
            type: Math.random() < 0.3 ? 'circle' : 'line'
        });
        
        // Add smaller trailing particles
        if (Math.random() < 0.5) {
            alienDebris.push({
                x: alien.x,
                y: alien.y,
                vx: Math.cos(angle) * speed * 0.7,
                vy: Math.sin(angle) * speed * 0.7,
                size: size * 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                lifetime: ALIEN_DEBRIS_LIFETIME * 0.7,
                color: '#FFA500',
                type: 'circle',
                isTrail: true
            });
        }
    }
    
    // Add score only if shot (not from collision)
    if (wasShot) {
        score += ALIEN_POINTS;
        createScorePopup(alien.x, alien.y, ALIEN_POINTS);
    }
    
    // Enhanced explosion sound
    playSound('explode');
    
    // Remove the alien
    aliens = aliens.filter(a => a !== alien);
    addLogMessage('Alien destroyed in spectacular explosion!');
}

// Update alien debris
function updateAlienDebris() {
    for (let i = alienDebris.length - 1; i >= 0; i--) {
        const debris = alienDebris[i];
        
        if (debris.type === 'shockwave') {
            // Update shockwave
            debris.radius += (debris.maxRadius - debris.radius) * 0.2;
            debris.lifetime--;
            
            if (debris.lifetime <= 0) {
                alienDebris.splice(i, 1);
            }
        } else {
            // Update normal debris
            debris.x += debris.vx;
            debris.y += debris.vy;
            debris.rotation += debris.rotationSpeed;
            debris.lifetime--;
            
            // Handle screen wrapping
            handleEdgeOfScreen(debris);
            
            if (debris.lifetime <= 0) {
                alienDebris.splice(i, 1);
            }
        }
    }
}

// Draw alien debris
function drawAlienDebris() {
    for (const debris of alienDebris) {
        if (debris.type === 'shockwave') {
            // Draw shockwave with custom color
            const opacity = debris.lifetime / 30;
            const color = debris.color || '#FF4500';
            ctx.strokeStyle = color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(debris.x, debris.y, debris.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Enhanced inner glow
            const gradient = ctx.createRadialGradient(
                debris.x, debris.y, 0,
                debris.x, debris.y, debris.radius
            );
            const glowColor = color === '#FFFFFF' ? 'rgba(255, 255, 255, ' : 'rgba(255, 200, 0, ';
            gradient.addColorStop(0, glowColor + (opacity * 0.7) + ')');
            gradient.addColorStop(0.6, glowColor + (opacity * 0.3) + ')');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        } else {
            ctx.save();
            ctx.translate(debris.x, debris.y);
            ctx.rotate(debris.rotation);
            
            const opacity = debris.lifetime / ALIEN_DEBRIS_LIFETIME;
            ctx.fillStyle = debris.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            
            // Draw debris with enhanced effects
            if (debris.type === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add glow for non-trail particles
                if (!debris.isTrail) {
                    ctx.shadowColor = debris.color;
                    ctx.shadowBlur = 5;
                    ctx.fill();
                }
            } else {
                // Enhanced line debris
                ctx.shadowColor = debris.color;
                ctx.shadowBlur = 3;
                ctx.fillRect(-debris.size, -1, debris.size * 2, 2);
            }
            
            ctx.restore();
        }
    }
}

// Add asteroid debris system
const ASTEROID_DEBRIS_COUNT = 12;
const ASTEROID_DEBRIS_SPEED = 2;
const ASTEROID_DEBRIS_LIFETIME = 45;
let asteroidDebris = [];

// Enhanced asteroid destruction
function destroyAsteroid(index, collisionAngle = null) {
    const asteroid = asteroids[index];
    const points = Math.ceil(100 * (4 - asteroid.size)); // Points based on size
    
    // Create core explosion effect
    createAsteroidExplosion(asteroid, collisionAngle);
    
    // Split into smaller asteroids if large enough
    if (asteroid.size > 1) {
        // Create 2-3 smaller asteroids
        const numNewAsteroids = Math.random() < 0.5 ? 2 : 3;
        for (let i = 0; i < numNewAsteroids; i++) {
            // Calculate split angle
            const splitAngle = (i / numNewAsteroids) * Math.PI * 2;
            const finalAngle = collisionAngle !== null ? 
                collisionAngle + splitAngle : splitAngle;
            
            // Create new asteroid with inherited velocity
            const speed = BASE_ASTEROID_SPEED * (4 - asteroid.size) * 0.5;
            const newAsteroid = createAsteroid(
                asteroid.x + Math.cos(finalAngle) * asteroid.radius * 0.5,
                asteroid.y + Math.sin(finalAngle) * asteroid.radius * 0.5,
                asteroid.size - 1
            );
            
            // Add split velocity
            newAsteroid.dx += Math.cos(finalAngle) * speed;
            newAsteroid.dy += Math.sin(finalAngle) * speed;
            
            // Add rotation based on split direction
            newAsteroid.rotationSpeed *= (Math.random() < 0.5 ? 1 : -1) * 1.5;
            
            // Create split effect debris
            createSplitDebris(asteroid, finalAngle);
            
            asteroids.push(newAsteroid);
        }
    }
    
    // Remove the original asteroid
    asteroids.splice(index, 1);
    
    // Add score and create score popup
    score += points;
    createScorePopup(asteroid.x, asteroid.y, points);
    
    // Play sound based on asteroid size
    if (asteroid.size === 3) {
        playSound('bangLarge');
    } else if (asteroid.size === 2) {
        playSound('bangMedium');
    } else {
        playSound('bangSmall');
    }
}

// Create asteroid explosion effect
function createAsteroidExplosion(asteroid, collisionAngle = null) {
    const debrisCount = ASTEROID_DEBRIS_COUNT * asteroid.size;
    
    // Create rock fragments
    for (let i = 0; i < debrisCount; i++) {
        let angle;
        if (collisionAngle !== null) {
            // Directional explosion
            angle = collisionAngle + (Math.random() - 0.5) * Math.PI;
        } else {
            // Circular explosion
            angle = (i / debrisCount) * Math.PI * 2;
        }
        
        const speed = ASTEROID_DEBRIS_SPEED * (0.5 + Math.random());
        const size = (asteroid.size * 2) * (0.5 + Math.random() * 0.5);
        
        // Create main debris
        asteroidDebris.push({
            x: asteroid.x,
            y: asteroid.y,
            vx: Math.cos(angle) * speed + asteroid.dx * 0.5,
            vy: Math.sin(angle) * speed + asteroid.dy * 0.5,
            size: size,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            lifetime: ASTEROID_DEBRIS_LIFETIME,
            color: '#A0A0A0',
            vertices: generateDebrisVertices(size),
            alpha: 1
        });
    }
    
    // Create dust cloud effect
    for (let i = 0; i < debrisCount / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = ASTEROID_DEBRIS_SPEED * 0.5 * Math.random();
        asteroidDebris.push({
            x: asteroid.x,
            y: asteroid.y,
            vx: Math.cos(angle) * speed + asteroid.dx * 0.3,
            vy: Math.sin(angle) * speed + asteroid.dy * 0.3,
            size: asteroid.size * 3,
            lifetime: ASTEROID_DEBRIS_LIFETIME * 0.7,
            type: 'dust',
            alpha: 0.3 + Math.random() * 0.2
        });
    }
}

// Create debris for asteroid splits
function createSplitDebris(asteroid, angle) {
    const splitDebrisCount = 6;
    const spreadAngle = Math.PI / 4; // 45-degree spread
    
    for (let i = 0; i < splitDebrisCount; i++) {
        const debrisAngle = angle + (Math.random() - 0.5) * spreadAngle;
        const speed = ASTEROID_DEBRIS_SPEED * (0.3 + Math.random() * 0.7);
        
        asteroidDebris.push({
            x: asteroid.x,
            y: asteroid.y,
            vx: Math.cos(debrisAngle) * speed + asteroid.dx * 0.3,
            vy: Math.sin(debrisAngle) * speed + asteroid.dy * 0.3,
            size: asteroid.size * 1.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            lifetime: ASTEROID_DEBRIS_LIFETIME * 0.6,
            color: '#808080',
            vertices: generateDebrisVertices(asteroid.size * 1.5),
            alpha: 0.7 + Math.random() * 0.3
        });
    }
}

// Generate vertices for debris pieces
function generateDebrisVertices(size) {
    const vertices = [];
    const numVertices = 3 + Math.floor(Math.random() * 3); // 3-5 vertices
    
    for (let i = 0; i < numVertices; i++) {
        const angle = (i / numVertices) * Math.PI * 2;
        const radius = size * (0.7 + Math.random() * 0.3);
        vertices.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    
    return vertices;
}

// Update asteroid debris
function updateAsteroidDebris() {
    for (let i = asteroidDebris.length - 1; i >= 0; i--) {
        const debris = asteroidDebris[i];
        
        // Update position
        debris.x += debris.vx;
        debris.y += debris.vy;
        
        // Update rotation if it's a rock fragment
        if (debris.rotation !== undefined) {
            debris.rotation += debris.rotationSpeed;
        }
        
        // Handle screen wrapping
        handleEdgeOfScreen(debris);
        
        // Update lifetime and alpha
        debris.lifetime--;
        debris.alpha = debris.lifetime / ASTEROID_DEBRIS_LIFETIME;
        
        // Remove dead debris
        if (debris.lifetime <= 0) {
            asteroidDebris.splice(i, 1);
        }
    }
}

// Draw asteroid debris
function drawAsteroidDebris() {
    for (const debris of asteroidDebris) {
        ctx.save();
        ctx.translate(debris.x, debris.y);
        
        if (debris.type === 'dust') {
            // Draw dust particle
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, debris.size);
            gradient.addColorStop(0, `rgba(169, 169, 169, ${debris.alpha})`);
            gradient.addColorStop(1, 'rgba(169, 169, 169, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw rock fragment
            ctx.rotate(debris.rotation);
            ctx.fillStyle = `rgba(128, 128, 128, ${debris.alpha})`;
            ctx.strokeStyle = `rgba(169, 169, 169, ${debris.alpha})`;
            ctx.lineWidth = 1;
            
            // Draw debris shape
            ctx.beginPath();
            ctx.moveTo(debris.vertices[0].x, debris.vertices[0].y);
            for (let i = 1; i < debris.vertices.length; i++) {
                ctx.lineTo(debris.vertices[i].x, debris.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Add cursor state management
function updateCursorVisibility() {
    if (gameStarted && !gamePaused && !enteringInitials && !showingReleaseNotes) {
        canvas.style.cursor = 'none';
    } else {
        canvas.style.cursor = 'default';
    }
}

// Add level announcement constants
const LEVEL_ANNOUNCE_DURATION = 120; // 2 seconds at 60fps
const LEVEL_TEXT_SCALE_TIME = 30; // Time to reach full scale
const LEVEL_PARTICLE_COUNT = 30;

// Add level announcement state
let levelAnnounceTime = 0;
let levelStartParticles = [];

// Function to start level announcement
function startLevelAnnouncement() {
    levelAnnounceTime = LEVEL_ANNOUNCE_DURATION;
    levelStartParticles = [];
    
    // Create particles that fly outward from center
    // Updated y-coordinate to match the new text position
    for (let i = 0; i < LEVEL_PARTICLE_COUNT; i++) {
        const angle = (i / LEVEL_PARTICLE_COUNT) * Math.PI * 2;
        const speed = 3 + Math.random() * 2;
        levelStartParticles.push({
            x: canvas.width / 2,
            y: canvas.height / 3,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            lifetime: LEVEL_ANNOUNCE_DURATION,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        });
    }
    
    // Play level start sound
    playSound('levelStart');
}

// Update level announcement effects
function updateLevelAnnouncement() {
    if (levelAnnounceTime > 0) {
        levelAnnounceTime--;
        
        // Update particles
        for (let particle of levelStartParticles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;
            particle.lifetime--;
        }
        
        // Remove dead particles
        levelStartParticles = levelStartParticles.filter(p => p.lifetime > 0);
    }
}

// Draw level announcement
function drawLevelAnnouncement() {
    if (levelAnnounceTime > 0) {
        ctx.save();
        
        // Calculate scale and opacity based on time
        let scale = 1;
        let opacity = 1;
        
        if (levelAnnounceTime > LEVEL_ANNOUNCE_DURATION - LEVEL_TEXT_SCALE_TIME) {
            // Scale up at start
            const progress = (LEVEL_ANNOUNCE_DURATION - levelAnnounceTime) / LEVEL_TEXT_SCALE_TIME;
            scale = 0.1 + progress * 0.9;
            opacity = progress;
        } else if (levelAnnounceTime < LEVEL_TEXT_SCALE_TIME) {
            // Scale down at end
            const progress = levelAnnounceTime / LEVEL_TEXT_SCALE_TIME;
            scale = 0.1 + progress * 0.9;
            opacity = progress;
        }
        
        // Draw particles
        for (let particle of levelStartParticles) {
            const particleOpacity = (particle.lifetime / LEVEL_ANNOUNCE_DURATION) * opacity;
            ctx.fillStyle = particle.color.replace(')', `, ${particleOpacity})`);
            
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            
            ctx.restore();
        }
        
        // Draw level text - moved up from canvas.height / 2 to canvas.height / 3
        ctx.translate(canvas.width / 2, canvas.height / 3);
        ctx.scale(scale, scale);
        
        // Draw glow effect
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        ctx.font = '72px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect
        for (let i = 0; i < 10; i++) {
            const glowSize = 10 - i;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = glowSize;
            ctx.fillText(`LEVEL ${level}`, 0, 0);
        }
        
        // Main text
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillText(`LEVEL ${level}`, 0, 0);
        
        // Add subtitle for level 1
        if (level === 1) {
            ctx.font = '24px "Press Start 2P"';
            ctx.fillText('CLEAR THE ASTEROIDS!', 0, 50);
        } else if (level === 2) {
            ctx.font = '24px "Press Start 2P"';
            ctx.fillStyle = `rgba(255, 50, 50, ${opacity})`;
            ctx.fillText('ALIEN SHIPS DETECTED!', 0, 50);
        }
        
        ctx.restore();
    }
}

// Add a cooldown variable near the top of your file with other game state variables
let highScoreSubmitCooldown = 0;

// Remove the transition state variable since we're using a simpler approach
  