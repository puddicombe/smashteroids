/**
 * AudioManager - Centralized audio system for SMASHTEROIDS
 * 
 * Handles all game audio including:
 * - Sound effect generation using Web Audio API
 * - Audio context management
 * - Sound playback and control
 * - AudioWorklet integration
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundFX = {
            fire: null,
            thrust: null,
            bangLarge: null,
            bangMedium: null,
            bangSmall: null,
            explode: null,
            alienSpawn: null,
            alienFire: null
        };
        
        // Audio state tracking
        this.thrustGainNode = null;
        this.masterGainNode = null;
        this.isInitialized = false;
        this.audioWorkletLoaded = false;
        this.fallbackMode = false;
        
        // Audio settings from GameConfig
        this.masterVolume = GameConfig.AUDIO.MASTER_VOLUME;
        this.sfxVolume = GameConfig.AUDIO.SFX_VOLUME;
        this.thrustVolume = GameConfig.AUDIO.THRUST_VOLUME;
    }

    /**
     * Initialize the audio system
     * Must be called after user interaction for Chrome's autoplay policy
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.createAudioContext();
            await this.loadAudioWorklet();
            this.createMasterGainNode();
            this.isInitialized = true;
            console.log('AudioManager initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize AudioManager, falling back to basic audio:', error);
            this.createFallbackAudioSystem();
            this.fallbackMode = true;
            this.isInitialized = true;
        }
    }

    /**
     * Create and configure the audio context
     */
    async createAudioContext() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            return;
        }

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume context if suspended (required for Chrome)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Load AudioWorklet for advanced audio processing
     */
    async loadAudioWorklet() {
        if (!this.audioContext || this.audioWorkletLoaded) return;

        try {
            await this.audioContext.audioWorklet.addModule('/audioWorklet.js');
            this.audioWorkletLoaded = true;
            console.log('AudioWorklet loaded successfully');
        } catch (error) {
            console.warn('Failed to load AudioWorklet:', error);
            throw error;
        }
    }

    /**
     * Create master gain node for volume control
     */
    createMasterGainNode() {
        if (!this.audioContext) return;

        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.gain.value = this.masterVolume;
        this.masterGainNode.connect(this.audioContext.destination);
    }

    /**
     * Play thrust sound with dynamic control
     */
    playThrustSound(shouldPlay) {
        if (!this.isInitialized || this.fallbackMode) return;

        try {
            if (shouldPlay && !this.thrustGainNode) {
                // Create thrust sound chain
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filterNode = this.audioContext.createBiquadFilter();

                // Configure oscillator for engine sound
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);

                // Configure filter for engine character
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(300, this.audioContext.currentTime);
                filterNode.Q.setValueAtTime(2, this.audioContext.currentTime);

                // Configure gain
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.thrustVolume, this.audioContext.currentTime + 0.1);

                // Connect audio chain
                oscillator.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(this.masterGainNode);

                // Start oscillator
                oscillator.start();

                // Store references
                this.thrustGainNode = gainNode;
                this.thrustOscillator = oscillator;
                this.thrustFilter = filterNode;

                // Add some variation to the thrust sound
                this.addThrustVariation();
                
            } else if (!shouldPlay && this.thrustGainNode) {
                // Stop thrust sound
                this.thrustGainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
                
                setTimeout(() => {
                    if (this.thrustOscillator) {
                        this.thrustOscillator.stop();
                        this.thrustOscillator = null;
                    }
                    this.thrustGainNode = null;
                    this.thrustFilter = null;
                }, 100);
            }
        } catch (error) {
            console.warn('Error playing thrust sound:', error);
        }
    }

    /**
     * Add variation to thrust sound for more realistic engine noise
     */
    addThrustVariation() {
        if (!this.thrustOscillator || !this.thrustFilter) return;

        const addNoise = () => {
            if (!this.thrustOscillator) return;
            
            const time = this.audioContext.currentTime;
            const freqVariation = 80 + (Math.random() * 40 - 20);
            const filterVariation = 300 + (Math.random() * 200 - 100);
            
            this.thrustOscillator.frequency.setValueAtTime(freqVariation, time);
            this.thrustFilter.frequency.setValueAtTime(filterVariation, time);
            
            setTimeout(addNoise, 50 + Math.random() * 100);
        };
        
        addNoise();
    }

    /**
     * Play a sound effect
     */
    playSound(soundType, options = {}) {
        if (!this.isInitialized) return;

        if (this.fallbackMode) {
            this.playFallbackSound(soundType);
            return;
        }

        try {
            switch (soundType) {
                case 'fire':
                    this.createFireSound(options);
                    break;
                case 'bangLarge':
                case 'bangMedium':
                case 'bangSmall':
                    this.createExplosionSound(soundType, options);
                    break;
                case 'explode':
                    this.createShipExplosionSound(options);
                    break;
                case 'alienSpawn':
                    this.createAlienSpawnSound(options);
                    break;
                case 'alienFire':
                    this.createAlienFireSound(options);
                    break;
                default:
                    console.warn(`Unknown sound type: ${soundType}`);
            }
        } catch (error) {
            console.warn(`Error playing sound ${soundType}:`, error);
        }
    }

    /**
     * Create fire sound effect
     */
    createFireSound(options = {}) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        // Sharp, quick laser sound
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);

        // High-pass filter for crispness
        filterNode.type = 'highpass';
        filterNode.frequency.setValueAtTime(400, this.audioContext.currentTime);

        // Quick envelope
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

        // Connect and play
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGainNode);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    /**
     * Create explosion sound effects
     */
    createExplosionSound(type, options = {}) {
        // Create noise-based explosion
        const bufferSize = this.audioContext.sampleRate * 0.5; // 0.5 second buffer
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i / bufferSize), 2);
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        source.buffer = buffer;

        // Filter based on explosion size
        filterNode.type = 'lowpass';
        let cutoff, volume;
        switch (type) {
            case 'bangLarge':
                cutoff = 200;
                volume = this.sfxVolume * 0.8;
                break;
            case 'bangMedium':
                cutoff = 400;
                volume = this.sfxVolume * 0.6;
                break;
            case 'bangSmall':
                cutoff = 800;
                volume = this.sfxVolume * 0.4;
                break;
        }

        filterNode.frequency.setValueAtTime(cutoff, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

        // Connect and play
        source.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGainNode);

        source.start();
    }

    /**
     * Create ship explosion sound
     */
    createShipExplosionSound(options = {}) {
        // More dramatic explosion for ship
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(100, this.audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 1);

        oscillator2.type = 'square';
        oscillator2.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 1);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filterNode.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1);

        gainNode.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);

        // Mix oscillators
        const mixer = this.audioContext.createGain();
        mixer.gain.setValueAtTime(0.5, this.audioContext.currentTime);

        oscillator1.connect(mixer);
        oscillator2.connect(mixer);
        mixer.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGainNode);

        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(this.audioContext.currentTime + 1);
        oscillator2.stop(this.audioContext.currentTime + 1);
    }

    /**
     * Create alien spawn sound
     */
    createAlienSpawnSound(options = {}) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.3);

        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(500, this.audioContext.currentTime);
        filterNode.Q.setValueAtTime(3, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGainNode);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    /**
     * Create alien fire sound
     */
    createAlienFireSound(options = {}) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.15);

        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGainNode);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    /**
     * Fallback audio system for when Web Audio API fails
     */
    createFallbackAudioSystem() {
        console.log('Creating fallback audio system');
        
        const createSound = (frequency, duration, type = 'sine') => {
            return () => {
                try {
                    const context = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
                    oscillator.type = type;
                    
                    gainNode.gain.setValueAtTime(0.1, context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
                    
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + duration);
                } catch (e) {
                    console.warn('Fallback audio failed:', e);
                }
            };
        };

        this.soundFX = {
            fire: createSound(800, 0.1, 'square'),
            bangLarge: createSound(100, 0.5, 'sawtooth'),
            bangMedium: createSound(200, 0.3, 'sawtooth'),
            bangSmall: createSound(400, 0.2, 'sawtooth'),
            explode: createSound(80, 1.0, 'sawtooth'),
            alienSpawn: createSound(500, 0.3, 'triangle'),
            alienFire: createSound(300, 0.15, 'sawtooth')
        };
    }

    /**
     * Play fallback sound
     */
    playFallbackSound(soundType) {
        if (this.soundFX[soundType]) {
            this.soundFX[soundType]();
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGainNode) {
            this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        }
    }

    /**
     * Set SFX volume
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set thrust volume
     */
    setThrustVolume(volume) {
        this.thrustVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Cleanup audio resources
     */
    cleanup() {
        if (this.thrustGainNode) {
            this.thrustGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            if (this.thrustOscillator) {
                this.thrustOscillator.stop();
                this.thrustOscillator = null;
            }
            this.thrustGainNode = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.isInitialized = false;
        this.audioWorkletLoaded = false;
    }

    /**
     * Resume audio context (for handling browser tab focus)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Suspend audio context (for handling browser tab blur)
     */
    async suspend() {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
        }
    }
}

// Export for use in main game
window.AudioManager = AudioManager;