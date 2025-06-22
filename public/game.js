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

// Load game configuration
// Note: In a module system, this would be: import { GameConfig } from './js/config/GameConfig.js';
// For now, GameConfig is loaded via script tag in index.html

// Initialize canvas for rendering game graphics
let canvas;
let ctx;

// Game state tracking variables
let logMessages = [];        // Stores debug/info messages for development and user feedback
let gameStarted = false;     // Controls game state transitions between menu and gameplay
let gameLoopRunning = false; // Prevents multiple game loops from running simultaneously
let asteroidsDestroyed = 0;  // Track asteroids destroyed for score verification
let aliensDestroyed = 0;     // Track aliens destroyed for score verification
let bulletsFired = 0;        // Track bullets fired for score verification
let sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2); // Unique session identifier

// Score animation variables
let displayScore = 0;
let targetScore = 0;
let scoreAnimationSpeed = 5; // Points per frame

// Score pop-up system - using GameConfig values
let scorePopups = [];

// Create a score popup at the given position
function createScorePopup(x, y, points, isLevelBonus = false) {
    // For level bonuses, create a more elegant display
    if (isLevelBonus) {
        scorePopups.push({
            x,
            y,
            points,
            lifetime: GameConfig.SCORE.POPUP_LIFETIME * 3, // Longer lifetime for level bonus
            scale: 1.0, // Start smaller
            maxScale: 2.5, // Grow to this size
            opacity: 0, // Start transparent
            rotation: 0,
            bouncePhase: 0,
            isLevelBonus,
            color: GameConfig.COLORS.LEVEL_BONUS, // Yellow color for level bonus
            offsetX: 0, // No offset for level bonuses
            growTime: 45, // Frames to grow to full size
            holdTime: 90, // Frames to hold at full size
            fadeTime: 45 // Frames to fade out
        });
    } else {
        // Select color based on point value
        let colorSet = GameConfig.COLORS.SCORE_SMALL;
        if (points >= GameConfig.SCORE.VALUES.ALIEN) {
            colorSet = GameConfig.COLORS.SCORE_LARGE;
        } else if (points >= GameConfig.SCORE.VALUES.ASTEROID_MEDIUM) {
            colorSet = GameConfig.COLORS.SCORE_MEDIUM;
        }
        
        // Pick a random color from the appropriate set
        const color = colorSet[Math.floor(Math.random() * colorSet.length)];
        
        // Add random horizontal offset to avoid clustering in the same spot
        const offsetX = (Math.random() * 2 - 1) * GameConfig.SCORE.POPUP_OFFSET_RANGE;
        
        // For regular score popups, ensure they're simple and non-rotating
        scorePopups.push({
            x,
            y,
            points,
            lifetime: GameConfig.SCORE.POPUP_LIFETIME,
            scale: 1.2, // Increased from 0.4 to 1.2 (3x larger)
            opacity: 1,
            rotation: 0, // Force zero rotation
            bouncePhase: 0, // No bounce
            isLevelBonus,
            color: color,
            offsetX: offsetX
        });
    }
}

// Update score popups
function updateScorePopups() {
    const lifetimeReduction = GameConfig.GAME.FPS * deltaTime; // FPS equivalent
    const moveSpeed = GameConfig.SCORE.POPUP_SPEED * GameConfig.GAME.FPS * deltaTime; // Make movement frame-rate independent
    
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const popup = scorePopups[i];
        
        // Update lifetime based on delta time instead of fixed frames
        popup.lifetime -= lifetimeReduction;
        
        if (popup.lifetime <= 0) {
            scorePopups.splice(i, 1);
            continue;
        }
        
        if (popup.isLevelBonus) {
            // Level bonus animation
            const totalLifetime = GameConfig.SCORE.POPUP_LIFETIME * 3;
            const remainingLife = popup.lifetime;
            const elapsedTime = totalLifetime - remainingLife;
            
            // Phase 1: Grow and fade in
            if (elapsedTime < popup.growTime) {
                const growProgress = elapsedTime / popup.growTime;
                popup.scale = popup.maxScale * growProgress;
                popup.opacity = growProgress;
            } 
            // Phase 2: Hold at full size
            else if (elapsedTime < (popup.growTime + popup.holdTime)) {
                popup.scale = popup.maxScale;
                popup.opacity = 1.0;
                
                // Add a subtle pulse effect
                const pulsePhase = (elapsedTime - popup.growTime) / 15; // Frequency of pulse
                const pulseAmount = Math.sin(pulsePhase) * 0.1;
                popup.scale = popup.maxScale * (1 + pulseAmount);
            } 
            // Phase 3: Fade out
            else {
                const fadeProgress = (elapsedTime - popup.growTime - popup.holdTime) / popup.fadeTime;
                popup.opacity = Math.max(0, 1 - fadeProgress);
                
                // Slow upward drift during fade out
                popup.y -= moveSpeed * 0.5;
            }
        } else {
            // Regular score popup - faster upward movement with more horizontal drift
            popup.y -= moveSpeed * 1.5;
            
            // Add slight horizontal drift based on the offset
            if (popup.offsetX) {
                // Move horizontally at 1/3 the vertical speed
                const moveDirection = popup.offsetX > 0 ? 1 : -1;
                const horizontalSpeed = moveSpeed * 0.5 * moveDirection;
                popup.x += horizontalSpeed;
            }
            
            // Simple scale-in effect: use percentage of total lifetime instead of frame count
            const percentComplete = 1 - (popup.lifetime / GameConfig.SCORE.POPUP_LIFETIME);
            if (percentComplete < 0.15) { // First quarter of lifetime
                // Start at 1.2 and grow to 1.8 over the first 15% of lifetime
                popup.scale = 1.2 + (percentComplete * 4.0);
            } else {
                popup.scale = 1.8; // Increased from 0.6 to 1.8 (3x larger)
            }
            
            // Fade out as lifetime approaches zero - based on percentage of lifetime
            if (popup.lifetime < GameConfig.SCORE.POPUP_LIFETIME * 0.33) {
                popup.opacity = popup.lifetime / (GameConfig.SCORE.POPUP_LIFETIME * 0.33);
            }
        }
    }
}

// Draw score popups
function drawScorePopups() {
    ctx.textAlign = 'center';
    ctx.lineWidth = 2.5; // Increased from 1.5
    
    for (let i = 0; i < scorePopups.length; i++) {
        const popup = scorePopups[i];
        
        // Save the current transform state
        ctx.save();
        
        // Set up transform
        ctx.translate(popup.x, popup.y);
        
        if (popup.isLevelBonus) {
            // Level bonus - use custom appearance
            ctx.scale(popup.scale, popup.scale);
            
            // Add a glow effect
            ctx.shadowColor = GameConfig.COLORS.LEVEL_BONUS;
            ctx.shadowBlur = 15 * popup.opacity;
            
            // Custom font and colors for level bonus
            ctx.font = `bold ${GameConfig.UI.FONT_SIZE_TITLE}px ${GameConfig.UI.FONT_FAMILY}`;
            
            // Format the score with "+" prefix and commas
            const formattedPoints = "+" + popup.points.toLocaleString();
            
            // Add a subtle text shadow for depth
            ctx.fillStyle = 'rgba(255, 180, 0, ' + (popup.opacity * 0.7) + ')';
            ctx.fillText(formattedPoints, 2, 2); // Offset shadow
            
            // Main text with gradient
            const gradient = ctx.createLinearGradient(0, -20, 0, 20);
            gradient.addColorStop(0, 'rgba(255, 255, 0, ' + popup.opacity + ')');
            gradient.addColorStop(1, 'rgba(255, 160, 0, ' + popup.opacity + ')');
            ctx.fillStyle = gradient;
            
            // Draw text
            ctx.fillText(formattedPoints, 0, 0);
            
            // Draw outline
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 120, 0, ' + popup.opacity + ')';
            ctx.strokeText(formattedPoints, 0, 0);
            
            // Add "LEVEL BONUS" text below
            ctx.font = `${GameConfig.UI.FONT_SIZE_SMALL}px ${GameConfig.UI.FONT_FAMILY}`;
            ctx.fillStyle = 'rgba(255, 255, 255, ' + popup.opacity + ')';
            ctx.fillText("LEVEL BONUS", 0, 24);
        } else {
            // Regular score popups - absolutely no rotation, only positive scale
            const scale = Math.abs(popup.scale); // Ensure scale is positive
            ctx.scale(scale, scale);
            
            // Larger font sizes (3x increase)
            if (popup.points >= GameConfig.SCORE.VALUES.ALIEN) {
                ctx.font = `bold ${GameConfig.UI.FONT_SIZE_LARGE}px ${GameConfig.UI.FONT_FAMILY}`; // Increased from 16px
            } else {
                ctx.font = `${GameConfig.UI.FONT_SIZE_MEDIUM}px ${GameConfig.UI.FONT_FAMILY}`; // Increased from 12px
            }
            
            // Use custom colors if provided
            if (popup.color) {
                ctx.fillStyle = 'rgba(' + hexToRgba(popup.color, popup.opacity) + ')';
                // Create a darker stroke from the fill color
                ctx.strokeStyle = 'rgba(' + hexToRgba(darkenColor(popup.color), popup.opacity) + ')';
            } else {
                // Fallback to default colors
                if (popup.points >= GameConfig.SCORE.VALUES.ALIEN) {
                    ctx.fillStyle = 'rgba(255, 215, 0, ' + popup.opacity + ')'; // Gold
                    ctx.strokeStyle = 'rgba(255, 165, 0, ' + popup.opacity + ')'; // Orange
                } else if (popup.points >= GameConfig.SCORE.VALUES.ASTEROID_MEDIUM) {
                    ctx.fillStyle = 'rgba(173, 216, 230, ' + popup.opacity + ')'; // Light blue
                    ctx.strokeStyle = 'rgba(30, 144, 255, ' + popup.opacity + ')'; // Dodger blue
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, ' + popup.opacity + ')'; // White
                    ctx.strokeStyle = 'rgba(100, 149, 237, ' + popup.opacity + ')'; // Cornflower blue
                }
            }
            
            // Draw text with outline for better visibility
            ctx.strokeText("+" + popup.points, 0, 0);
            ctx.fillText("+" + popup.points, 0, 0);
        }
        
        // Restore transform
        ctx.restore();
    }
}

