import { SHIP_SIZE, SHIP_THRUST, FRICTION, INVULNERABILITY_TIME } from '../constants';
import { handleEdgeOfScreen } from '../systems/physics';

export class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = SHIP_SIZE / 2;
        this.angle = 0;
        this.rotation = 0;
        this.thrusting = false;
        this.thrust = { x: 0, y: 0 };
        this.exploding = false;
        this.explodeTime = 0;
        this.invulnerable = true;
        this.invulnerableTime = INVULNERABILITY_TIME;
    }

    update() {
        if (this.exploding) {
            this.explodeTime--;
            return this.explodeTime === 0;
        }

        // Update rotation
        this.angle += this.rotation;

        // Update thrust
        if (this.thrusting) {
            this.thrust.x += SHIP_THRUST * Math.cos(this.angle);
            this.thrust.y -= SHIP_THRUST * Math.sin(this.angle);
        } else {
            // Apply friction
            this.thrust.x *= FRICTION;
            this.thrust.y *= FRICTION;
        }

        // Update position
        this.x += this.thrust.x;
        this.y += this.thrust.y;

        // Handle screen wrapping
        handleEdgeOfScreen(this);

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTime--;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }

        return false; // Ship not ready for respawn
    }

    startThrusting() {
        if (!this.exploding) {
            this.thrusting = true;
        }
    }

    stopThrusting() {
        this.thrusting = false;
    }

    setRotation(rotation) {
        this.rotation = rotation;
    }

    explode() {
        this.exploding = true;
        this.explodeTime = 180; // 3 seconds at 60fps
        this.thrusting = false;
    }

    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.rotation = 0;
        this.thrust = { x: 0, y: 0 };
        this.thrusting = false;
        this.exploding = false;
        this.explodeTime = 0;
        this.invulnerable = true;
        this.invulnerableTime = INVULNERABILITY_TIME;
    }

    getGunPosition() {
        return {
            x: this.x + 4/3 * this.radius * Math.cos(this.angle),
            y: this.y - 4/3 * this.radius * Math.sin(this.angle)
        };
    }
} 