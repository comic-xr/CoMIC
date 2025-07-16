// Audio processor worklet for Amazon Transcribe
// This handles audio processing for WebRTC stream to be sent to Transcribe API

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // Buffer size suitable for transcription
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleRate = 16000; // Amazon Transcribe expects 16kHz sample rate
    this.initialized = false;
  }

  process(inputs, outputs, parameters) {
    // Get the input data
    const input = inputs[0];
    
    // If there's no input, just continue
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    // Add input data to the buffer
    const channelData = input[0];
    
    for (let i = 0; i < channelData.length; i++) {
      if (this.bufferIndex < this.bufferSize) {
        this.buffer[this.bufferIndex++] = channelData[i];
      }
      
      // If buffer is full, send it and reset
      if (this.bufferIndex >= this.bufferSize) {
        // Convert to 16-bit PCM (format expected by Amazon Transcribe)
        const pcmData = this.floatTo16BitPCM(this.buffer);
        
        // Send audio chunk to the main thread
        this.port.postMessage({
          audioChunk: pcmData.buffer,
        });
        
        // Reset buffer
        this.bufferIndex = 0;
        this.buffer = new Float32Array(this.bufferSize);
      }
    }
    
    return true;
  }
  
  // Convert Float32Array to Int16Array for Amazon Transcribe
  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Convert float values (-1.0 to 1.0) to int16 values (-32768 to 32767)
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }
}

registerProcessor('audio-processor', AudioProcessor); 