// Helper function: Convert hex color to rgba string
function hexToRgba(hex, alpha = 1) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert 3-digit hex to 6-digits
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Extract r, g, b components
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}, ${alpha}`;
}

// Helper function: Darken a hex color for stroke
function darkenColor(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert 3-digit hex to 6-digits
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Extract and darken r, g, b components
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Darken by multiplying by 0.7
    r = Math.floor(r * 0.7);
    g = Math.floor(g * 0.7);
    b = Math.floor(b * 0.7);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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

/**
 * High score system configuration
 * Server-based system allows for:
 * - Global competition
 * - Persistent rankings
 * - Anti-cheat verification
 * - Community engagement
 */
let highScores = [];
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
let battlestar = null;     // Battlestar boss ship
let battlestarBullets = []; // Battlestar bullets
let battlestarDebris = []; // Battlestar debris and effects
let score = 0;
let lives = GameConfig.GAME.STARTING_LIVES;
let level = GameConfig.GAME.STARTING_LEVEL;

/**
 * Game mechanics constants
 * Now using centralized GameConfig values for:
 * - Satisfying ship control
 * - Fair combat difficulty
 * - Progressive challenge scaling
 * - Rewarding scoring system
 */

// Visual Enhancement 1 - Thrust Effects (now using GameConfig values)

// Asteroid constants (now using GameConfig values)

// Bullet constants (now using GameConfig values)

// Alien constants (now using GameConfig values)

// Battlestar constants (now using GameConfig values)

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
    explode: null,
    alienSpawn: null,
    alienFire: null
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
let wasPausedBeforeFocus = false; // Remember pause state when window loses focus
// MAX_BULLETS now defined in GameConfig.GAME.MAX_BULLETS

// Debug/testing variables
let forceAliensInLevel1 = false; // Set to true to allow aliens in level 1 for testing
let showDebugInfo = false; // Toggle for showing debug info on screen

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
let highScoreSubmitCooldown = 0;

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
    
    // Add window focus/blur handlers for automatic pause
    window.addEventListener('blur', function() {
        if (gameStarted && !gamePaused) {
            wasPausedBeforeFocus = false;
            gamePaused = true;
            addLogMessage('Game auto-paused (window lost focus)');
        }
    });
    
    window.addEventListener('focus', function() {
        if (gameStarted && gamePaused && !wasPausedBeforeFocus) {
            gamePaused = false;
            addLogMessage('Game auto-resumed (window regained focus)');
        }
    });
    
    // Load pause preferences from localStorage
    try {
        const autoPausePref = localStorage.getItem('smashteroids_autoPause');
        if (autoPausePref === 'false') {
            // User has disabled auto-pause
            window.removeEventListener('blur', arguments.callee);
            window.removeEventListener('focus', arguments.callee);
            addLogMessage('Auto-pause disabled by user preference');
        }
    } catch (e) {
        // Ignore localStorage errors
    }
    
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

// Frame timing variables
// Used by the game loop to calculate deltaTime
let lastFrameTime = 0;
let deltaTime = 0;

/**
 * Main game loop
 * Orchestrates the game's core update and render cycle:
 * - Clears and prepares canvas
 * - Updates game state based on current mode
 * - Renders appropriate screen (welcome, game, or game over)
 * - Handles pause state and overlay systems
 */
function gameLoop(timestamp) {
    // Calculate delta time (in seconds)
    if (!lastFrameTime) lastFrameTime = timestamp;
    deltaTime = (timestamp - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = timestamp;
    
    // Cap delta time to prevent huge jumps if the game pauses/lags
    deltaTime = Math.min(deltaTime, 0.1);
    
    // Increment frame counter for animations
    frameCount++;
    
    // Update high score submission cooldown
    if (highScoreSubmitCooldown > 0) {
        highScoreSubmitCooldown--;
    }
    
    // Clean up old sound nodes periodically to prevent resource exhaustion
    if (frameCount % 300 === 0) { // Every 5 seconds at 60fps
        cleanupSoundNodes();
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
            // Note: updateAliens() and updateAlienBullets() are already called in updateGame()
            // Removing redundant calls here to prevent updating aliens twice
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
    drawDebugInfo(); // Draw debug info if enabled
    
    // Draw ConfigUI if it exists
    if (window.configUI) {
        window.configUI.draw(ctx);
    }
    
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
    
    // Draw animated pause icon
    ctx.save();
    ctx.translate(illustrationX, startY);
    
    // Animate pause icon with pulsing effect
    const pulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    
    // Draw two vertical bars (pause symbol)
    const barWidth = 4;
    const barHeight = 20;
    const barSpacing = 8;
    
    ctx.fillRect(-barSpacing/2 - barWidth/2, -barHeight/2, barWidth, barHeight);
    ctx.fillRect(barSpacing/2 - barWidth/2, -barHeight/2, barWidth, barHeight);
    
    // Draw "P" key indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-15, barHeight/2 + 5, 30, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('P', 0, barHeight/2 + 13);
    
    ctx.restore();
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
    // Darken the background with a subtle gradient
    const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/2);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a subtle border glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Animated pause icon (two vertical bars)
    const iconX = canvas.width / 2;
    const iconY = canvas.height / 3 - 60;
    const iconSize = 40;
    const pulse = Math.sin(frameCount * 0.1) * 0.2 + 0.8; // Subtle pulsing effect
    
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.fillRect(iconX - iconSize/2 - 15, iconY - iconSize/2, 12, iconSize);
    ctx.fillRect(iconX - iconSize/2 + 15, iconY - iconSize/2, 12, iconSize);
    
    // Main pause text with glow effect
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME PAUSED', canvas.width / 2, canvas.height / 3);
    
    // Reset shadow for other text
    ctx.shadowBlur = 0;
    
    // Instructions with better spacing
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('PRESS P TO RESUME', canvas.width / 2, canvas.height / 3 + 50);
    
    // Additional controls info
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('ESC: EXIT TO MENU', canvas.width / 2, canvas.height / 3 + 80);
    
    // Current game stats
    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score.toLocaleString()}`, 50, canvas.height - 120);
    ctx.fillText(`LEVEL: ${level}`, 50, canvas.height - 100);
    ctx.fillText(`LIVES: ${lives}`, 50, canvas.height - 80);
    
    // Right-aligned stats
    ctx.textAlign = 'right';
    ctx.fillText(`ASTEROIDS: ${asteroids.length}`, canvas.width - 50, canvas.height - 120);
    ctx.fillText(`ALIENS: ${aliens.length}`, canvas.width - 50, canvas.height - 100);
    if (battlestar) {
        ctx.fillText('BATTLESTAR: ACTIVE', canvas.width - 50, canvas.height - 80);
    }
    
    // Reset text alignment
    ctx.textAlign = 'center';
    
    // Show debug info if enabled
    if (showDebugInfo) {
        drawDebugInfo();
        
        // Draw ConfigUI if it exists
        if (window.configUI) {
            window.configUI.draw(ctx);
        }
    }
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
        if (aliens.length < GameConfig.ALIEN.MAX_COUNT) {
            createAlien();
            if (level <= 1) {
                addLogMessage('DEBUG: Alien created in level 1 (using cheat - normally aliens only appear from level 2)');
            } else {
                addLogMessage('DEBUG: Alien created (cheat)');
            }
        }
        return;
    }

    // Spawn battlestar with 'B' key (for testing)
    if ((e.key === 'b' || e.key === 'B') && gameStarted && !gamePaused) {
        if (!battlestar) {
            createBattlestar();
            addLogMessage('DEBUG: Battlestar created (cheat)');
        }
        return;
    }

    // Toggle alien testing mode with 'T' key (for testing)
    if ((e.key === 't' || e.key === 'T') && gameStarted) {
        forceAliensInLevel1 = !forceAliensInLevel1;
        addLogMessage('DEBUG: Alien testing mode ' + (forceAliensInLevel1 ? 'enabled' : 'disabled'));
        if (forceAliensInLevel1) {
            // Force spawn an alien immediately for testing
            if (aliens.length < GameConfig.ALIEN.MAX_COUNT) {
                createAlien();
                addLogMessage('DEBUG: Test alien spawned');
            }
        }
        return;
    }

    // Test sound system with 'S' key (for debugging)
    if ((e.key === 's' || e.key === 'S') && gameStarted) {
        const soundCount = soundNodes ? Object.keys(soundNodes).length : 0;
        const audioState = audioContext ? audioContext.state : 'null';
        addLogMessage(`DEBUG: Sound nodes: ${soundCount}, Audio state: ${audioState}`);
        
        // Test all sound types
        playSound('fire');
        setTimeout(() => playSound('bangSmall'), 200);
        setTimeout(() => playSound('bangMedium'), 400);
        setTimeout(() => playSound('bangLarge'), 600);
        setTimeout(() => playSound('alienSpawn'), 800);
        setTimeout(() => playSound('alienFire'), 1000);
        
        return;
    }

    // Reset audio context with 'R' key (for debugging)
    if ((e.key === 'r' || e.key === 'R') && gameStarted) {
        addLogMessage('DEBUG: Resetting audio context...');
        resetAudioContext();
        return;
    }

    // Toggle debug info display with 'D' key
    if ((e.key === 'd' || e.key === 'D') && gameStarted) {
        showDebugInfo = !showDebugInfo;
        addLogMessage('DEBUG: Debug info ' + (showDebugInfo ? 'enabled' : 'disabled'));
        return;
    }

    // If release notes are showing, only handle scrolling
    if (showingReleaseNotes) {
        if (e.key === 'ArrowUp') {
            releaseNotesScroll = Math.max(0, releaseNotesScroll - GameConfig.ANIMATION.SCROLL_SPEED);
            return;
        } else if (e.key === 'ArrowDown') {
            releaseNotesScroll += GameConfig.ANIMATION.SCROLL_SPEED;
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
        // Don't allow pausing during ship respawn or game over
        if (shipRespawnTimer > 0 || enteringInitials) {
            return;
        }
        
        gamePaused = !gamePaused;
        
        // Remember if user manually paused (not auto-paused)
        if (gamePaused) {
            wasPausedBeforeFocus = true;
        }
        
        addLogMessage('Game ' + (gamePaused ? 'paused' : 'resumed'));
        
        // Play different sounds for pause/resume
        if (gamePaused) {
            playSound('bangSmall'); // Pause sound
        } else {
            playSound('fire'); // Resume sound
        }
        return;
    }
    
    // Handle pause menu options
    if (gamePaused && gameStarted) {
        if (e.key === 'a' || e.key === 'A') {
            // Toggle auto-pause preference
            try {
                const currentPref = localStorage.getItem('smashteroids_autoPause');
                const newPref = currentPref === 'false' ? 'true' : 'false';
                localStorage.setItem('smashteroids_autoPause', newPref);
                addLogMessage('Auto-pause ' + (newPref === 'true' ? 'enabled' : 'disabled'));
                playSound('bangSmall');
            } catch (e) {
                addLogMessage('Failed to save preference');
            }
            return;
        }
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
            explode: { play: () => playSound('explode') },
            alienSpawn: { play: () => playSound('alienSpawn') },
            alienFire: { play: () => playSound('alienFire') }
        };
        
        // Initialize sound nodes
        soundNodes = {};
        let levelStartNode;
        
        // Track AudioWorklet loading state
        window.audioWorkletLoaded = false;
        
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
        const audioWorkletUrl = `audioWorklet.js?v=${timestamp}`;
        console.log('Attempting to load AudioWorklet from:', audioWorkletUrl);
        console.log('AudioContext state before loading:', audioContext.state);
        console.log('AudioContext sample rate:', audioContext.sampleRate);
        
        function loadAudioWorklet() {
            // Check if AudioWorklet is supported
            console.log('AudioContext object:', audioContext);
            console.log('AudioContext.audioWorklet:', audioContext.audioWorklet);
            console.log('AudioContext state:', audioContext.state);
            console.log('AudioContext constructor name:', audioContext.constructor.name);
            console.log('Is secure context:', window.isSecureContext);
            console.log('Current protocol:', window.location.protocol);
            console.log('Current hostname:', window.location.hostname);
            
            if (!audioContext.audioWorklet) {
                console.error('AudioWorklet is not supported in this browser');
                console.log('Available AudioContext properties:', Object.getOwnPropertyNames(audioContext));
                
                // Check if it's a secure context issue
                if (!window.isSecureContext) {
                    console.error('AudioWorklet requires a secure context (HTTPS or localhost)');
                    addLogMessage('AudioWorklet requires HTTPS - using fallback audio');
                } else {
                    console.error('AudioWorklet not available despite secure context');
                    addLogMessage('AudioWorklet not supported - using fallback audio');
                }
                
                // Try creating a new AudioContext with the standard API if we're using webkit
                if (audioContext.constructor.name === 'webkitAudioContext') {
                    console.log('Attempting to create standard AudioContext...');
                    try {
                        const standardAudioContext = new AudioContext();
                        if (standardAudioContext.audioWorklet) {
                            console.log('Standard AudioContext has AudioWorklet support');
                            audioContext = standardAudioContext;
                        } else {
                            console.log('Standard AudioContext also lacks AudioWorklet support');
                        }
                    } catch (e) {
                        console.error('Failed to create standard AudioContext:', e);
                    }
                }
                
                // If still no AudioWorklet support, use fallback
                if (!audioContext.audioWorklet) {
                    createFallbackAudioSystem();
                    return;
                }
            }
            
            audioContext.audioWorklet.addModule(audioWorkletUrl)
                .then(() => {
                    // Mark AudioWorklet as loaded
                    window.audioWorkletLoaded = true;
                    console.log('AudioWorklet loaded successfully');
                    addLogMessage('Audio system initialized');
                    
                    // Level start sound (triumphant rising tone)
                    levelStartNode = new AudioWorkletNode(audioContext, 'sound-generator');
                    // ... existing code ...
                })
                .catch(error => {
                    console.error('Failed to load AudioWorklet:', error);
                    console.error('Error name:', error.name);
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    console.error('AudioWorklet URL attempted:', audioWorkletUrl);
                    console.error('AudioContext state:', audioContext.state);
                    console.error('AudioContext sample rate:', audioContext.sampleRate);
                    console.error('Current page URL:', window.location.href);
                    console.error('User agent:', navigator.userAgent);
                    
                    // Try to fetch the AudioWorklet file directly to see if it's accessible
                    fetch(audioWorkletUrl)
                        .then(response => {
                            console.log('AudioWorklet fetch response status:', response.status);
                            console.log('AudioWorklet fetch response headers:', response.headers);
                            return response.text();
                        })
                        .then(text => {
                            console.log('AudioWorklet file content length:', text.length);
                            console.log('AudioWorklet file first 100 chars:', text.substring(0, 100));
                        })
                        .catch(fetchError => {
                            console.error('Failed to fetch AudioWorklet file:', fetchError);
                        });
                    
                    // Try fallback URL without query parameter
                    console.log('Trying fallback AudioWorklet URL...');
                    audioContext.audioWorklet.addModule('audioWorklet.js')
                        .then(() => {
                            window.audioWorkletLoaded = true;
                            console.log('AudioWorklet loaded successfully with fallback URL');
                            addLogMessage('Audio system initialized (fallback)');
                            
                            // Level start sound (triumphant rising tone)
                            levelStartNode = new AudioWorkletNode(audioContext, 'sound-generator');
                            // ... existing code ...
                        })
                        .catch(fallbackError => {
                            console.error('Fallback AudioWorklet loading also failed:', fallbackError);
                            addLogMessage('Audio system failed to load: ' + error.message);
                            window.audioWorkletLoaded = false;
                            
                            // Create fallback audio system
                            createFallbackAudioSystem();
                        });
                });
        }
        
        // If AudioContext is suspended, try to resume it first
        if (audioContext.state === 'suspended') {
            console.log('AudioContext is suspended, attempting to resume...');
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully, state:', audioContext.state);
                loadAudioWorklet();
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
                // Try loading AudioWorklet anyway
                loadAudioWorklet();
            });
        } else {
            loadAudioWorklet();
        }
        
    } catch (e) {
        // ... existing code ...
    }
}

