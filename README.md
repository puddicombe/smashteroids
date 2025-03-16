# Asteroids Game

A classic Asteroids arcade game with a modern twist, featuring a server-based high score system.

(c) James Puddicombe 2025

## Features

- Classic Asteroids gameplay with improved controls
- Animated welcome screen with game instructions
- Realistic physics with momentum and inertia
- Sound effects generated using Web Audio API
- Server-based high score system that persists between sessions
- Safe respawn system to prevent unfair deaths
- Dynamic ship explosion animations
- Pause functionality

## Running the Game Locally

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone this repository
2. Install the server dependencies:

```bash
cd server
npm install
```

### Starting the Server

From the server directory, run:

```bash
npm start
```

This will start the server on port 3000.

### Playing the Game

Open your browser and navigate to:

```
http://localhost:3000
```

## Deploying to Heroku

### Prerequisites

- A Heroku account
- Heroku CLI installed

### Deployment Steps

1. Login to Heroku CLI:
   ```bash
   heroku login
   ```

2. Create a new Heroku app:
   ```bash
   heroku create your-asteroids-game
   ```

3. Deploy to Heroku:
   ```bash
   git push heroku main
   ```

4. Open your deployed app:
   ```bash
   heroku open
   ```

### Notes About Heroku Deployment

- High scores on Heroku will reset whenever the dyno restarts (approximately daily)
- For persistent high scores, consider adding a database like MongoDB Atlas or Heroku Postgres

## Game Controls

- **Rotate**: Left/Right arrows or A/D keys
- **Thrust**: Up arrow or W key
- **Fire**: Spacebar (maximum 4 bullets at once)
- **Pause**: P key
- **Exit to Menu**: ESC key
- **Toggle Debug Log**: L key

## High Score System

The game features a server-based high score system that:

- Persists between game sessions
- Stores up to 15 top scores
- Collects player initials (3 letters)
- Displays scores on the welcome screen
- Automatically submits scores when you beat a previous high score

## Development

To run the server in development mode with auto-restart:

```bash
cd server
npm run dev
```

## License

MIT License 