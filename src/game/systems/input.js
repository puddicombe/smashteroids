export class InputHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        // Handle release notes
        if (e.key === 'n' || e.key === 'N') {
            this.gameState.toggleReleaseNotes();
            return;
        }

        // If release notes are showing, only handle scrolling
        if (this.gameState.showingReleaseNotes) {
            if (e.key === 'ArrowUp') {
                this.gameState.scrollReleaseNotes('up');
            } else if (e.key === 'ArrowDown') {
                this.gameState.scrollReleaseNotes('down');
            }
            return;
        }

        // Handle game controls
        if (this.gameState.gameStarted && !this.gameState.gamePaused) {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                    this.gameState.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.gameState.keys.right = true;
                    break;
                case 'ArrowUp':
                case 'w':
                    this.gameState.keys.up = true;
                    break;
                case ' ':
                    this.gameState.keys.space = true;
                    break;
            }
        }

        // Handle pause
        if ((e.key === 'p' || e.key === 'P') && this.gameState.gameStarted) {
            this.gameState.togglePause();
        }

        // Handle other game state changes
        if (e.key === 'Enter') {
            if (!this.gameState.gameStarted) {
                this.gameState.gameStarted = true;
                // Additional game start logic...
            }
        }

        // Handle log toggle
        if (e.key === 'l' || e.key === 'L') {
            this.gameState.showLog = !this.gameState.showLog;
        }
    }

    handleKeyUp(e) {
        if (this.gameState.gameStarted && !this.gameState.gamePaused) {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                    this.gameState.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.gameState.keys.right = false;
                    break;
                case 'ArrowUp':
                case 'w':
                    this.gameState.keys.up = false;
                    break;
                case ' ':
                    this.gameState.keys.space = false;
                    break;
            }
        }
    }
} 