// Continuous thrust sound
let thrustNode = null;
let thrustOscillator = null;

// Sound cleanup function to prevent resource exhaustion
function cleanupSoundNodes() {
    if (!soundNodes) return;
    
    const now = Date.now();
    const maxAge = 5000; // 5 seconds max age for sound nodes
    
    Object.keys(soundNodes).forEach(key => {
        const node = soundNodes[key];
        if (node && node._createdAt && (now - node._createdAt) > maxAge) {
            try {
                node.disconnect();
                node.port.postMessage({ stop: true });
                delete soundNodes[key];
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });
    
    // Also clean up thrust node if it's been inactive too long
    if (thrustNode && thrustNode._createdAt && (now - thrustNode._createdAt) > 10000) {
        try {
            thrustNode.disconnect();
            thrustNode.port.postMessage({ stop: true });
            thrustNode = null;
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

// Reset audio context if it gets into a bad state
function resetAudioContext() {
    try {
        // Clean up existing nodes
        if (soundNodes) {
            Object.values(soundNodes).forEach(node => {
                try {
                    node.disconnect();
                    node.port.postMessage({ stop: true });
                } catch (e) {
                    // Ignore cleanup errors
                }
            });
            soundNodes = {};
        }
        
        // Clean up thrust node
        if (thrustNode) {
            try {
                thrustNode.disconnect();
                thrustNode.port.postMessage({ stop: true });
            } catch (e) {
                // Ignore cleanup errors
            }
            thrustNode = null;
        }
        
        // Reset loading state
        window.audioWorkletLoaded = false;
        
        // Close old context if it exists
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }
        
        // Create new context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Reload AudioWorklet
        const timestamp = new Date().getTime();
        audioContext.audioWorklet.addModule(`audioWorklet.js?v=${timestamp}`)
            .then(() => {
                window.audioWorkletLoaded = true;
                addLogMessage('Audio context reset successfully');
            })
            .catch(error => {
                console.error('Failed to reload AudioWorklet:', error);
                addLogMessage('Audio reset failed: ' + error.message);
                window.audioWorkletLoaded = false;
            });
            
    } catch (e) {
        console.error('Failed to reset audio context:', e);
        addLogMessage('Audio reset error: ' + e.message);
        window.audioWorkletLoaded = false;
    }
}

// Play or stop the thrust sound
function playThrustSound(play) {
    if (!audioContext) {
        console.error('Audio context not available for thrust sound');
        return;
    }
    
    // Check if we have fallback sound system available
    if (soundFX && soundFX.thrust && !window.audioWorkletLoaded) {
        // Use fallback sound system only if AudioWorklet is not loaded
        try {
            if (play) {
                soundFX.thrust.play();
            } else {
                soundFX.thrust.pause();
            }
        } catch (e) {
            console.error('Error with fallback thrust sound:', e);
        }
        return;
    }
    
    // Check if AudioWorklet is loaded
    if (!window.audioWorkletLoaded) {
        console.log('AudioWorklet not loaded yet, skipping thrust sound');
        return;
    }
    
    // Check if audio context is suspended and try to resume
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
            console.error('Failed to resume audio context:', err);
            return;
        });
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
            thrustNode._createdAt = Date.now(); // Add timestamp for cleanup
        } else {
            // Stop thrust sound
            if (thrustNode) {
                try {
                    thrustNode.port.postMessage({ stop: true });
                    thrustNode.disconnect();
                    if (soundNodes && soundNodes.thrust === thrustNode) {
                        delete soundNodes.thrust;
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
                thrustNode = null;
            }
        }
    } catch (e) {
        console.error('Error with thrust sound:', e);
        addLogMessage('Thrust sound error: ' + e.message);
        
        // Try to recover audio context if it failed
        if (audioContext && audioContext.state === 'closed') {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                addLogMessage('Audio context recreated');
            } catch (recreateError) {
                console.error('Failed to recreate audio context:', recreateError);
            }
        }
    }
}

// Play a sound effect
function playSound(soundType) {
    if (!audioContext) {
        console.error('Audio context not available for sound:', soundType);
        addLogMessage('Audio context not available');
        return;
    }
    
    // Check if we have fallback sound system available
    if (soundFX && soundFX[soundType] && !window.audioWorkletLoaded) {
        // Use fallback sound system only if AudioWorklet is not loaded
        try {
            soundFX[soundType].play();
        } catch (e) {
            console.error('Error playing fallback sound:', e);
        }
        return;
    }
    
    // Check if AudioWorklet is loaded
    if (!window.audioWorkletLoaded) {
        console.log('AudioWorklet not loaded yet, skipping sound:', soundType);
        return;
    }
    
    // Check if audio context is suspended and try to resume
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
            console.error('Failed to resume audio context:', err);
            return;
        });
    }
    
    try {
        // Clean up any existing sound node of this type
        if (soundNodes && soundNodes[soundType]) {
            try {
                soundNodes[soundType].disconnect();
                soundNodes[soundType].port.postMessage({ stop: true });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        
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
        } else if (soundType === 'alienSpawn') {
            message.amplitude = 0.7; // Good volume for the swoosh effect
            message.duration = 1.0; // Longer duration for the swoosh
        }
        
        soundNode.port.postMessage(message);
        
        // Connect to output and start
        soundNode.connect(audioContext.destination);
        
        // Store reference to stop later if needed
        if (!soundNodes) {
            soundNodes = {};
        }
        soundNodes[soundType] = soundNode;
        soundNode._createdAt = Date.now(); // Add timestamp for cleanup
        
        // Set up automatic cleanup after sound duration
        const cleanupTime = (message.duration || 1.0) * 1000 + 100; // Add 100ms buffer
        setTimeout(() => {
            if (soundNodes && soundNodes[soundType] === soundNode) {
                try {
                    soundNode.disconnect();
                    soundNode.port.postMessage({ stop: true });
                    delete soundNodes[soundType];
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }, cleanupTime);
        
    } catch (e) {
        console.error('Error playing sound:', e);
        addLogMessage('Sound error: ' + e.message);
        
        // Try to recover audio context if it failed
        if (audioContext && audioContext.state === 'closed') {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                addLogMessage('Audio context recreated');
            } catch (recreateError) {
                console.error('Failed to recreate audio context:', recreateError);
            }
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
    for (let i = 0; i < GameConfig.ASTEROID.COUNT + level; i++) {
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (ship && distBetweenPoints(ship.x, ship.y, x, y) < GameConfig.SHIP.SIZE * 4);
        
        asteroids.push(createAsteroid(x, y, 3)); // Start with large asteroids (size 3)
    }
}

// Create a single asteroid
function createAsteroid(x, y, size) {
    const ASTEROID_VERT = 10; // average number of vertices
    
    // Calculate speed based on level and size
    const levelSpeedBonus = Math.min((level - 1) * GameConfig.ASTEROID.SPEED_SCALING, GameConfig.ASTEROID.MAX_SPEED - GameConfig.ASTEROID.BASE_SPEED);
    const sizeSpeedMultiplier = (4 - size) * 0.4; // Smaller asteroids are faster (size 3: 0.4x, size 2: 0.8x, size 1: 1.2x)
    const currentSpeed = (GameConfig.ASTEROID.BASE_SPEED + levelSpeedBonus) * (1 + sizeSpeedMultiplier);
    
    let asteroid = {
        x: x,
        y: y,
        size: size,
        radius: size * (20 - Math.min(level - 1, 5)), // Asteroids get slightly smaller with level (max 5 levels of shrinking)
        angle: Math.random() * Math.PI * 2,
        vert: Math.floor(Math.random() * (ASTEROID_VERT + 1) + ASTEROID_VERT / 2),
        offset: [],
        velocity: {
            // Velocity will be multiplied by deltaTime in updateAsteroids
            x: Math.random() * currentSpeed * 2 - currentSpeed,
            y: Math.random() * currentSpeed * 2 - currentSpeed
        },
        // Rotation will be multiplied by deltaTime in updateAsteroids
        rotationSpeed: (Math.random() - 0.5) * 0.02 * (1 + (level - 1) * 0.1) * (1 + sizeSpeedMultiplier) // Smaller asteroids rotate faster too
    };
    
    // Create the asteroid's shape (offset array)
    for (let i = 0; i < asteroid.vert; i++) {
        asteroid.offset.push(
            Math.random() * GameConfig.ASTEROID.JAG * 2 + 1 - GameConfig.ASTEROID.JAG
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
        ship.rotation = GameConfig.SHIP.ROTATION_SPEED; // Reversed from negative to positive
    } else if (keys.right) {
        ship.rotation = -GameConfig.SHIP.ROTATION_SPEED; // Reversed from positive to negative
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
    updateAliens();
    updateAlienBullets();
    updateAlienDebris();
    updateBattlestar();
    updateBattlestarBullets();
    updateBattlestarDebris();
    checkCollisions();
    
    // Check for level completion and progression
    if (asteroids.length === 0) {
        // Award level completion bonus with increasing value for higher levels
        const levelBonus = 1000 * Math.pow(2, level - 1); // 1000 for level 1, 2000 for level 2, 4000 for level 3, etc.
        score += levelBonus;
        
        // Create a single centered, larger score popup for the level bonus
        createScorePopup(canvas.width / 2, canvas.height / 2, levelBonus, true);
        
        // Add a more elegant visual effect instead of multiple popups
        const numRays = 12; // Reduce from previous 8 surrounding popups
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const length = 150 + Math.random() * 50;
            
            battlestarDebris.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 1,
                maxSize: 3,
                length: length,
                angle: angle,
                lifetime: 90 + Math.random() * 30,
                color: '#FFFF00',
                type: 'ray'
            });
        }
        
        // Add special visual effect for level completion - reduce particle count
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 150;
            const speed = 1 + Math.random() * 3;
            
            battlestarDebris.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.4,
                lifetime: 60 + Math.random() * 60,
                color: Math.random() < 0.3 ? '#FFFFFF' : (Math.random() < 0.6 ? '#00FF00' : '#FFFF00'),
                type: Math.random() < 0.6 ? 'circle' : 'line'
            });
        }
        
        // Add a shockwave effect
        battlestarDebris.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 1,
            maxRadius: 300,
            lifetime: 60,
            type: 'shockwave',
            color: '#00FF00' // Green for level completion
        });
        
        // Play celebratory sounds
        playSound('bangLarge');
        setTimeout(() => playSound('bangMedium'), 200);
        
        addLogMessage(`Level ${level} complete! Bonus: ${levelBonus} points!`);
        
        // Advance to next level
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
                GameConfig.ALIEN.MIN_SPAWN_INTERVAL,
                GameConfig.ALIEN.BASE_SPAWN_INTERVAL - (level - 2) * GameConfig.ALIEN.SPAWN_INTERVAL_DECREASE
            );
            // Add some extra delay for the first alien of the level
            alienSpawnTimer = spawnInterval * 1.5;
            addLogMessage('Alien spacecraft detected in the vicinity');
        }

        // Spawn battlestar at level 3 and every 3 levels after
        if (level >= 3 && level % 3 === 0 && !battlestar) {
            // Add dramatic pause before battlestar appears
            setTimeout(() => {
                createBattlestar();
                addLogMessage('WARNING: Battlestar approaching!');
            }, 3000); // 3 second delay after level start
        }
    }
}

