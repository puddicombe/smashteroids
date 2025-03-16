import { 
    BASE_ASTEROID_SPEED, 
    ASTEROID_SPEED_SCALING, 
    MAX_ASTEROID_SPEED,
    ASTEROID_JAG,
    ASTEROID_VERTICES
} from '../constants';
import { handleEdgeOfScreen } from '../systems/physics';

export class Asteroid {
    constructor(x, y, size, level = 1) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = size * (20 - Math.min(level - 1, 5)); // Shrink with level
        this.angle = Math.random() * Math.PI * 2;
        this.vert = Math.floor(Math.random() * (ASTEROID_VERTICES + 1) + ASTEROID_VERTICES / 2);
        this.offset = [];

        // Calculate speed based on level and size
        const levelSpeedBonus = Math.min((level - 1) * ASTEROID_SPEED_SCALING, MAX_ASTEROID_SPEED - BASE_ASTEROID_SPEED);
        const sizeSpeedMultiplier = (4 - size) * 0.4; // Smaller asteroids are faster
        const currentSpeed = (BASE_ASTEROID_SPEED + levelSpeedBonus) * (1 + sizeSpeedMultiplier);

        // Set velocity
        this.velocity = {
            x: Math.random() * currentSpeed * 2 - currentSpeed,
            y: Math.random() * currentSpeed * 2 - currentSpeed
        };

        // Set rotation speed - smaller asteroids rotate faster
        this.rotationSpeed = (Math.random() - 0.5) * 0.02 * (1 + (level - 1) * 0.1) * (1 + sizeSpeedMultiplier);

        // Generate shape
        this.generateShape();
    }

    generateShape() {
        for (let i = 0; i < this.vert; i++) {
            this.offset.push(Math.random() * ASTEROID_JAG * 2 + 1 - ASTEROID_JAG);
        }
    }

    update() {
        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Update rotation
        this.angle += this.rotationSpeed;

        // Handle screen wrapping
        handleEdgeOfScreen(this);
    }

    split(level) {
        if (this.size <= 1) return [];

        // Higher levels create more child asteroids
        const numChildren = Math.min(2 + Math.floor((level - 1) / 3), 4);
        const children = [];

        for (let i = 0; i < numChildren; i++) {
            children.push(new Asteroid(this.x, this.y, this.size - 1, level));
        }

        return children;
    }

    getPoints(level) {
        // Score increases with level
        const levelBonus = Math.floor((level - 1) * 0.5 * 100);
        return (100 * (4 - this.size)) + levelBonus;
    }
} 