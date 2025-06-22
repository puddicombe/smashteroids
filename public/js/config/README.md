# SMASHTEROIDS Configuration System

This directory contains the centralized configuration system for SMASHTEROIDS, eliminating magic numbers throughout the codebase.

## 📁 Files

- **`GameConfig.js`** - Main configuration file with all game constants
- **`validate-config.js`** - Validation script to test configuration values
- **`run-tests.html`** - Test runner with visual interface
- **`test-config.html`** - Simple test page
- **`ConfigValidator.js`** - Advanced validation class (placeholder)

## 🚀 Quick Start

### 1. Test the Configuration

Open `run-tests.html` in your browser to validate the configuration:

```bash
# Navigate to the config directory
cd public/js/config

# Open the test runner
open run-tests.html
```

### 2. Use Configuration in Your Code

```javascript
// Load the configuration
import { GameConfig } from './js/config/GameConfig.js';

// Use configuration values instead of magic numbers
const shipSize = GameConfig.SHIP.SIZE;           // Instead of: const SHIP_SIZE = 30;
const maxBullets = GameConfig.GAME.MAX_BULLETS;  // Instead of: const MAX_BULLETS = 4;
const alienPoints = GameConfig.SCORE.VALUES.ALIEN; // Instead of: const ALIEN_POINTS = 1000;
```

## 📋 Configuration Sections

### Core Game Settings (`GAME`)
- FPS, canvas dimensions, starting lives, bullet limits

### Ship Configuration (`SHIP`)
- Size, thrust, rotation speed, physics properties

### Asteroid Configuration (`ASTEROID`)
- Speed, count, scoring, debris effects

### Bullet Configuration (`BULLET`)
- Speed, lifetime, size

### Alien Configuration (`ALIEN`)
- Behavior, spawning, combat properties

### Battlestar Configuration (`BATTLESTAR`)
- Boss ship properties and mechanics

### Score System (`SCORE`)
- Point values, popup animations

### Audio Configuration (`AUDIO`)
- Volume levels for different sound types

### UI Configuration (`UI`)
- Font sizes, spacing, layout

### Colors (`COLORS`)
- Game color palette and themes

### Physics (`PHYSICS`)
- Collision detection, friction, gravity

### Difficulty Scaling (`DIFFICULTY`)
- Level progression and challenge scaling

## ✅ Validation Features

The validation system checks:

- **Type Safety**: All values are correct data types
- **Range Validation**: Values are within sensible ranges
- **Cross-Section Relationships**: Related values are consistent
- **Complex Structures**: Arrays and objects are properly formatted
- **Performance Warnings**: Values that may impact performance
- **Game Balance**: Values that may affect gameplay difficulty

## 🔧 Customization

### Adding New Configuration Values

1. Add the value to the appropriate section in `GameConfig.js`
2. Add validation rules to `validate-config.js`
3. Test with the validation runner

### Example: Adding a New Ship Property

```javascript
// In GameConfig.js
SHIP: {
  // ... existing properties
  SHIELD_STRENGTH: 100,  // New property
  SHIELD_REGEN_RATE: 5
}

// In validate-config.js
// Test SHIP section
if (config.SHIP) {
  // ... existing tests
  if (typeof config.SHIP.SHIELD_STRENGTH !== 'number') {
    errors.push('SHIP.SHIELD_STRENGTH must be a number');
  }
  if (config.SHIP.SHIELD_STRENGTH < 0 || config.SHIP.SHIELD_STRENGTH > 1000) {
    warnings.push('SHIP.SHIELD_STRENGTH should be 0-1000');
  }
}
```

## 🎯 Benefits

### Code Quality
- **No Magic Numbers**: All constants are named and documented
- **Self-Documenting**: Configuration structure explains game mechanics
- **Maintainable**: Easy to find and modify game values

### Game Balance
- **Centralized Tuning**: All game balance values in one place
- **Validation**: Automatic checks prevent invalid configurations
- **Experimentation**: Easy to test different values

### Development Workflow
- **Version Control**: Track configuration changes separately
- **A/B Testing**: Different configurations for different user groups
- **Modding Support**: Users can create custom configurations

## 🧪 Testing

### Automated Validation
```javascript
// Run validation programmatically
const validation = validateGameConfig(GameConfig);
console.log('Configuration is valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
```

### Visual Testing
Open `run-tests.html` to see:
- ✅/❌ Validation status
- Detailed error and warning messages
- Configuration structure overview
- Recommendations for improvements

## 📈 Future Enhancements

- **Environment-Specific Configs**: Development vs production settings
- **Runtime Configuration**: Change values without restarting
- **Configuration UI**: Visual editor for game designers
- **Performance Profiling**: Automatic performance impact analysis
- **Balance Testing**: Automated gameplay balance validation

## 🔗 Integration

To integrate with the main game:

1. **Phase 1**: ✅ Configuration files created (current)
2. **Phase 2**: Replace constants in `game.js` with `GameConfig` references
3. **Phase 3**: Add configuration validation to build process
4. **Phase 4**: Create configuration UI for runtime changes
5. **Phase 5**: Add configuration versioning and migration

---

**Next Steps**: Run the validation tests to ensure the configuration is working correctly, then begin Phase 2 by replacing magic numbers in the main game code. 