// Update ship position and rotation using vector-based physics
function updateShip() {
    // Handle spawn animation if active
    if (ship.spawning) {
        // Update spawn timer using delta time
        ship.spawnTime -= 60 * deltaTime;
        
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
        ship.explodeTime -= 60 * deltaTime;
        if (ship.explodeTime <= 0) {
            respawnShipSafely();
        }
        return;
    }
    
    // Update invulnerability timer
    if (ship.invulnerable) {
        ship.invulnerableTime -= 60 * deltaTime;
        if (ship.invulnerableTime <= 0) {
            ship.invulnerable = false;
        }
    }
    
    // Update ship's angular position based on rotation velocity
    // Multiply by deltaTime for frame-rate independent rotation
    ship.angle += ship.rotation * 60 * deltaTime;
    
    // Apply thrust using a vector-based physics model with delta time scaling
    if (ship.thrusting) {
        ship.thrust.x += GameConfig.SHIP.THRUST * Math.cos(ship.angle) * GameConfig.GAME.FPS * deltaTime;
        ship.thrust.y -= GameConfig.SHIP.THRUST * Math.sin(ship.angle) * GameConfig.GAME.FPS * deltaTime;
    } else {
        // Apply exponential decay friction to gradually slow the ship
        // This creates a smooth deceleration effect while maintaining momentum
        // Use a time-based friction factor instead of a fixed per-frame value
        const frictionFactor = Math.pow(GameConfig.SHIP.FRICTION, GameConfig.GAME.FPS * deltaTime);
        ship.thrust.x *= frictionFactor;
        ship.thrust.y *= frictionFactor;
    }
    
    // Update position based on current velocity (thrust)
    // Multiply by deltaTime for frame-rate independent movement
    ship.x += ship.thrust.x * 60 * deltaTime;
    ship.y += ship.thrust.y * 60 * deltaTime;
    
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
        radius: GameConfig.SHIP.SIZE / 2,
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
        invulnerableTime: GameConfig.SHIP.INVULNERABILITY_TIME,
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
            x: newX + Math.cos(angle) * GameConfig.SHIP.SIZE * 2,
            y: newY + Math.sin(angle) * GameConfig.SHIP.SIZE * 2,
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
    
    if (bullets.length < GameConfig.GAME.MAX_BULLETS && !ship.exploding) {
        // Calculate bullet spawn position at ship's nose
        const angle = ship.angle;
        const bulletX = ship.x + Math.cos(angle) * ship.radius;
        const bulletY = ship.y - Math.sin(angle) * ship.radius;
        
        // Create bullet with inherited momentum
        // Note: No need to divide by 60 here since updateBullets will multiply by deltaTime
        bullets.push({
            x: bulletX,
            y: bulletY,
            xv: GameConfig.BULLET.SPEED * Math.cos(angle) + ship.thrust.x,
            yv: -GameConfig.BULLET.SPEED * Math.sin(angle) + ship.thrust.y,
            lifetime: GameConfig.BULLET.LIFETIME
        });
        
        playSound('fire');
    }
}

// Update bullets position and lifetime
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Update bullet position with deltaTime for consistent speed
        bullet.x += bullet.xv * 60 * deltaTime;
        bullet.y += bullet.yv * 60 * deltaTime;
        
        // Wrap bullets around screen edges
        if (bullet.x < 0) bullet.x = canvas.width;
        if (bullet.x > canvas.width) bullet.x = 0;
        if (bullet.y < 0) bullet.y = canvas.height;
        if (bullet.y > canvas.height) bullet.y = 0;
        
        // Check for bullet lifetime
        bullet.lifetime -= 60 * deltaTime;
        if (bullet.lifetime <= 0) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check collision with aliens
        for (let a = aliens.length - 1; a >= 0; a--) {
            const alien = aliens[a];
            const dx = bullet.x - alien.x;
            const dy = bullet.y - alien.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < alien.radius) {
                // Remove bullet
                bullets.splice(i, 1);
                
                // Calculate hit angle for directional explosion
                const hitAngle = Math.atan2(dy, dx);
                
                // Reduce alien health
                alien.health--;
                alien.hitTime = performance.now();
                
                // Create hit effect
                for (let p = 0; p < 5; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    alienDebris.push({
                        x: bullet.x,
                        y: bullet.y,
                        vx: Math.cos(angle) * 2,
                        vy: Math.sin(angle) * 2,
                        size: 1 + Math.random() * 2,
                        rotation: 0,
                        rotationSpeed: 0,
                        lifetime: 20,
                        color: '#FFFFFF',
                        type: 'circle'
                    });
                }
                
                // Play hit sound
                playSound('bangSmall');
                
                // If alien is destroyed
                if (alien.health <= 0) {
                    // Add score based on alien's value
                    score += alien.scoreValue;
                    
                    // Create score popup
                    createScorePopup(alien.x, alien.y, alien.scoreValue);
                    
                    // Create explosion effect
                    for (let p = 0; p < 20; p++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 1 + Math.random() * 3;
                        alienDebris.push({
                            x: alien.x,
                            y: alien.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: 2 + Math.random() * 3,
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.2,
                            lifetime: 60,
                            color: '#00FFFF',
                            type: Math.random() < 0.5 ? 'circle' : 'line'
                        });
                    }
                    
                    // Add shockwave
                    alienDebris.push({
                        x: alien.x,
                        y: alien.y,
                        radius: 1,
                        maxRadius: 50,
                        lifetime: 30,
                        type: 'shockwave',
                        color: '#00FFFF'
                    });
                    
                    // Remove alien
                    aliens.splice(a, 1);
                    
                    // Play explosion sound
                    playSound('bangLarge');
                    
                    addLogMessage("Alien destroyed! +" + alien.scoreValue + " points");
                }
                
                break; // Only hit one alien per bullet
            }
        }
        
        // Check collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullet.x, bullet.y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius) {
                bullet.active = false;
                
                // Calculate collision angle for debris direction
                const collisionAngle = Math.atan2(bullet.y - asteroids[j].y, bullet.x - asteroids[j].x);
                
                // Destroy the asteroid
                destroyAsteroid(j, collisionAngle);
                
                // Play sound
                playSound('bangSmall');
                break;
            }
        }
    }
}

