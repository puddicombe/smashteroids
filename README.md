# Asteroids Game

A modern reimagining of the classic Asteroids arcade game, featuring enhanced gameplay mechanics, intelligent enemies, and a server-based high score system.

(c) James Puddicombe 2025

## Features

### Core Gameplay
- Classic Asteroids gameplay with improved physics and controls
- Momentum-based movement with realistic inertia
- Size-based asteroid behavior: smaller asteroids move and rotate faster
- Safe respawn system to prevent unfair deaths
- Maximum of 4 bullets on screen at once (like the original arcade game)
- Pause functionality (P key)

### Enhanced Graphics & Animation
- Animated welcome screen with game instructions
- Dynamic ship explosion animations with debris physics
- Asteroid destruction animations
- Ship invulnerability visual effects after respawn
- Smooth rotation and movement

### Intelligent Enemies
- Alien spacecraft that appear more frequently in higher levels
- Smart alien behavior with asteroid avoidance
- Predictive shooting that targets player's projected position
- Multiple aliens can appear simultaneously
- Aliens have their own bullet management system

### Audio System
- Procedurally generated sound effects using Web Audio API
- Dynamic thrust sounds that match ship movement
- Explosion sounds that vary based on object size
- Weapon firing effects for both player and aliens

### High Score System
- Server-based high score table that persists between sessions
- Stores up to 15 top scores
- 3-letter initial entry for high scores
- High scores displayed on welcome screen
- Automatic score submission when beating previous records

### Additional Features
- Debug log system (toggle with L key)
- In-game release notes (N key)
- Comprehensive game statistics
- Level progression system with increasing difficulty

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

## Game Controls

### Ship Controls
- **Rotate Left**: Left arrow or A key
- **Rotate Right**: Right arrow or D key
- **Thrust**: Up arrow or W key
- **Fire**: Spacebar (maximum 4 bullets)

### Game Management
- **Pause Game**: P key
- **Exit to Menu**: ESC key
- **Toggle Debug Log**: L key
- **View Release Notes**: N key
- **Test Sound**: T key

### Debug Features
- **Spawn Alien**: U key (for testing)

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

## Development

To run the server in development mode with auto-restart:

```bash
cd server
npm run dev
```

## Game Mechanics

### Scoring System
- Large Asteroid: 100 points
- Medium Asteroid: 200 points
- Small Asteroid: 300 points
- Alien Spacecraft: 1000 points
- Score multiplier increases with level

### Level Progression
- Each level increases asteroid speed and count
- Alien spacecraft appear more frequently
- Smaller asteroids move and rotate faster
- Score multipliers increase with level
- More asteroid fragments spawn at higher levels

## License

MIT License 