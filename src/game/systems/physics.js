// Handle objects going off screen (wrap around)
export function handleEdgeOfScreen(obj) {
    if (obj.x < 0 - obj.radius) {
        obj.x = canvas.width + obj.radius;
    } else if (obj.x > canvas.width + obj.radius) {
        obj.x = 0 - obj.radius;
    }
    
    if (obj.y < 0 - obj.radius) {
        obj.y = canvas.height + obj.radius;
    } else if (obj.y > canvas.height + obj.radius) {
        obj.y = 0 - obj.radius;
    }
}

// Calculate distance between two points
export function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Check if two objects are colliding
export function checkCollision(obj1, obj2) {
    return distBetweenPoints(obj1.x, obj1.y, obj2.x, obj2.y) < obj1.radius + obj2.radius;
}

// Calculate velocity components based on angle and speed
export function calculateVelocity(angle, speed) {
    return {
        x: speed * Math.cos(angle),
        y: speed * Math.sin(angle)
    };
}

// Find a safe position away from all objects
export function findSafePosition(objects, safeDistance, canvasWidth, canvasHeight, maxAttempts = 30) {
    let attempts = 0;
    let position = null;

    while (!position && attempts < maxAttempts) {
        // Try different quadrants of the screen
        const x = canvasWidth * (0.25 + (Math.random() * 0.5));
        const y = canvasHeight * (0.25 + (Math.random() * 0.5));
        
        let isSafe = true;
        
        // Check distance from all objects
        for (const obj of objects) {
            const distance = distBetweenPoints(x, y, obj.x, obj.y);
            if (distance < safeDistance) {
                isSafe = false;
                break;
            }
            
            // Also check predicted future position
            const futureX = obj.x + (obj.velocity?.x || 0) * 30;
            const futureY = obj.y + (obj.velocity?.y || 0) * 30;
            const futureDistance = distBetweenPoints(x, y, futureX, futureY);
            if (futureDistance < safeDistance) {
                isSafe = false;
                break;
            }
        }
        
        if (isSafe) {
            position = { x, y };
        }
        
        attempts++;
    }
    
    // If no safe position found, return center with forced clearance
    if (!position) {
        position = {
            x: canvasWidth / 2,
            y: canvasHeight / 2
        };
        
        // Force clear the area
        objects.forEach(obj => {
            const angle = Math.atan2(obj.y - position.y, obj.x - position.x);
            const clearanceDistance = safeDistance * 1.5;
            obj.x = position.x + Math.cos(angle) * clearanceDistance;
            obj.y = position.y + Math.sin(angle) * clearanceDistance;
        });
    }
    
    return position;
} 