// Update asteroids position
function updateAsteroids() {
    for (let i = 0; i < asteroids.length; i++) {
        // Move asteroid with deltaTime for consistent speed
        asteroids[i].x += asteroids[i].velocity.x * 60 * deltaTime;
        asteroids[i].y += asteroids[i].velocity.y * 60 * deltaTime;
        
        // Rotate asteroid with deltaTime for consistent rotation
        asteroids[i].angle += asteroids[i].rotationSpeed * 60 * deltaTime;
        
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
            if (!alien.invulnerable && distBetweenPoints(ship.x, ship.y, alien.x, alien.y) < ship.radius + GameConfig.ALIEN.SIZE) {
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
                
                if (distance < GameConfig.ALIEN.SIZE + asteroid.radius) {
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
    
    // Check ship collisions with battlestar
    if (ship && !ship.exploding && !ship.invulnerable && battlestar && !battlestar.invulnerable && !battlestar.dying) {
        // Use rectangular collision detection for the battlestar
        const shipDistX = Math.abs(ship.x - battlestar.x);
        const shipDistY = Math.abs(ship.y - battlestar.y);
        
        if (shipDistX < (battlestar.width / 2 + ship.radius) && 
            shipDistY < (battlestar.height / 2 + ship.radius)) {
            // Ship hit battlestar
            destroyShip();
        }
    }
    
    // Check bullet collisions with battlestar
    if (battlestar && !battlestar.invulnerable && !battlestar.dying) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            // Use rectangular collision detection
            const bulletDistX = Math.abs(bullet.x - battlestar.x);
            const bulletDistY = Math.abs(bullet.y - battlestar.y);
            
            if (bulletDistX < battlestar.width / 2 && bulletDistY < battlestar.height / 2) {
                // Calculate hit angle for directional damage effect
                const hitAngle = Math.atan2(bullet.y - battlestar.y, bullet.x - battlestar.x);
                
                // Remove bullet
                bullets.splice(i, 1);
                
                // Damage battlestar
                damageBattlestar(1, hitAngle);
            }
        }
    }
    
    // Check asteroid collisions with battlestar
    if (battlestar && !battlestar.dying) {
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            
            // Use rectangular collision detection with radius adjustment
            const asteroidDistX = Math.abs(asteroid.x - battlestar.x);
            const asteroidDistY = Math.abs(asteroid.y - battlestar.y);
            
            if (asteroidDistX < (battlestar.width / 2 + asteroid.radius) && 
                asteroidDistY < (battlestar.height / 2 + asteroid.radius)) {
                
                // Calculate collision angle for bouncing
                const collisionAngle = Math.atan2(asteroid.y - battlestar.y, asteroid.x - battlestar.x);
                
                // Bounce the asteroid away
                const bounceSpeed = Math.sqrt(
                    asteroid.velocity.x * asteroid.velocity.x + 
                    asteroid.velocity.y * asteroid.velocity.y
                );
                
                asteroid.velocity.x = Math.cos(collisionAngle) * bounceSpeed;
                asteroid.velocity.y = Math.sin(collisionAngle) * bounceSpeed;
                
                // Move asteroid outside of collision zone
                asteroid.x = battlestar.x + Math.cos(collisionAngle) * (battlestar.width / 2 + asteroid.radius + 5);
                asteroid.y = battlestar.y + Math.sin(collisionAngle) * (battlestar.height / 2 + asteroid.radius + 5);
                
                // Create bounce effect
                createCollisionEffect(
                    (asteroid.x + battlestar.x) / 2,
                    (asteroid.y + battlestar.y) / 2,
                    collisionAngle
                );
                
                // Play sound
                playSound('bangSmall');
            }
        }
    }
    
    // Check alien bullet collisions with asteroids
    for (let i = alienBullets.length - 1; i >= 0; i--) {
        const alienBullet = alienBullets[i];
        
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            
            if (distBetweenPoints(alienBullet.x, alienBullet.y, asteroid.x, asteroid.y) < asteroid.radius) {
                // Calculate collision angle for debris direction
                const collisionAngle = Math.atan2(alienBullet.y - asteroid.y, alienBullet.x - asteroid.x);
                
                // Remove alien bullet
                alienBullets.splice(i, 1);
                
                // Destroy asteroid
                destroyAsteroid(j, collisionAngle);
                
                // Play sound
                playSound('bangSmall');
                
                // Break out of asteroid loop since bullet is destroyed
                break;
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
        
        // Move debris with deltaTime for consistent speed
        debris.centerX += debris.velocity.x * 60 * deltaTime;
        debris.centerY += debris.velocity.y * 60 * deltaTime;
        
        // Rotate debris with deltaTime for consistent rotation
        debris.angle += debris.rotationSpeed * 60 * deltaTime;
        
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
        
        // Reduce lifetime with deltaTime
        debris.lifetime -= 60 * deltaTime;
        
        // Remove dead debris
        if (debris.lifetime <= 0) {
            shipDebris.splice(i, 1);
        }
    }
}

// Destroy an asteroid and potentially create smaller ones
function destroyAsteroid(index, collisionAngle = null) {
    const asteroid = asteroids[index];
    // Score increases with level
    const levelBonus = Math.floor((level - 1) * 0.5 * GameConfig.ASTEROID.SCORE_MULTIPLIER); // 50% more points per level
    const points = (GameConfig.ASTEROID.SCORE_MULTIPLIER * (4 - asteroid.size)) + levelBonus;
    
    // Add score
    score += points;
    
    // Create score popup with small random offsets to avoid obscuring the asteroid fragments
    const offsetX = (Math.random() * 2 - 1) * 20; // Random offset between -20 and 20 pixels
    const offsetY = (Math.random() * 2 - 1) * 20; 
    createScorePopup(asteroid.x + offsetX, asteroid.y + offsetY, points, false);
    
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
    
    // Draw battlestar and its related effects
    drawBattlestarDebris();
    drawBattlestar();
    drawBattlestarBullets();
    
    // Draw alien ships and their effects
    drawAlienDebris();
    drawAliens();
    drawAlienBullets();
    
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
        drawX += (Math.random() - 0.5) * GameConfig.THRUST.SHAKE_AMOUNT;
        drawY += (Math.random() - 0.5) * GameConfig.THRUST.SHAKE_AMOUNT;
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
        const flameSize = GameConfig.THRUST.FLAME_BASE + Math.random() * GameConfig.THRUST.FLAME_VARIANCE;
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
        if (thrustParticles.length < GameConfig.THRUST.PARTICLE_COUNT) {
            const angle = ship.angle + Math.PI + (Math.random() - 0.5) * GameConfig.THRUST.PARTICLE_SPREAD;
            addThrustParticle(rearX, rearY, angle, GameConfig.THRUST.PARTICLE_SPEED, ship.thrust.x, ship.thrust.y);
        }
    }
    
    // Draw thrust particles with enhanced rotation and pulsing
    ctx.lineWidth = 1;
    for (let i = thrustParticles.length - 1; i >= 0; i--) {
        const particle = thrustParticles[i];
        const lifeRatio = particle.life / GameConfig.THRUST.PARTICLE_LIFETIME;
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
    
    // Show pause indicator if game is paused
    if (gamePaused) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('PAUSED', canvas.width / 2, 45);
        ctx.fillStyle = 'white'; // Reset color
    }
    
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
        ctx.fillText(`Asteroid Speed: ${Math.round((GameConfig.ASTEROID.BASE_SPEED + Math.min((level - 1) * GameConfig.ASTEROID.SPEED_SCALING, GameConfig.ASTEROID.MAX_SPEED - GameConfig.ASTEROID.BASE_SPEED)) * 100)}%`, canvas.width / 2, canvas.height / 2 + 60);
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
    if (highScores.length < GameConfig.SCORE.HIGH_SCORE_COUNT) return actualScore > 0;
    
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
        timePlayed: Date.now() - lastScoreSubmitTime,
        // Add more verification data
        lives: lives,
        asteroidsDestroyed: asteroidsDestroyed || 0,
        aliensDestroyed: aliensDestroyed || 0,
        bulletsFired: bulletsFired || 0,
        gameVersion: '1.2.0', // For version tracking
        sessionId: sessionId || Date.now().toString(36), // Unique session identifier
        // Add client fingerprint for additional verification
        clientInfo: {
            userAgent: navigator.userAgent,
            screenSize: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
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
                x: Math.random() * GameConfig.ASTEROID.BASE_SPEED - GameConfig.ASTEROID.BASE_SPEED/2,
                y: Math.random() * GameConfig.ASTEROID.BASE_SPEED - GameConfig.ASTEROID.BASE_SPEED/2
            }
        });
        
        // Create the asteroid's shape (offset array)
        for (let j = 0; j < welcomeAsteroids[i].vert; j++) {
            welcomeAsteroids[i].offset.push(
                Math.random() * GameConfig.ASTEROID.JAG * 2 + 1 - GameConfig.ASTEROID.JAG
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
    for (let i = 0; i < GameConfig.ALIEN.MAX_COUNT; i++) {
        if (Math.random() < GameConfig.ALIEN.SPAWN_CHANCE) {
            aliens.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                dx: Math.random() * GameConfig.ALIEN.SPEED * 2 - GameConfig.ALIEN.SPEED,
                dy: Math.random() * GameConfig.ALIEN.SPEED * 2 - GameConfig.ALIEN.SPEED,
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
    // Only spawn new aliens if we're past level 1, but still allow updating existing aliens
    if (level <= 1 && !forceAliensInLevel1) {
        // Skip automatic spawning in level 1, but continue to allow manually created aliens to be updated
        // This allows debug-spawned aliens to work properly in level 1
    } else {
        // Timer-based spawn system scales with game progression
        if (alienSpawnTimer > 0) {
            alienSpawnTimer -= 60 * deltaTime;
            if (alienSpawnTimer <= 0 && aliens.length < ALIEN_MAX_COUNT) {
                createAlien();
                
                // Calculate spawn interval for next alien
                const spawnInterval = Math.max(
                    GameConfig.ALIEN.MIN_SPAWN_INTERVAL,
                    GameConfig.ALIEN.BASE_SPAWN_INTERVAL - (level - 2) * GameConfig.ALIEN.SPAWN_INTERVAL_DECREASE
                );
                alienSpawnTimer = spawnInterval;
            }
        }
    }
    
    // Update each alien's behavior and state (even in level 1 if they exist from debug)
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        
        // Update spawn animation
        if (alien.spawnTime > 0) {
            alien.spawnTime -= 60 * deltaTime;
            alien.scale = 1 - (alien.spawnTime / GameConfig.ALIEN.SPAWN_EFFECT_DURATION);
        }
        
        // Update invulnerability
        if (alien.invulnerable) {
            alien.invulnerableTime -= 60 * deltaTime;
            if (alien.invulnerableTime <= 0) {
                alien.invulnerable = false;
                // Add a flash effect when invulnerability ends
                alienDebris.push({
                    x: alien.x,
                    y: alien.y,
                    radius: 1,
                    maxRadius: GameConfig.ALIEN.SIZE * 2,
                    lifetime: 20,
                    type: 'shockwave',
                    color: '#00FFFF'
                });
            }
        }
        
        // Move alien with deltaTime for consistent speed
        alien.x += alien.dx * 60 * deltaTime;
        alien.y += alien.dy * 60 * deltaTime;
        handleEdgeOfScreen(alien);
        
        // Update direction change timer for unpredictable movement
        alien.directionTimer += 60 * deltaTime;
        if (alien.directionTimer >= GameConfig.ALIEN.CHANGE_DIRECTION_RATE) {
            alien.directionTimer = 0;
            // Choose new random direction and thrust state
            alien.targetAngle = Math.random() * Math.PI * 2;
            alien.thrusting = Math.random() < 0.7; // 70% chance to be moving
        }
        
        // Implement smooth rotation towards target angle
        const angleDiff = (alien.targetAngle - alien.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        if (Math.abs(angleDiff) > 0.01) {
            alien.rotation = Math.sign(angleDiff) * GameConfig.ALIEN.ROTATION_SPEED;
        } else {
            alien.rotation = 0;
        }
        alien.angle += alien.rotation * 60 * deltaTime;
        
        // Apply thrust with the same physics model as the player ship
        if (alien.thrusting) {
            alien.dx += Math.cos(alien.angle) * GameConfig.ALIEN.THRUST * 60 * deltaTime;
            alien.dy += Math.sin(alien.angle) * GameConfig.ALIEN.THRUST * 60 * deltaTime;
        }
        
        // Apply friction to create smooth movement
        const frictionFactor = Math.pow(GameConfig.ALIEN.FRICTION, 60 * deltaTime);
        alien.dx *= frictionFactor;
        alien.dy *= frictionFactor;
        
        // Implement intelligent shooting behavior
        if (!alien.invulnerable && alien.active && ship && !ship.exploding && alienBullets.length < GameConfig.ALIEN.MAX_BULLETS) {
            alien.fireTimer += 60 * deltaTime;
            // Randomize fire rate for unpredictability
            const fireRate = GameConfig.ALIEN.FIRE_RATE_MIN + Math.random() * (GameConfig.ALIEN.FIRE_RATE_MAX - GameConfig.ALIEN.FIRE_RATE_MIN);
            
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
                    dx: Math.cos(finalAngle) * GameConfig.ALIEN.BULLET_SPEED,
                    dy: Math.sin(finalAngle) * GameConfig.ALIEN.BULLET_SPEED,
                    active: true,
                    size: GameConfig.ALIEN.BULLET_SIZE,
                    pulsePhase: 0
                });
                playSound('alienFire');
            }
        }
    }
}

