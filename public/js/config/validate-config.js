/**
 * SMASHTEROIDS Configuration Validator
 * Simple validation script for testing configuration values
 */

function validateGameConfig(config) {
    const errors = [];
    const warnings = [];
    
    console.log('🔍 Starting SMASHTEROIDS configuration validation...');
    
    // Check if config exists
    if (!config) {
        errors.push('Configuration object is undefined');
        return { errors, warnings, isValid: false };
    }
    
    // Test required sections
    const requiredSections = ['GAME', 'SHIP', 'ASTEROID', 'BULLET', 'ALIEN', 'BATTLESTAR', 'SCORE', 'COLORS'];
    for (const section of requiredSections) {
        if (!config[section]) {
            errors.push(`Missing required section: ${section}`);
        }
    }
    
    // Test GAME section
    if (config.GAME) {
        if (typeof config.GAME.FPS !== 'number') errors.push('GAME.FPS must be a number');
        if (config.GAME.FPS < 30 || config.GAME.FPS > 120) warnings.push('GAME.FPS should be between 30-120');
        
        if (typeof config.GAME.MAX_BULLETS !== 'number') errors.push('GAME.MAX_BULLETS must be a number');
        if (config.GAME.MAX_BULLETS > 8) warnings.push('GAME.MAX_BULLETS may be too high for performance');
        
        if (typeof config.GAME.STARTING_LIVES !== 'number') errors.push('GAME.STARTING_LIVES must be a number');
        if (config.GAME.STARTING_LIVES < 1 || config.GAME.STARTING_LIVES > 10) warnings.push('GAME.STARTING_LIVES should be 1-10');
    }
    
    // Test SHIP section
    if (config.SHIP) {
        if (typeof config.SHIP.SIZE !== 'number') errors.push('SHIP.SIZE must be a number');
        if (config.SHIP.SIZE < 10 || config.SHIP.SIZE > 100) warnings.push('SHIP.SIZE should be 10-100');
        
        if (typeof config.SHIP.THRUST !== 'number') errors.push('SHIP.THRUST must be a number');
        if (typeof config.SHIP.MAX_THRUST !== 'number') errors.push('SHIP.MAX_THRUST must be a number');
        
        if (config.SHIP.THRUST > config.SHIP.MAX_THRUST) {
            errors.push('SHIP.THRUST cannot exceed SHIP.MAX_THRUST');
        }
        
        if (typeof config.SHIP.FRICTION !== 'number') errors.push('SHIP.FRICTION must be a number');
        if (config.SHIP.FRICTION < 0.8 || config.SHIP.FRICTION > 0.999) {
            warnings.push('SHIP.FRICTION should be between 0.8-0.999');
        }
    }
    
    // Test ASTEROID section
    if (config.ASTEROID) {
        if (typeof config.ASTEROID.COUNT !== 'number') errors.push('ASTEROID.COUNT must be a number');
        if (config.ASTEROID.COUNT > 10) warnings.push('ASTEROID.COUNT may be too high');
        
        if (typeof config.ASTEROID.BASE_SPEED !== 'number') errors.push('ASTEROID.BASE_SPEED must be a number');
        if (config.ASTEROID.BASE_SPEED < 0.1 || config.ASTEROID.BASE_SPEED > 5.0) {
            warnings.push('ASTEROID.BASE_SPEED should be 0.1-5.0');
        }
    }
    
    // Test ALIEN section
    if (config.ALIEN) {
        if (typeof config.ALIEN.MAX_COUNT !== 'number') errors.push('ALIEN.MAX_COUNT must be a number');
        if (config.ALIEN.MAX_COUNT > 5) warnings.push('ALIEN.MAX_COUNT may make game too difficult');
        
        if (typeof config.ALIEN.POINTS !== 'number') errors.push('ALIEN.POINTS must be a number');
        if (config.ALIEN.POINTS < 100) warnings.push('ALIEN.POINTS may be too low');
    }
    
    // Test AUDIO section
    if (config.AUDIO) {
        if (typeof config.AUDIO.MASTER_VOLUME !== 'number') errors.push('AUDIO.MASTER_VOLUME must be a number');
        if (config.AUDIO.MASTER_VOLUME > 1.0) errors.push('AUDIO.MASTER_VOLUME cannot exceed 1.0');
        
        if (typeof config.AUDIO.SFX_VOLUME !== 'number') errors.push('AUDIO.SFX_VOLUME must be a number');
        if (config.AUDIO.SFX_VOLUME > 1.0) errors.push('AUDIO.SFX_VOLUME cannot exceed 1.0');
        
        if (typeof config.AUDIO.THRUST_VOLUME !== 'number') errors.push('AUDIO.THRUST_VOLUME must be a number');
        if (config.AUDIO.THRUST_VOLUME > 1.0) errors.push('AUDIO.THRUST_VOLUME cannot exceed 1.0');
    }
    
    // Test SCORE section
    if (config.SCORE && config.SCORE.VALUES) {
        if (typeof config.SCORE.VALUES.ALIEN !== 'number') errors.push('SCORE.VALUES.ALIEN must be a number');
        if (config.SCORE.VALUES.ALIEN < 100) warnings.push('SCORE.VALUES.ALIEN may be too low');
        
        if (typeof config.SCORE.VALUES.BATTLESTAR !== 'number') errors.push('SCORE.VALUES.BATTLESTAR must be a number');
        if (config.SCORE.VALUES.BATTLESTAR > 10000) warnings.push('SCORE.VALUES.BATTLESTAR may be too high');
    }
    
    // Test complex structures
    if (config.SHIP && !Array.isArray(config.SHIP.SHAPE_VERTICES)) {
        errors.push('SHIP.SHAPE_VERTICES must be an array');
    }
    
    if (config.BATTLESTAR && !Array.isArray(config.BATTLESTAR.DAMAGE_THRESHOLDS)) {
        errors.push('BATTLESTAR.DAMAGE_THRESHOLDS must be an array');
    }
    
    if (config.COLORS) {
        const colorArrays = ['SCORE_SMALL', 'SCORE_MEDIUM', 'SCORE_LARGE'];
        for (const colorArray of colorArrays) {
            if (!Array.isArray(config.COLORS[colorArray])) {
                errors.push(`COLORS.${colorArray} must be an array`);
            }
        }
    }
    
    // Cross-section validations
    if (config.SHIP && config.GAME) {
        const shipSize = config.SHIP.SIZE;
        const canvasWidth = config.GAME.CANVAS_WIDTH;
        const canvasHeight = config.GAME.CANVAS_HEIGHT;
        
        if (shipSize > Math.min(canvasWidth, canvasHeight) * 0.1) {
            warnings.push(`Ship size (${shipSize}) may be too large for canvas (${canvasWidth}x${canvasHeight})`);
        }
    }
    
    const isValid = errors.length === 0;
    
    // Log results
    console.log(`\n📊 Validation Results:`);
    console.log(`Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (isValid) {
        console.log('\n✅ Configuration is valid! All tests passed.');
    }
    
    return { errors, warnings, isValid };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateGameConfig };
}

// Auto-run if GameConfig is available
if (typeof GameConfig !== 'undefined') {
    console.log('🎮 SMASHTEROIDS Configuration Validator loaded');
    validateGameConfig(GameConfig);
} else {
    console.log('⚠️ GameConfig not found. Load GameConfig.js first, then call validateGameConfig(GameConfig)');
} 