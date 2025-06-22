/**
 * SMASHTEROIDS Game Configuration
 * 
 * This file contains all game constants and configuration values,
 * eliminating magic numbers throughout the codebase.
 * 
 * All values are carefully balanced for optimal gameplay experience.
 */

const GameConfig = {
  // Core Game Settings
  GAME: {
    FPS: 60,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    MAX_BULLETS: 4,
    STARTING_LIVES: 3,
    STARTING_LEVEL: 1,
    DEBUG_MODE: false,
    SHOW_FPS: false,
    SHOW_COLLISION_BOXES: false,
    LOG_LEVEL: 'info'
  },

  // Ship Configuration
  SHIP: {
    SIZE: 30,
    THRUST: 0.1,
    MAX_THRUST: 0.3,
    ROTATION_SPEED: 0.1,
    FRICTION: 0.99,
    INVULNERABILITY_TIME: 180,
    SPAWN_ANIMATION_DURATION: 60,
    EXPLOSION_DURATION: 120,
    SHAPE_VERTICES: [
      { x: 0, y: -1 },    // Nose
      { x: -0.5, y: 0.5 }, // Left wing
      { x: 0.5, y: 0.5 },  // Right wing
      { x: 0, y: 0.3 }     // Tail
    ]
  },

  // Thrust Effects
  THRUST: {
    FLAME_BASE: 0.6,
    FLAME_VARIANCE: 0.2,
    SHAKE_AMOUNT: 0.15,
    PARTICLE_COUNT: 12,
    PARTICLE_LIFETIME: 15,
    PARTICLE_SPEED: 1.2,
    PARTICLE_SPREAD: 0.25,
    PARTICLE_SPIN: 0.15,
    PARTICLE_SIZE: 1.5,
    PULSE_SPEED: 0.25
  },

  // Asteroid Configuration
  ASTEROID: {
    BASE_SPEED: 1,
    SPEED_SCALING: 0.2,
    MAX_SPEED: 3,
    COUNT: 3,
    JAG: 0.3,
    VERTICES: 10,
    SCORE_MULTIPLIER: 100,
    DEBRIS_COUNT: 15,
    DEBRIS_SPEED: 3,
    DEBRIS_LIFETIME: 60,
    SIZE_MULTIPLIERS: {
      1: 1.2,  // Small asteroids are fastest
      2: 0.8,  // Medium asteroids
      3: 0.4   // Large asteroids are slowest
    }
  },

  // Bullet Configuration
  BULLET: {
    SPEED: 10,
    LIFETIME: 50,
    SIZE: 2
  },

  // Alien Configuration
  ALIEN: {
    SIZE: 20,
    SPEED: 4,
    BASE_SPEED: 200,
    FIRE_RATE: 0.5,
    ROTATION_SPEED: 0.1,
    FRICTION: 0.99,
    POINTS: 1000,
    MAX_COUNT: 3,
    CHANGE_DIRECTION_RATE: 60,
    FIRE_RATE_MIN: 30,
    FIRE_RATE_MAX: 90,
    MAX_BULLETS: 3,
    BULLET_SPEED: 5,
    BULLET_LIFETIME: 3,
    BULLET_SIZE: 3,
    BULLET_PULSE_SPEED: 0.2,
    THRUST: 0.5,
    INVULNERABILITY_TIME: 180,
    SPAWN_EFFECT_DURATION: 60,
    SPAWN_PARTICLES: 20,
    SPAWN_CHANCE: 0.3,
    BASE_SPAWN_INTERVAL: 15000,
    MIN_SPAWN_INTERVAL: 5000,
    SPAWN_INTERVAL_DECREASE: 1000,
    SPAWN_DELAY: 20000,
    SPAWN_RANDOM: 10000,
    DEBRIS_COUNT: 15,
    DEBRIS_SPEED: 3,
    DEBRIS_LIFETIME: 60,
    EXPLOSION_RADIUS: 40,
    HEALTH_INCREASE_LEVELS: 3,
    SCORE_INCREASE_LEVELS: 2
  },

  // Battlestar Configuration
  BATTLESTAR: {
    WIDTH: 200,
    HEIGHT: 80,
    SPEED: 1.5,
    MAX_HEALTH: 10,
    DAMAGE_THRESHOLDS: [7, 4, 1],
    CANNON_COUNT: 4,
    FIRE_RATE: 90,
    BULLET_SPEED: 4,
    BULLET_SIZE: 4,
    POINTS: 5000,
    INVULNERABILITY_TIME: 180,
    EXPLOSION_PARTICLES: 50,
    EXPLOSION_DURATION: 120
  },

  // Score System
  SCORE: {
    POPUP_LIFETIME: 60,
    POPUP_SPEED: 2.5,
    POPUP_FADE_START: 45,
    POPUP_BOUNCE_AMPLITUDE: 0.3,
    POPUP_OFFSET_RANGE: 30,
    HIGH_SCORE_COUNT: 15,
    VALUES: {
      ASTEROID_LARGE: 100,
      ASTEROID_MEDIUM: 200,
      ASTEROID_SMALL: 300,
      ALIEN: 1000,
      BATTLESTAR: 5000,
      BATTLESTAR_HIT: 100
    }
  },

  // Animation Configuration
  ANIMATION: {
    TITLE_HOVER_SPEED: 0.02,
    TITLE_HOVER_RANGE: 40,
    TITLE_DAMPING: 0.9995,
    TITLE_SPRING: 0.001,
    TITLE_TRAIL_COUNT: 5,
    SCROLL_SPEED: 10
  },

  // Audio Configuration
  AUDIO: {
    MASTER_VOLUME: 0.7,
    SFX_VOLUME: 0.5,
    THRUST_VOLUME: 0.25
  },

  // UI Configuration
  UI: {
    FONT_FAMILY: '"Press Start 2P", monospace',
    FONT_SIZE_SMALL: 12,
    FONT_SIZE_MEDIUM: 16,
    FONT_SIZE_LARGE: 22,
    FONT_SIZE_TITLE: 28,
    LINE_HEIGHT: 1.5,
    PADDING: 20,
    MARGIN: 10
  },

  // Colors
  COLORS: {
    SHIP: '#FFFFFF',
    ASTEROID: '#A0A0A0',
    BULLET: '#FFFFFF',
    ALIEN: '#FF0000',
    BATTLESTAR: '#FF4500',
    SCORE_SMALL: ['#64DFDF', '#56CBF9', '#7B2CBF'],
    SCORE_MEDIUM: ['#FF9F1C', '#FFBF69', '#F4A261'],
    SCORE_LARGE: ['#F72585', '#B5179E', '#7209B7'],
    LEVEL_BONUS: '#FFFF00',
    BACKGROUND: '#000000',
    TEXT: '#FFFFFF',
    THRUST_GRADIENT: {
      CORE: 'rgba(255, 255, 255, 0.9)',
      YELLOW: 'rgba(255, 200, 50, 0.8)',
      ORANGE: 'rgba(255, 100, 50, 0.6)',
      RED: 'rgba(255, 50, 50, 0)'
    }
  },

  // Physics Configuration
  PHYSICS: {
    GRAVITY: 0,
    COLLISION_BUFFER: 2,
    EDGE_WRAP_BUFFER: 50,
    PREDICTION_TIME: 30,
    SPREAD_ANGLE: Math.PI / 8,
    FRICTION_POWER: 0.99
  },

  // Difficulty Scaling
  DIFFICULTY: {
    LEVEL_SCORE_MULTIPLIER: 1.2,
    ALIEN_HEALTH_INCREASE_LEVELS: 3,
    ALIEN_SCORE_INCREASE_LEVELS: 2,
    ASTEROID_SIZE_SHRINK_LEVELS: 5,
    MAX_LEVEL: 100
  },

  // Spawn Configuration
  SPAWN: {
    ALIEN_POSITIONS: [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.9 },
      { x: 0.9, y: 0.9 }
    ],
    SAFE_ZONE_RADIUS: 100
  }
};

// Freeze the configuration to prevent runtime modifications
Object.freeze(GameConfig);

// Export for module systems (if available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameConfig;
} 