// Create a single new alien
function createAlien() {
    // Determine which edge to spawn from (0=top, 1=right, 2=bottom, 3=left)
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    
    // Position alien just off-screen based on selected edge
    switch (edge) {
        case 0: // Top
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1: // Right
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2: // Bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3: // Left
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }
    
    // Calculate base speed with difficulty scaling
    // Level 2: 75% of max speed, increasing gradually to 100% by level 5
    const difficultyFactor = Math.min(1, 0.75 + Math.max(0, level - 2) * 0.08);
            const baseSpeed = GameConfig.ALIEN.BASE_SPEED * difficultyFactor;
    
    // Calculate fire rate with difficulty scaling
    // Level 2: 60% of max rate, increasing gradually to 100% by level 5
    const fireRateFactor = Math.min(1, 0.6 + Math.max(0, level - 2) * 0.13);
            const fireRate = GameConfig.ALIEN.FIRE_RATE * fireRateFactor;
    
    // Create alien object with adjusted properties based on level
    const alien = {
        x,
        y,
        dx: 0, // Initial velocity X
        dy: 0, // Initial velocity Y
        angle: Math.random() * Math.PI * 2, // Random initial angle
        rotation: 0, // Current rotation speed
        targetAngle: Math.random() * Math.PI * 2, // Target angle for rotation
        fireTimer: 0, // Fire timer for shooting
        directionTimer: 0, // Timer for direction changes
        active: true, // Active state
        thrusting: Math.random() < 0.7, // 70% chance to be thrusting initially
        spawnTime: GameConfig.ALIEN.SPAWN_EFFECT_DURATION, // Spawn animation timer
        scale: 0, // Initial scale for spawn effect
        invulnerable: true, // Start invulnerable
        invulnerableTime: GameConfig.ALIEN.INVULNERABILITY_TIME, // Invulnerability timer
        health: 1 + Math.floor((level - 1) / 3), // Health increases every 3 levels
        scoreValue: 500 * (1 + Math.floor((level - 1) / 2)) // Score value increases every 2 levels
    };
    
    // Set initial target for alien to move toward
    updateAlienTarget(alien);
    
    // Add to aliens array
    aliens.push(alien);
    
    // Play sound effect
    playSound('alienSpawn');
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
        ctx.moveTo(-GameConfig.ALIEN.SIZE, 0);
        ctx.lineTo(-GameConfig.ALIEN.SIZE/2, -GameConfig.ALIEN.SIZE/2);
        ctx.lineTo(GameConfig.ALIEN.SIZE/2, -GameConfig.ALIEN.SIZE/2);
        ctx.lineTo(GameConfig.ALIEN.SIZE, 0);
        ctx.lineTo(GameConfig.ALIEN.SIZE/2, GameConfig.ALIEN.SIZE/2);
        ctx.lineTo(-GameConfig.ALIEN.SIZE/2, GameConfig.ALIEN.SIZE/2);
        ctx.closePath();
        ctx.stroke();

        // Draw cockpit
        ctx.beginPath();
        ctx.arc(0, 0, GameConfig.ALIEN.SIZE/4, 0, Math.PI * 2);
        ctx.stroke();

        // Draw invulnerability shield effect
        if (alien.invulnerable) {
            ctx.beginPath();
            ctx.arc(0, 0, GameConfig.ALIEN.SIZE * 1.2, 0, Math.PI * 2);
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
            ctx.moveTo(-GameConfig.ALIEN.SIZE, -GameConfig.ALIEN.SIZE/4);
            ctx.lineTo(-GameConfig.ALIEN.SIZE - GameConfig.ALIEN.SIZE * flameSize, 0);
            ctx.lineTo(-GameConfig.ALIEN.SIZE, GameConfig.ALIEN.SIZE/4);
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
        
        // Move bullet with deltaTime for consistent speed
        bullet.x += bullet.dx * 60 * deltaTime;
        bullet.y += bullet.dy * 60 * deltaTime;

        // Update pulse animation with deltaTime
        bullet.pulsePhase = (bullet.pulsePhase + GameConfig.ALIEN.BULLET_PULSE_SPEED * 60 * deltaTime) % (Math.PI * 2);
        bullet.size = GameConfig.ALIEN.BULLET_SIZE * (1 + 0.2 * Math.sin(bullet.pulsePhase));

        // Update lifetime
        if (bullet.lifetime !== undefined) {
            bullet.lifetime -= 60 * deltaTime;
            if (bullet.lifetime <= 0) {
                bullet.active = false;
                continue;
            }
        }

        // Remove if off screen (fallback for bullets without lifetime)
        if (bullet.x < 0 || bullet.x > canvas.width || 
            bullet.y < 0 || bullet.y > canvas.height) {
            bullet.active = false;
            continue;
        }

        // Check collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (distBetweenPoints(bullet.x, bullet.y, asteroids[j].x, asteroids[j].y) < asteroids[j].radius) {
                bullet.active = false;
                
                // Calculate collision angle for debris direction
                const collisionAngle = Math.atan2(bullet.y - asteroids[j].y, bullet.x - asteroids[j].x);
                
                // Destroy the asteroid
                destroyAsteroid(j, collisionAngle);
                
                // Play sound
                playSound('bangSmall');
                break;
            }
        }

        // Check collision with player
        if (ship && !ship.exploding && !ship.invulnerable) {
            if (distBetweenPoints(bullet.x, bullet.y, ship.x, ship.y) < GameConfig.SHIP.SIZE) {
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
        life: GameConfig.THRUST.PARTICLE_LIFETIME,
        rotation: Math.random() * Math.PI * 2,        // Random initial rotation
        rotationSpeed: (Math.random() - 0.5) * 0.4,  // Increased rotation speed
        pulseOffset: Math.random() * Math.PI * 2,     // Random pulse phase
        baseSize: GameConfig.THRUST.PARTICLE_SIZE * (0.7 + Math.random() * 0.6)
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
        score += GameConfig.ALIEN.POINTS;
        // Use the createScorePopup function instead of direct push
        createScorePopup(alien.x, alien.y, GameConfig.ALIEN.POINTS, false);
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
            const speed = GameConfig.ASTEROID.BASE_SPEED * (4 - asteroid.size) * 0.5;
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
    
    // Add score
    score += points;
    
    // Create score popup with random offset to avoid obscuring the debris and child asteroids
    const offsetX = (Math.random() * 2 - 1) * 25; // Random offset between -25 and 25 pixels
    const offsetY = (Math.random() * 2 - 1) * 25;
    createScorePopup(asteroid.x + offsetX, asteroid.y + offsetY, points, false);
    
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
        } else if (level >= 3 && level % 3 === 0) {
            ctx.font = '24px "Press Start 2P"';
            ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
            ctx.fillText('BATTLESTAR APPROACHING!', 0, 50);
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText('EXTREME THREAT LEVEL', 0, 80);
        }
        
        ctx.restore();
    }
}

// Remove the transition state variable since we're using a simpler approach

// Create a battlestar boss ship
function createBattlestar() {
    // Randomly choose which side to spawn from (left or right)
    const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
    
    // Set position based on spawn side - now partially on screen
    const x = spawnSide === 'left' ? GameConfig.BATTLESTAR.WIDTH * 0.25 : canvas.width - GameConfig.BATTLESTAR.WIDTH * 0.25;
    const y = canvas.height * (0.25 + Math.random() * 0.5); // Spawn in middle 50% of screen height
    
    // Direction depends on spawn side
    const direction = spawnSide === 'left' ? 1 : -1;
    
    // Create spawn effects - shockwave
    battlestarDebris.push({
        x: x,
        y: y,
        radius: 1,
                    maxRadius: GameConfig.BATTLESTAR.WIDTH * 2,
        lifetime: 60,
        type: 'shockwave',
        color: '#FF0000'
    });
    
    // Add a second inner shockwave with different color
    battlestarDebris.push({
        x: x,
        y: y,
        radius: 1,
                    maxRadius: GameConfig.BATTLESTAR.WIDTH,
        lifetime: 75, // Slightly longer to create layered effect
        type: 'shockwave',
        color: '#FFFF00'
    });
    
    // Create more dramatic spawn particles
    for (let i = 0; i < 50; i++) { // Increased from 30 to 50
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * GameConfig.BATTLESTAR.WIDTH * 1.2; // Increased range
        
        battlestarDebris.push({
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            vx: Math.cos(angle) * (Math.random() * 3), // Faster particles
            vy: Math.sin(angle) * (Math.random() * 3),
            size: 2 + Math.random() * 4, // Larger particles
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3, // Faster rotation
            lifetime: 60 + Math.random() * 60, // Longer lifetimes
            color: Math.random() < 0.3 ? '#FFFFFF' : (Math.random() < 0.6 ? '#FF0000' : '#FFFF00'), // More color variety
            type: Math.random() < 0.6 ? 'circle' : 'line'
        });
    }
    
    // Create cannons at spread-out positions
    const cannons = [];
    for (let i = 0; i < GameConfig.BATTLESTAR.CANNON_COUNT; i++) {
        // Position cannons along the battlestar's length
        const xOffset = (i / (GameConfig.BATTLESTAR.CANNON_COUNT - 1) - 0.5) * GameConfig.BATTLESTAR.WIDTH * 0.8;
        // Alternate cannons above and below centerline
        const yOffset = (i % 2 === 0 ? -1 : 1) * GameConfig.BATTLESTAR.HEIGHT * 0.3;
        
        cannons.push({
            x: xOffset,
            y: yOffset,
            fireTimer: Math.floor(Math.random() * GameConfig.BATTLESTAR.FIRE_RATE), // Stagger firing
            damaged: false,
            rotation: 0 // Add rotation property for cannon
        });
    }
    
    // Create the battlestar object with both x and y velocity components
    battlestar = {
        x: x,
        y: y,
        dx: direction * GameConfig.BATTLESTAR.SPEED,
        dy: 0, // Initialize vertical velocity to zero
        width: GameConfig.BATTLESTAR.WIDTH,
        height: GameConfig.BATTLESTAR.HEIGHT,
        health: GameConfig.BATTLESTAR.MAX_HEALTH,
        maxHealth: GameConfig.BATTLESTAR.MAX_HEALTH,
        invulnerable: true,
        invulnerableTime: GameConfig.BATTLESTAR.INVULNERABILITY_TIME,
        damageState: 0, // 0 = least damaged, 2 = most damaged
        cannons: cannons,
        spawnTime: 120, // Increased from 60 to 120 for longer spawn animation
        scale: 0, // Start small for spawn animation
        dying: false, // Death animation flag
        deathTimer: 0, // For coordinating death animation
        explosionPhase: 0 // For sequential explosions during death
    };
    
    // Play dramatic sound sequence
    playSound('bangLarge');
    
    // Schedule additional sounds for layered effect
    setTimeout(() => {
        playSound('bangMedium');
    }, 250);
    
    setTimeout(() => {
        playSound('explode');
    }, 500);
    
    addLogMessage('WARNING! Battlestar detected!');
}

// Update battlestar position, state, and behavior
function updateBattlestar() {
    if (!battlestar) return;
    
    // Skip updates if dying and handle death animation
    if (battlestar.dying) {
        battlestar.deathTimer += 60 * deltaTime;
        
        // Create sequential explosions during death animation
        if (battlestar.deathTimer % 10 < 60 * deltaTime && battlestar.explosionPhase < 6) {
            battlestar.explosionPhase++;
            
            // Create explosion at random position on the battlestar
            const offsetX = (Math.random() - 0.5) * battlestar.width * 0.8;
            const offsetY = (Math.random() - 0.5) * battlestar.height * 0.8;
            
            // Add explosion debris
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 3;
                
                battlestarDebris.push({
                    x: battlestar.x + offsetX,
                    y: battlestar.y + offsetY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    lifetime: 30 + Math.random() * 60,
                    color: Math.random() < 0.3 ? '#FFFFFF' : (Math.random() < 0.5 ? '#FF0000' : '#FFFF00'),
                    type: Math.random() < 0.7 ? 'circle' : 'line'
                });
            }
            
            // Add shockwave effect
            battlestarDebris.push({
                x: battlestar.x + offsetX,
                y: battlestar.y + offsetY,
                radius: 1,
                maxRadius: 30 + Math.random() * 20,
                lifetime: 30,
                type: 'shockwave',
                color: Math.random() < 0.5 ? '#FF0000' : '#FFFF00'
            });
            
            // Play explosion sound
            playSound('bangLarge');
        }
        
        // Final explosion when death animation completes
        if (battlestar.deathTimer >= GameConfig.BATTLESTAR.EXPLOSION_DURATION) {
            // Create massive explosion at battlestar's position
            for (let i = 0; i < GameConfig.BATTLESTAR.EXPLOSION_PARTICLES; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * battlestar.width * 0.5;
                const speed = 2 + Math.random() * 5;
                
                battlestarDebris.push({
                    x: battlestar.x + Math.cos(angle) * distance,
                    y: battlestar.y + Math.sin(angle) * distance,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 5,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.4,
                    lifetime: 60 + Math.random() * 120,
                    color: Math.random() < 0.3 ? '#FFFFFF' : (Math.random() < 0.5 ? '#FF0000' : '#FFFF00'),
                    type: Math.random() < 0.5 ? 'circle' : 'line'
                });
            }
            
            // Add a final shockwave
            battlestarDebris.push({
                x: battlestar.x,
                y: battlestar.y,
                radius: 1,
                maxRadius: battlestar.width * 2,
                lifetime: 60,
                type: 'shockwave',
                color: '#FFFFFF'
            });
            
            // Add score
            score += GameConfig.BATTLESTAR.POINTS;
            // Create a score popup directly for guaranteed correct display
            createScorePopup(battlestar.x, battlestar.y, GameConfig.BATTLESTAR.POINTS, false);
            
            // Play explosion sound
            playSound('explode');
            
            // Remove battlestar
            battlestar = null;
            addLogMessage('Battlestar destroyed! Earned ' + GameConfig.BATTLESTAR.POINTS + ' points!');
        }
        
        return;
    }
    
    // Update spawn animation
    if (battlestar.spawnTime > 0) {
        battlestar.spawnTime -= 60 * deltaTime;
        battlestar.scale = 1 - battlestar.spawnTime / 120; // Grow from 0 to 1 over 120 frames
        
        if (battlestar.spawnTime <= 0) {
            battlestar.scale = 1;
            battlestar.invulnerable = false;
            addLogMessage('Battlestar fully operational. Use caution!');
        }
        
        return; // Skip movement during spawn animation
    }
    
    // Ensure the battlestar has vertical velocity property
    if (battlestar.dy === undefined) {
        battlestar.dy = 0;
    }
    
    // Update battlestar position using deltaTime for both x and y movement
    battlestar.x += battlestar.dx * 60 * deltaTime;
    battlestar.y += battlestar.dy * 60 * deltaTime;
    
    // Apply gentle dampening to vertical movement to prevent perpetual oscillation
    battlestar.dy *= Math.pow(0.95, 60 * deltaTime);
    
    // Handle screen edges with improved bounce logic
    const halfWidth = battlestar.width / 2;
    const halfHeight = battlestar.height / 2;
    
    // Handle horizontal bouncing - only bounce at screen edges
    if ((battlestar.x < halfWidth && battlestar.dx < 0) || 
        (battlestar.x > canvas.width - halfWidth && battlestar.dx > 0)) {
        // Reverse direction and add gradual vertical movement for variation
        battlestar.dx *= -1;
        
        // Add a gentle vertical impulse instead of an immediate position change
        // This makes the movement look smoother and more natural
        battlestar.dy += (Math.random() - 0.5) * 2; // Smaller impulse for smoother movement
        
        // Play a sound for the bounce
        playSound('bangSmall');
        
        // Add a small visual effect
        battlestarDebris.push({
            x: battlestar.x + (battlestar.dx > 0 ? -halfWidth : halfWidth),
            y: battlestar.y,
            radius: 1,
            maxRadius: 30,
            lifetime: 30,
            type: 'shockwave',
            color: '#FFFFFF'
        });
    }
    
    // Keep within vertical bounds with soft bouncing
    if (battlestar.y < halfHeight) {
        battlestar.y = halfHeight;
        battlestar.dy = Math.abs(battlestar.dy) * 0.8; // Bounce back with dampening
    } else if (battlestar.y > canvas.height - halfHeight) {
        battlestar.y = canvas.height - halfHeight;
        battlestar.dy = -Math.abs(battlestar.dy) * 0.8; // Bounce back with dampening
    }
    
    // Update cannon fire logic
    if (ship && !ship.exploding) {
        battlestar.cannons.forEach(cannon => {
            if (!cannon.damaged) {
                // Update fire timer
                cannon.fireTimer += 60 * deltaTime;
                
                // Calculate world position of cannon
                const cannonX = battlestar.x + cannon.x;
                const cannonY = battlestar.y + cannon.y;
                
                // Calculate direction to player with advanced targeting
                const dx = ship.x - cannonX;
                const dy = ship.y - cannonY;
                let angle = Math.atan2(dy, dx);
                
                // Add slight spread for easier gameplay
                angle += (Math.random() - 0.5) * 0.2;
                
                // Update cannon rotation to smoothly face the target
                const rotationSpeed = 0.1;
                // Normalize angle difference to [-PI, PI]
                let angleDiff = angle - cannon.rotation;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                // Apply smooth rotation
                cannon.rotation += angleDiff * rotationSpeed;
                
                // Fire when ready
                if (cannon.fireTimer >= GameConfig.BATTLESTAR.FIRE_RATE) {
                    cannon.fireTimer = 0;
                    
                    // Create bullet - use cannon's current rotation
                    battlestarBullets.push({
                        x: cannonX,
                        y: cannonY,
                        dx: Math.cos(cannon.rotation) * GameConfig.BATTLESTAR.BULLET_SPEED,
                        dy: Math.sin(cannon.rotation) * GameConfig.BATTLESTAR.BULLET_SPEED,
                        active: true,
                        size: 3 + Math.random() * 2,
                        pulsePhase: Math.random() * Math.PI * 2
                    });
                    
                    // Play fire sound with pitch variation
                    playSound('fire');
                }
            }
        });
    }
}

