import { DEBRIS_SPEED, DEBRIS_ROTATION_SPEED, DEBRIS_LIFETIME } from '../constants';

export class Debris {
    constructor(x1, y1, x2, y2, baseVelocity = { x: 0, y: 0 }) {
        // Calculate center point and length
        this.centerX = (x1 + x2) / 2;
        this.centerY = (y1 + y2) / 2;
        this.length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        
        // Calculate initial angle
        this.angle = Math.atan2(y2 - y1, x2 - x1);
        
        // Set random rotation speed
        this.rotationSpeed = (Math.random() - 0.5) * DEBRIS_ROTATION_SPEED * 2;
        
        // Set random velocity based on base velocity
        this.velocity = {
            x: baseVelocity.x + (Math.random() - 0.5) * DEBRIS_SPEED,
            y: baseVelocity.y + (Math.random() - 0.5) * DEBRIS_SPEED
        };
        
        // Set lifetime
        this.lifetime = DEBRIS_LIFETIME;
    }

    update(canvasWidth, canvasHeight) {
        // Move debris
        this.centerX += this.velocity.x;
        this.centerY += this.velocity.y;
        
        // Rotate debris
        this.angle += this.rotationSpeed;
        
        // Handle edge of screen (wrap around)
        if (this.centerX < 0) {
            this.centerX = canvasWidth;
        } else if (this.centerX > canvasWidth) {
            this.centerX = 0;
        }
        
        if (this.centerY < 0) {
            this.centerY = canvasHeight;
        } else if (this.centerY > canvasHeight) {
            this.centerY = 0;
        }
        
        // Reduce lifetime
        this.lifetime--;
        
        // Return true if debris should be removed
        return this.lifetime <= 0;
    }

    getEndpoints() {
        const halfLength = this.length / 2;
        return {
            x1: this.centerX - halfLength * Math.cos(this.angle),
            y1: this.centerY - halfLength * Math.sin(this.angle),
            x2: this.centerX + halfLength * Math.cos(this.angle),
            y2: this.centerY + halfLength * Math.sin(this.angle)
        };
    }

    getOpacity() {
        // Add a fading effect as lifetime decreases
        return this.lifetime < 60 ? this.lifetime / 60 : 1;
    }
} 