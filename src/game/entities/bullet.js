import { BULLET_SPEED, BULLET_LIFETIME } from '../constants';
import { calculateVelocity } from '../systems/physics';

export class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.radius = 2;
        this.lifetime = BULLET_LIFETIME;

        // Calculate velocity
        const velocity = calculateVelocity(angle, BULLET_SPEED);
        this.xv = velocity.x;
        this.yv = -velocity.y; // Negative because y-axis is inverted in canvas
    }

    update(canvasWidth, canvasHeight) {
        // Move bullet
        this.x += this.xv;
        this.y += this.yv;

        // Handle edge of screen (wrap around)
        if (this.x < 0) {
            this.x = canvasWidth;
        } else if (this.x > canvasWidth) {
            this.x = 0;
        }

        if (this.y < 0) {
            this.y = canvasHeight;
        } else if (this.y > canvasHeight) {
            this.y = 0;
        }

        // Reduce lifetime
        this.lifetime--;

        // Return true if bullet should be removed
        return this.lifetime <= 0;
    }
} 