// Update battlestar bullets
function updateBattlestarBullets() {
    // Remove inactive bullets first
    battlestarBullets = battlestarBullets.filter(bullet => bullet.active);

    // Update all existing bullets
    for (let i = battlestarBullets.length - 1; i >= 0; i--) {
        const bullet = battlestarBullets[i];
        
        // Move bullet with deltaTime for consistent speed
        bullet.x += bullet.dx * 60 * deltaTime;
        bullet.y += bullet.dy * 60 * deltaTime;

        // Update pulse animation with deltaTime
        bullet.pulsePhase = (bullet.pulsePhase + 0.2 * 60 * deltaTime) % (Math.PI * 2);
        bullet.size = GameConfig.BATTLESTAR.BULLET_SIZE * (1 + 0.2 * Math.sin(bullet.pulsePhase));

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
                
                // Calculate collision angle for debris direction
                const collisionAngle = Math.atan2(bullet.y - asteroids[j].y, bullet.x - asteroids[j].x);
                
                // Destroy the asteroid
                destroyAsteroid(j, collisionAngle);
                
                // Play sound
                playSound('bangSmall');
                break;
            }
        }

        // Check collision with player
        if (ship && !ship.exploding && !ship.invulnerable) {
            if (distBetweenPoints(bullet.x, bullet.y, ship.x, ship.y) < GameConfig.SHIP.SIZE) {
                bullet.active = false;
                destroyShip();
            }
        }
    }
}

// Update battlestar debris
function updateBattlestarDebris() {
    for (let i = battlestarDebris.length - 1; i >= 0; i--) {
        const debris = battlestarDebris[i];
        
        // Update position
        if (debris.vx !== undefined && debris.vy !== undefined) {
            debris.x += debris.vx * 60 * deltaTime;
            debris.y += debris.vy * 60 * deltaTime;
        }
        
        // Update rotation
        if (debris.rotationSpeed !== undefined) {
            debris.rotation += debris.rotationSpeed * 60 * deltaTime;
        }
        
        // Update shockwave radius
        if (debris.type === 'shockwave' && debris.radius < debris.maxRadius) {
            debris.radius += (debris.maxRadius - debris.radius) * 0.1 * 60 * deltaTime;
        }
        
        // Decrement lifetime
        debris.lifetime -= 60 * deltaTime;
        
        // Remove expired debris
        if (debris.lifetime <= 0) {
            battlestarDebris.splice(i, 1);
        }
    }
}

