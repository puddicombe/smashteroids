export class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.thrustOscillator = null;
        this.initialized = false;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;

            // Add click handler to resume audio context (browser policy)
            if (this.audioContext.state === 'suspended') {
                const resumeAudio = () => {
                    this.audioContext.resume().then(() => {
                        document.removeEventListener('click', resumeAudio);
                        document.removeEventListener('keydown', resumeAudio);
                    });
                };
                
                document.addEventListener('click', resumeAudio);
                document.addEventListener('keydown', resumeAudio);
            }
        } catch (e) {
            console.error('Audio system initialization failed:', e);
            this.initialized = false;
        }
    }

    playSound(soundType) {
        if (!this.initialized || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            switch (soundType) {
                case 'fire':
                    this.playFireSound(oscillator, gainNode);
                    break;
                case 'bangLarge':
                    this.playExplosionSound(oscillator, gainNode, 60, 30, 0.5, 0.5);
                    break;
                case 'bangMedium':
                    this.playExplosionSound(oscillator, gainNode, 120, 60, 0.4, 0.3);
                    break;
                case 'bangSmall':
                    this.playExplosionSound(oscillator, gainNode, 180, 90, 0.3, 0.2);
                    break;
                case 'explode':
                    this.playShipExplosion();
                    break;
            }
        } catch (e) {
            console.error('Error playing sound:', e);
        }
    }

    playFireSound(oscillator, gainNode) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    playExplosionSound(oscillator, gainNode, startFreq, endFreq, volume, duration) {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playShipExplosion() {
        const noise = this.audioContext.createOscillator();
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(100, this.audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.8);
        
        noiseGain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + 0.8);
    }

    playThrustSound(play) {
        if (!this.initialized || !this.audioContext) return;

        try {
            if (play) {
                if (this.thrustOscillator) return; // Already playing

                this.thrustOscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();

                this.thrustOscillator.type = 'sawtooth';
                this.thrustOscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);

                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
                filter.Q.setValueAtTime(1, this.audioContext.currentTime);

                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);

                this.thrustOscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                this.thrustOscillator.start();
            } else {
                if (this.thrustOscillator) {
                    this.thrustOscillator.stop();
                    this.thrustOscillator.disconnect();
                    this.thrustOscillator = null;
                }
            }
        } catch (e) {
            console.error('Error with thrust sound:', e);
        }
    }

    testSound() {
        if (!this.initialized) {
            this.init();
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 1);
        } catch (e) {
            console.error('Error playing test sound:', e);
        }
    }
} 