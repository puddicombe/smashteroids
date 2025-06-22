# SMASHTEROIDS

A modern reimagining inspired by the classic Asteroids arcade game, featuring enhanced gameplay mechanics, intelligent enemies, and a server-based high score system.

(c) James Puddicombe 2025

## Quick Start

### Using Docker (Recommended)
```bash
# Build and run with Docker
docker build -t smashteroids .
docker run -p 3000:3000 smashteroids

# Then open http://localhost:3000 in your browser
```

### Using Node.js directly
```bash
# Install dependencies
npm install

# Start the server
npm start

# Then open http://localhost:3000 in your browser
```

## Features

### Core Gameplay
- Modern take on classic arcade-style gameplay with improved physics and controls
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

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Or Docker (for containerized deployment)

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd smashteroids
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Starting the Server

#### Option 1: Direct Node.js
```bash
npm start
```

#### Option 2: Development mode with auto-restart
```bash
npm run dev
```

#### Option 3: Using Docker
```bash
# Build the Docker image
docker build -t smashteroids .

# Run the container
docker run -p 3000:3000 smashteroids
```

The server will start on port 3000.

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

## Deployment

### Deploying to Heroku

#### Prerequisites
- A Heroku account
- Heroku CLI installed

#### Deployment Steps

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

#### Notes About Heroku Deployment
- High scores on Heroku will reset whenever the dyno restarts (approximately daily)
- For persistent high scores, consider adding a database like MongoDB Atlas or Heroku Postgres
- The app uses the `Procfile` for Heroku deployment configuration

### Deploying with Docker

#### Build and run locally
```bash
docker build -t smashteroids .
docker run -p 3000:3000 smashteroids
```

#### Deploy to Docker Hub
```bash
# Tag your image
docker tag smashteroids yourusername/smashteroids:latest

# Push to Docker Hub
docker push yourusername/smashteroids:latest
```

#### Deploy to cloud platforms
- **Google Cloud Run**: Use the provided Dockerfile
- **AWS ECS**: Use the provided Dockerfile
- **Azure Container Instances**: Use the provided Dockerfile

## Development

### Project Structure
```
smashteroids/
├── public/           # Static game files
│   ├── game.js      # Main game logic
│   ├── index.html   # Game interface
│   └── audioWorklet.js # Audio processing
├── server/          # Server-side code
│   ├── server.js    # Express server
│   └── test-highscores.js # Testing utilities
├── Dockerfile       # Container configuration
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

### Development Commands
```bash
# Start development server with auto-restart
npm run dev

# Run tests
npm test

# Build Docker image
docker build -t smashteroids .
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 