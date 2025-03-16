import { INITIAL_LIVES } from './constants';

class GameState {
    constructor() {
        // Game state
        this.gameStarted = false;
        this.gamePaused = false;
        this.gameLoopRunning = false;
        this.score = 0;
        this.lives = INITIAL_LIVES;
        this.level = 1;

        // Entities
        this.ship = null;
        this.asteroids = [];
        this.bullets = [];
        this.shipDebris = [];
        this.stars = [];
        this.welcomeAsteroids = [];

        // Input state
        this.keys = {
            left: false,
            right: false,
            up: false,
            space: false
        };

        // High score state
        this.highScores = [];
        this.highScoresFetched = false;
        this.playerInitials = "AAA";
        this.enteringInitials = false;
        this.currentInitialIndex = 0;
        this.isSubmittingScore = false;
        this.scoreSubmitError = null;
        this.lastScoreSubmitTime = 0;

        // Visual state
        this.starsGenerated = false;
        this.showLog = false;
        this.titleHoverOffset = 0;
        this.titleHoverDirection = 1;
        this.frameCount = 0;
    }

    reset() {
        this.score = 0;
        this.lives = INITIAL_LIVES;
        this.level = 1;
        this.bullets = [];
        this.asteroids = [];
        this.shipDebris = [];
        this.resetKeys();
    }

    resetKeys() {
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
    }

    togglePause() {
        this.gamePaused = !this.gamePaused;
        return this.gamePaused;
    }

    incrementScore(points) {
        this.score += points;
        return this.score;
    }

    decrementLives() {
        this.lives--;
        return this.lives;
    }

    nextLevel() {
        this.level++;
        return this.level;
    }
}

// Create and export a singleton instance
export const gameState = new GameState();

// Export the class for testing purposes
export { GameState }; 