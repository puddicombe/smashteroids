// Check if we're in the AudioWorklet context
if (typeof AudioWorkletProcessor !== 'undefined') {
  // AudioWorklet processor for generating game sounds
  class SoundGenerator extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [{
        name: 'type',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      }];
    }

    constructor() {
      super();
      this.phase = 0;
      this.type = 'sine';
      this.frequency = 440;
      this.amplitude = 0.5;
      this.duration = 0;
      this.active = false;
      this.startTime = 0;
      
      // Handle messages from the main thread
      this.port.onmessage = (event) => {
        if (event.data.type) {
          this.type = event.data.type;
        }
        if (event.data.start) {
          this.active = true;
          this.startTime = currentFrame / sampleRate;
          this.duration = event.data.duration || 1;
          this.frequency = event.data.frequency || 440;
          // Set amplitude based on sound type
          if (event.data.type === 'thrust') {
            this.amplitude = event.data.amplitude || 0.25; // Reduced from 0.5 to 0.25 for thrust
          } else {
            this.amplitude = event.data.amplitude || 0.5;
          }
        }
        if (event.data.stop) {
          this.active = false;
        }
      };
    }

    process(inputs, outputs, parameters) {
      const output = outputs[0];
      const channel = output[0];
      
      // We'll use the message port for type instead of parameters
      
      // Generate sound based on type
      if (this.active) {
        const currentTime = currentFrame / sampleRate;
        for (let i = 0; i < channel.length; i++) {
          // Check if sound should stop
          if (currentTime - this.startTime > this.duration) {
            this.active = false;
            break;
          }
          
          let sample = 0;
          const t = currentTime - this.startTime;
          
          // Different sound types
          switch(this.type) {
            case 'levelStart':
              // Rising tone for level start
              const freqMod = 200 + 300 * Math.min(t / this.duration, 1);
              sample = this.amplitude * Math.sin(2 * Math.PI * freqMod * this.phase);
              break;
            case 'fire':
              // Short decreasing frequency for firing sound
              const fireFreq = 800 - 400 * Math.min(t / 0.1, 1);
              sample = this.amplitude * Math.sin(2 * Math.PI * fireFreq * this.phase) * 
                       Math.max(0, 1 - t / 0.1);
              break;
            case 'thrust':
              // White noise for thrust
              sample = this.amplitude * (Math.random() * 2 - 1);
              break;
            case 'bangLarge':
              // Low explosion sound with deep rumble for large asteroids
              const largeFreq = 40; // Reduced from 50 to 40 for even deeper rumble
              const largeNoise = Math.random() * 2 - 1;
              const largeTone = Math.sin(2 * Math.PI * largeFreq * this.phase);
              const subBass = Math.sin(2 * Math.PI * 25 * this.phase); // Add sub-bass frequency
              // Mix noise and tone for a rumbling effect with enhanced amplitude
              sample = this.amplitude * 1.5 * (largeTone * 0.5 + largeNoise * 0.3 + subBass * 0.2) * 
                       Math.max(0, 1 - t / 0.9); // Longer duration for big explosion
              break;
            case 'bangMedium':
              // Medium explosion sound - similar to large but lighter
              const mediumFreq = 80; // Between large (40) and small (300)
              const mediumNoise = Math.random() * 2 - 1;
              const mediumTone = Math.sin(2 * Math.PI * mediumFreq * this.phase);
              // Mix noise and tone for a lighter rumbling effect
              sample = this.amplitude * 1.2 * (mediumTone * 0.6 + mediumNoise * 0.4) * 
                       Math.max(0, 1 - t / 0.6); // Medium duration
              break;
            case 'bangSmall':
              // Small explosion sound
              sample = this.amplitude * Math.sin(2 * Math.PI * 300 * this.phase) * 
                       Math.max(0, 1 - t / 0.2);
              break;
            case 'explode':
              // Ship explosion - more complex sound
              const noise = Math.random() * 2 - 1;
              const tone = Math.sin(2 * Math.PI * 150 * this.phase);
              sample = this.amplitude * (noise * 0.7 + tone * 0.3) * 
                       Math.max(0, 1 - t / 0.8);
              break;
            default:
              // Default sine wave
              sample = this.amplitude * Math.sin(2 * Math.PI * this.frequency * this.phase);
          }
          
          channel[i] = sample;
          this.phase += 1/sampleRate;
          if (this.phase > 1) this.phase -= 1;
        }
      } else {
        // If not active, output silence
        for (let i = 0; i < channel.length; i++) {
          channel[i] = 0;
        }
      }
      
      // Keep the processor alive
      return true;
    }
  }

  // Register the processor
  registerProcessor('sound-generator', SoundGenerator);
} else {
  // If loaded in the main thread, do nothing
} 