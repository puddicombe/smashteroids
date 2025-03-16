export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawShip(ship) {
        // Draw ship
        this.ctx.strokeStyle = ship.invulnerable && Math.floor(Date.now() / 50) % 2 === 0 
            ? 'rgba(255, 255, 255, 0.5)' 
            : 'white';
        this.ctx.lineWidth = 2;

        // Draw the main triangle
        this.ctx.beginPath();
        const noseX = ship.x + 1.7 * ship.radius * Math.cos(ship.angle);
        const noseY = ship.y - 1.7 * ship.radius * Math.sin(ship.angle);
        const rearLeftX = ship.x - ship.radius * (0.8 * Math.cos(ship.angle) + 1.2 * Math.sin(ship.angle));
        const rearLeftY = ship.y + ship.radius * (0.8 * Math.sin(ship.angle) - 1.2 * Math.cos(ship.angle));
        const rearRightX = ship.x - ship.radius * (0.8 * Math.cos(ship.angle) - 1.2 * Math.sin(ship.angle));
        const rearRightY = ship.y + ship.radius * (0.8 * Math.sin(ship.angle) + 1.2 * Math.cos(ship.angle));

        this.ctx.moveTo(noseX, noseY);
        this.ctx.lineTo(rearLeftX, rearLeftY);
        this.ctx.lineTo(rearRightX, rearRightY);
        this.ctx.closePath();
        this.ctx.stroke();

        // Add center line
        const centerRearX = ship.x - ship.radius * 0.5 * Math.cos(ship.angle);
        const centerRearY = ship.y + ship.radius * 0.5 * Math.sin(ship.angle);
        this.ctx.beginPath();
        this.ctx.moveTo(noseX, noseY);
        this.ctx.lineTo(centerRearX, centerRearY);
        this.ctx.stroke();

        // Draw thruster
        if (ship.thrusting) {
            this.drawThruster(ship, rearLeftX, rearLeftY, rearRightX, rearRightY);
        }

        // Draw shield
        if (ship.invulnerable) {
            this.drawShield(ship);
        }
    }

    drawThruster(ship, rearLeftX, rearLeftY, rearRightX, rearRightY) {
        this.ctx.fillStyle = 'orangered';
        this.ctx.beginPath();
        const flameSize = 0.8 + 0.4 * Math.random();
        const flameTipX = ship.x - ship.radius * (1.2 + flameSize) * Math.cos(ship.angle);
        const flameTipY = ship.y + ship.radius * (1.2 + flameSize) * Math.sin(ship.angle);
        this.ctx.moveTo(rearLeftX, rearLeftY);
        this.ctx.lineTo(flameTipX, flameTipY);
        this.ctx.lineTo(rearRightX, rearRightY);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawShield(ship) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        this.ctx.arc(ship.x, ship.y, ship.radius * 1.5, 0, Math.PI * 2, false);
        this.ctx.stroke();
    }

    drawAsteroid(asteroid) {
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let j = 0; j < asteroid.vert; j++) {
            const angle = j * Math.PI * 2 / asteroid.vert;
            const radius = asteroid.radius * asteroid.offset[j];
            const x = asteroid.x + radius * Math.cos(angle + asteroid.angle);
            const y = asteroid.y + radius * Math.sin(angle + asteroid.angle);

            if (j === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawBullet(bullet) {
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2, false);
        this.ctx.fill();
    }

    drawDebris(debris) {
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${debris.getOpacity()})`;
        this.ctx.lineWidth = 2;
        const endpoints = debris.getEndpoints();
        this.ctx.beginPath();
        this.ctx.moveTo(endpoints.x1, endpoints.y1);
        this.ctx.lineTo(endpoints.x2, endpoints.y2);
        this.ctx.stroke();
    }

    drawGameInfo(score, lives, level) {
        // Draw black background for info bar
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, 40);
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(0, 0, this.canvas.width, 40);

        // Draw text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px PressStart2P';
        
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${score}`, 20, 25);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Level: ${level}`, this.canvas.width / 2, 25);
        
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Lives: ${lives}`, this.canvas.width - 20, 25);
    }

    drawLevelComplete(level, asteroidSpeed, scoreMultiplier, asteroidChildren) {
        this.ctx.font = '20px PressStart2P';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`LEVEL ${level} COMPLETE!`, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '12px PressStart2P';
        this.ctx.fillText('Get Ready for Next Level...', this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        this.ctx.font = '10px PressStart2P';
        this.ctx.fillText(`Asteroid Speed: ${Math.round(asteroidSpeed * 100)}%`, this.canvas.width / 2, this.canvas.height / 2 + 60);
        this.ctx.fillText(`Score Multiplier: ${Math.round(scoreMultiplier * 100)}%`, this.canvas.width / 2, this.canvas.height / 2 + 80);
        this.ctx.fillText(`Asteroid Children: ${asteroidChildren}`, this.canvas.width / 2, this.canvas.height / 2 + 100);
    }

    drawPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '28px PressStart2P';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '14px PressStart2P';
        this.ctx.fillText('PRESS P TO RESUME', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    drawReleaseNotes(releases, scrollOffset = 0) {
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Title
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px PressStart2P';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('RELEASE NOTES', this.canvas.width / 2, 50);

        // Draw close instruction
        this.ctx.font = '12px PressStart2P';
        this.ctx.fillText('PRESS N TO CLOSE', this.canvas.width / 2, 80);

        // Calculate visible area
        const startY = 120 - scrollOffset;
        const visibleHeight = this.canvas.height - 140;
        let currentY = startY;

        // Draw releases
        releases.forEach(release => {
            // Only draw if in visible area
            if (currentY > 100 && currentY < this.canvas.height - 20) {
                // Draw version title
                this.ctx.font = '16px PressStart2P';
                this.ctx.fillStyle = '#FFD700'; // Gold color for version
                this.ctx.fillText(release.title, this.canvas.width / 2, currentY);

                // Draw changes
                this.ctx.font = '12px PressStart2P';
                this.ctx.fillStyle = 'white';
                const changes = release.content.split('\\n');
                changes.forEach((change, index) => {
                    currentY += 25;
                    if (currentY > 100 && currentY < this.canvas.height - 20) {
                        this.ctx.fillText(change, this.canvas.width / 2, currentY);
                    }
                });
            }
            currentY += 40; // Space between versions
        });

        // Draw scroll indicators if needed
        if (scrollOffset > 0) {
            this.drawScrollIndicator('up', 20);
        }
        if (currentY > this.canvas.height) {
            this.drawScrollIndicator('down', this.canvas.height - 20);
        }
    }

    drawScrollIndicator(direction, y) {
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        if (direction === 'up') {
            this.ctx.moveTo(this.canvas.width / 2 - 10, y + 10);
            this.ctx.lineTo(this.canvas.width / 2, y);
            this.ctx.lineTo(this.canvas.width / 2 + 10, y + 10);
        } else {
            this.ctx.moveTo(this.canvas.width / 2 - 10, y - 10);
            this.ctx.lineTo(this.canvas.width / 2, y);
            this.ctx.lineTo(this.canvas.width / 2 + 10, y - 10);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }
} 