// Draw battlestar
function drawBattlestar() {
    if (!battlestar) return;
    
    ctx.save();
    
    // Apply spawn scaling effect
    if (battlestar.spawnTime > 0) {
        ctx.translate(battlestar.x, battlestar.y);
        ctx.scale(battlestar.scale, battlestar.scale);
        ctx.translate(-battlestar.x, -battlestar.y);
    }
    
    // Translate to battlestar position
    ctx.translate(battlestar.x, battlestar.y);
    
    // Flash effect for invulnerability
    if (battlestar.invulnerable) {
        ctx.strokeStyle = `hsl(${frameCount * 10 % 360}, 100%, 50%)`;
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.2) * 0.5;
    } else {
        ctx.strokeStyle = 'white';
        
        // Add damage-based color
        if (battlestar.damageState > 0) {
            ctx.strokeStyle = `rgb(255, ${255 - battlestar.damageState * 60}, ${255 - battlestar.damageState * 80})`;
        }
    }
    
    // Apply dying effect (shake)
    if (battlestar.dying) {
        const shakeX = (Math.random() - 0.5) * 5;
        const shakeY = (Math.random() - 0.5) * 5;
        ctx.translate(shakeX, shakeY);
    }
    
    ctx.lineWidth = 2;
    
    // Draw battlestar hull
    ctx.beginPath();
    ctx.moveTo(-battlestar.width/2, -battlestar.height/2);
    ctx.lineTo(battlestar.width/2, -battlestar.height/2);
    ctx.lineTo(battlestar.width/2 + 20, 0);
    ctx.lineTo(battlestar.width/2, battlestar.height/2);
    ctx.lineTo(-battlestar.width/2, battlestar.height/2);
    ctx.lineTo(-battlestar.width/2 - 20, 0);
    ctx.closePath();
    ctx.stroke();
    
    // Draw armor plating
    const plateCount = 5;
    const plateWidth = battlestar.width / plateCount;
    
    for (let i = 0; i < plateCount; i++) {
        const plateX = -battlestar.width/2 + i * plateWidth;
        
        // Skip some plates for damage effect
        if (battlestar.damageState > 0 && 
            ((battlestar.damageState === 1 && i === 1) || 
             (battlestar.damageState === 2 && (i === 1 || i === 3)) ||
             (battlestar.damageState === 3 && (i === 1 || i === 2 || i === 4)))) {
            
            // Draw damage effect (bent/broken plates)
            ctx.beginPath();
            ctx.moveTo(plateX, -battlestar.height/2);
            ctx.lineTo(plateX + plateWidth * 0.7, -battlestar.height/2);
            ctx.lineTo(plateX + plateWidth * 0.5, -battlestar.height/4);
            ctx.lineTo(plateX, -battlestar.height/3);
            ctx.closePath();
            ctx.stroke();
            
            // Add some damage debris for the worst damage state
            if (battlestar.damageState === 3 && Math.random() < 0.05) {
                battlestarDebris.push({
                    x: battlestar.x + plateX + plateWidth/2,
                    y: battlestar.y - battlestar.height/4,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    size: 1 + Math.random() * 2,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    lifetime: 20 + Math.random() * 10,
                    color: '#FF0000',
                    type: 'circle'
                });
            }
            
            continue;
        }
        
        // Upper plate
        ctx.beginPath();
        ctx.moveTo(plateX, -battlestar.height/2);
        ctx.lineTo(plateX + plateWidth, -battlestar.height/2);
        ctx.lineTo(plateX + plateWidth, -battlestar.height/6);
        ctx.lineTo(plateX, -battlestar.height/6);
        ctx.closePath();
        ctx.stroke();
        
        // Lower plate
        ctx.beginPath();
        ctx.moveTo(plateX, battlestar.height/6);
        ctx.lineTo(plateX + plateWidth, battlestar.height/6);
        ctx.lineTo(plateX + plateWidth, battlestar.height/2);
        ctx.lineTo(plateX, battlestar.height/2);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Draw bridge
    ctx.beginPath();
    ctx.arc(0, 0, battlestar.height/6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw energy core (changes color based on damage)
    const coreColor = battlestar.damageState === 0 ? '#00FFFF' : 
                     (battlestar.damageState === 1 ? '#FFFF00' : 
                     (battlestar.damageState === 2 ? '#FFA500' : '#FF0000'));
    
    ctx.beginPath();
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = 0.7 + Math.sin(frameCount * 0.1) * 0.3;
    ctx.arc(0, 0, battlestar.height/10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw cannons
    for (let i = 0; i < battlestar.cannons.length; i++) {
        const cannon = battlestar.cannons[i];
        
        // Skip drawing if cannon is damaged
        if (cannon.damaged) continue;
        
        // Save context for cannon rotation
        ctx.save();
        ctx.translate(cannon.x, cannon.y);
        ctx.rotate(cannon.rotation);
        
        // Draw cannon base
        ctx.beginPath();
        ctx.moveTo(-7.5, -5);
        ctx.lineTo(7.5, -5);
        ctx.lineTo(7.5, 5);
        ctx.lineTo(-7.5, 5);
        ctx.closePath();
        ctx.stroke();
        
        // Draw cannon barrel
        ctx.beginPath();
        ctx.moveTo(7.5, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        
        // Restore context
        ctx.restore();
    }
    
    // Draw health bar
    const healthBarWidth = battlestar.width * 0.8;
    const healthPercent = battlestar.health / battlestar.maxHealth;
    
    ctx.beginPath();
    ctx.rect(-healthBarWidth/2, -battlestar.height/2 - 20, healthBarWidth, 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.fillStyle = battlestar.damageState === 0 ? '#00FF00' : 
                   (battlestar.damageState === 1 ? '#FFFF00' : 
                   (battlestar.damageState === 2 ? '#FFA500' : '#FF0000'));
    ctx.rect(-healthBarWidth/2, -battlestar.height/2 - 20, healthBarWidth * healthPercent, 10);
    ctx.fill();
    
    ctx.restore();
}

// Draw battlestar bullets
function drawBattlestarBullets() {
    ctx.fillStyle = '#FF0000';
    
    for (let i = 0; i < battlestarBullets.length; i++) {
        const bullet = battlestarBullets[i];
        
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
        ctx.arc(bullet.x, bullet.y, bullet.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FF0000';
    }
}

// Draw battlestar debris
function drawBattlestarDebris() {
    for (let i = 0; i < battlestarDebris.length; i++) {
        const debris = battlestarDebris[i];
        
        ctx.save();
        
        if (debris.type === 'shockwave') {
            // Draw expanding shockwave
            const alpha = debris.lifetime / 60; // Fade out based on lifetime
            ctx.strokeStyle = debris.color || '#FF0000';
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(debris.x, debris.y, debris.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (debris.type === 'ray') {
            // Draw ray effect for level completion
            const progress = 1 - (debris.lifetime / 120); // Normalized progress (0 to 1)
            const alpha = 1 - (progress * progress); // Quadratic fade out
            const currentLength = debris.length * (1 - progress * 0.3); // Shrink slightly as it fades
            
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = debris.color || '#FFFF00';
            ctx.lineWidth = debris.size + (debris.maxSize - debris.size) * progress;
            
            ctx.beginPath();
            ctx.moveTo(debris.x, debris.y);
            ctx.lineTo(
                debris.x + Math.cos(debris.angle) * currentLength,
                debris.y + Math.sin(debris.angle) * currentLength
            );
            ctx.stroke();
        } else {
            // Draw normal debris
            ctx.translate(debris.x, debris.y);
            ctx.rotate(debris.rotation);
            
            // Fade out as lifetime decreases
            ctx.globalAlpha = debris.lifetime / 60;
            
            if (debris.type === 'circle') {
                ctx.fillStyle = debris.color || '#FF0000';
                ctx.beginPath();
                ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
                ctx.fill();
            } else { // line type
                ctx.strokeStyle = debris.color || '#FF0000';
                ctx.beginPath();
                ctx.moveTo(-debris.size, 0);
                ctx.lineTo(debris.size, 0);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

// Deal damage to the battlestar
function damageBattlestar(damage = 1, collisionAngle = null) {
    if (!battlestar || battlestar.invulnerable || battlestar.dying) return;
    
    battlestar.health -= damage;
    
    // Add impact effect
    const impactX = battlestar.x + Math.cos(collisionAngle || 0) * battlestar.width/2;
    const impactY = battlestar.y + Math.sin(collisionAngle || 0) * battlestar.height/2;
    
    // Create impact debris
    for (let i = 0; i < 10; i++) {
        const angle = (collisionAngle || 0) + (Math.random() - 0.5) * Math.PI;
        const speed = 1 + Math.random() * 2;
        
        battlestarDebris.push({
            x: impactX,
            y: impactY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1 + Math.random() * 3,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            lifetime: 30 + Math.random() * 30,
            color: Math.random() < 0.5 ? '#FFFF00' : '#FF0000',
            type: Math.random() < 0.5 ? 'circle' : 'line'
        });
    }
    
    // Add a shockwave
    battlestarDebris.push({
        x: impactX,
        y: impactY,
        radius: 1,
        maxRadius: 20,
        lifetime: 20,
        type: 'shockwave',
        color: '#FFFF00'
    });
    
    // Play hit sound
    playSound('bangMedium');
    
    // Create a score popup for the hit - using direct creation for guaranteed upright display
    createScorePopup(impactX, impactY, 100, false);
    
    // Add score
    score += 100;
    
    // Check if battlestar is destroyed
    if (battlestar.health <= 0) {
        startBattlestarDeathSequence();
    } else {
        // Damage a cannon at random if health is below thresholds
        if (battlestar.health === GameConfig.BATTLESTAR.DAMAGE_THRESHOLDS[0] || 
            battlestar.health === GameConfig.BATTLESTAR.DAMAGE_THRESHOLDS[1] || 
            battlestar.health === GameConfig.BATTLESTAR.DAMAGE_THRESHOLDS[2]) {
            
            // Find undamaged cannons
            const undamagedCannons = battlestar.cannons.filter(cannon => !cannon.damaged);
            
            if (undamagedCannons.length > 0) {
                // Damage a random cannon
                const randomIndex = Math.floor(Math.random() * undamagedCannons.length);
                undamagedCannons[randomIndex].damaged = true;
                
                // Create explosion at cannon position
                const cannonX = battlestar.x + undamagedCannons[randomIndex].x;
                const cannonY = battlestar.y + undamagedCannons[randomIndex].y;
                
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 3;
                    
                    battlestarDebris.push({
                        x: cannonX,
                        y: cannonY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 2 + Math.random() * 3,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.3,
                        lifetime: 40 + Math.random() * 20,
                        color: Math.random() < 0.3 ? '#FFFFFF' : (Math.random() < 0.6 ? '#FFFF00' : '#FF0000'),
                        type: Math.random() < 0.6 ? 'circle' : 'line'
                    });
                }
                
                // Add a shockwave
                battlestarDebris.push({
                    x: cannonX,
                    y: cannonY,
                    radius: 1,
                    maxRadius: 30,
                    lifetime: 30,
                    type: 'shockwave',
                    color: '#FF0000'
                });
                
                // Play explosion sound
                playSound('bangLarge');
                
                addLogMessage('Battlestar cannon destroyed!');
            }
        }
    }
}

// Start the battlestar death sequence
function startBattlestarDeathSequence() {
    battlestar.dying = true;
    battlestar.deathTimer = 0;
    
    addLogMessage('Battlestar critically damaged!');
    
    // Disable all cannons
    battlestar.cannons.forEach(cannon => {
        cannon.damaged = true;
    });
    
    // Play alert sound
    playSound('bangLarge');
}  

// Helper function to update alien target position
function updateAlienTarget(alien) {
    // Set a new target somewhere on screen
    alien.targetX = Math.random() * canvas.width;
    alien.targetY = Math.random() * canvas.height;
    
    // Update the time for next direction change
    alien.lastDirectionChange = performance.now();
    alien.directionChangeInterval = 2000 + Math.random() * 2000;
}

// Update all aliens
function updateAliens() {
    const currentTime = performance.now();
    
    aliens.forEach((alien, index) => {
        // Check if it's time to change direction
        if (currentTime - alien.lastDirectionChange > alien.directionChangeInterval) {
            updateAlienTarget(alien);
        }
        
        // Calculate direction to target
        const dx = alien.targetX - alien.x;
        const dy = alien.targetY - alien.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If near target, pick a new one
        if (distance < 50) {
            updateAlienTarget(alien);
        }
        
        // Set speed towards target
        if (distance > 0) {
            alien.speedX = (dx / distance) * alien.baseSpeed;
            alien.speedY = (dy / distance) * alien.baseSpeed;
        }
        
        // Move the alien
        alien.x += alien.speedX * deltaTime;
        alien.y += alien.speedY * deltaTime;
        
        // Keep in bounds
        handleEdgeOfScreen(alien);
        
        // Fire at player with a random chance based on fire rate
        if (Math.random() < alien.fireRate * deltaTime && ship && !ship.exploding) {
            // Calculate angle to player
            const playerAngle = Math.atan2(ship.y - alien.y, ship.x - alien.x);
            
            // Add some randomness to the firing angle based on fireSpread
            const spreadAngle = playerAngle + (Math.random() * 2 - 1) * alien.fireSpread;
            
            // Create alien bullet
            alienBullets.push({
                x: alien.x,
                y: alien.y,
                                    dx: Math.cos(spreadAngle) * GameConfig.ALIEN.BULLET_SPEED,
                    dy: Math.sin(spreadAngle) * GameConfig.ALIEN.BULLET_SPEED,
                    active: true,
                    size: GameConfig.ALIEN.BULLET_SIZE,
                    pulsePhase: 0,
                    radius: 3,
                    lifetime: GameConfig.ALIEN.BULLET_LIFETIME
            });
            
            // Play sound
            playSound('alienFire');
        }
    });
}  

// Draw debug information on screen
function drawDebugInfo() {
    if (!showDebugInfo) return;
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 300, 200);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 300, 200);
    
    // Debug text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'left';
    
    let y = 30;
    const lineHeight = 18;
    
    // Audio info
    const soundCount = soundNodes ? Object.keys(soundNodes).length : 0;
    const audioState = audioContext ? audioContext.state : 'null';
    const sampleRate = audioContext ? audioContext.sampleRate : 0;
    
    ctx.fillText(`AUDIO DEBUG INFO:`, 20, y);
    y += lineHeight;
    ctx.fillText(`Sound Nodes: ${soundCount}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Audio State: ${audioState}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Sample Rate: ${sampleRate}Hz`, 20, y);
    y += lineHeight;
    
    // Sound node breakdown
    if (soundNodes && soundCount > 0) {
        ctx.fillText(`Node Types:`, 20, y);
        y += lineHeight;
        Object.keys(soundNodes).forEach(key => {
            const node = soundNodes[key];
            const age = node._createdAt ? Math.round((Date.now() - node._createdAt) / 1000) : '?';
            ctx.fillText(`  ${key}: ${age}s old`, 20, y);
            y += lineHeight;
        });
    }
    
    // Game state info
    ctx.fillText(`GAME STATE:`, 20, y);
    y += lineHeight;
    ctx.fillText(`Level: ${level}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Score: ${score}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Lives: ${lives}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Frame: ${frameCount}`, 20, y);
    y += lineHeight;
    
    // Object counts
    ctx.fillText(`OBJECTS:`, 20, y);
    y += lineHeight;
    ctx.fillText(`Asteroids: ${asteroids.length}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Aliens: ${aliens.length}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Bullets: ${bullets.length}`, 20, y);
    y += lineHeight;
    ctx.fillText(`Alien Bullets: ${alienBullets.length}`, 20, y);
    y += lineHeight;
    
    // Performance info
    const fps = deltaTime > 0 ? Math.round(1 / deltaTime) : 0;
    ctx.fillText(`FPS: ${fps}`, 20, y);
    y += lineHeight;
    
    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.fillText(`Press D to hide`, 20, y);
}

// Function to create fallback audio system
function createFallbackAudioSystem() {
    // Don't create fallback if AudioWorklet is already loaded
    if (window.audioWorkletLoaded) {
        console.log('AudioWorklet is loaded, skipping fallback system creation');
        return;
    }
    
    window.audioWorkletLoaded = false;
    
    // Try to create a fallback audio system using Web Audio API
    console.log('Attempting to create fallback audio system...');
    try {
        // Create simple sound generators using Web Audio API
        const createSound = (frequency, duration, type = 'sine') => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
        
        // Create fallback sound objects
        soundFX = {
            fire: { 
                play: () => createSound(1200, 0.2, 'square'),
                currentTime: 0
            },
            thrust: { 
                play: () => {
                    // Create continuous thrust sound
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
                    oscillator.type = 'sawtooth';
                    
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    
                    oscillator.start(audioContext.currentTime);
                    
                    // Store for stopping later
                    soundFX.thrust._oscillator = oscillator;
                    soundFX.thrust._gainNode = gainNode;
                },
                pause: () => {
                    if (soundFX.thrust._oscillator) {
                        soundFX.thrust._oscillator.stop();
                        soundFX.thrust._oscillator = null;
                    }
                },
                currentTime: 0
            },
            bangLarge: { 
                play: () => createSound(80, 0.8, 'sawtooth'),
                currentTime: 0
            },
            bangMedium: { 
                play: () => createSound(150, 0.5, 'sawtooth'),
                currentTime: 0
            },
            bangSmall: { 
                play: () => createSound(300, 0.3, 'sine'),
                currentTime: 0
            },
            explode: { 
                play: () => createSound(200, 0.6, 'sawtooth'),
                currentTime: 0
            },
            alienSpawn: { 
                play: () => createSound(400, 0.4, 'triangle'),
                currentTime: 0
            },
            alienFire: { 
                play: () => createSound(800, 0.3, 'square'),
                currentTime: 0
            }
        };
        
        addLogMessage('Using fallback audio system (Web Audio API)');
        console.log('Fallback audio system created successfully');
        window.usingFallbackAudio = true;
    } catch (fallbackError) {
        console.error('Failed to create fallback audio system:', fallbackError);
        
        // Set up dummy sound objects that do nothing
        soundFX = {
            fire: { play: () => console.log('Audio disabled: fire sound') },
            thrust: { 
                play: () => console.log('Audio disabled: thrust sound'),
                pause: () => console.log('Audio disabled: thrust stop'),
                currentTime: 0
            },
            bangLarge: { play: () => console.log('Audio disabled: bangLarge sound') },
            bangMedium: { play: () => console.log('Audio disabled: bangMedium sound') },
            bangSmall: { play: () => console.log('Audio disabled: bangSmall sound') },
            explode: { play: () => console.log('Audio disabled: explode sound') },
            alienSpawn: { play: () => console.log('Audio disabled: alienSpawn sound') },
            alienFire: { play: () => console.log('Audio disabled: alienFire sound') }
        };
        
        addLogMessage('Game will run without audio effects');
    }
}
