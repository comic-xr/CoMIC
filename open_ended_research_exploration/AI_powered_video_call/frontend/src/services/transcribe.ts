// Web Speech API transcription service implementation
import { socket } from './socket';

// TypeScript interface for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
  grammars: any;
}

// Add type declaration for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export class TranscribeService {
  private recognition: SpeechRecognition | null = null;
  private isTranscribing: boolean = false;
  private onTranscriptCallback: ((transcript: string) => void) | null = null;
  private mediaStream: MediaStream | null = null;
  private currentMeetingId: string | null = null;

  constructor() {
    console.log("Initializing TranscribeService with Web Speech API");
    // Check if browser supports Speech Recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser");
    } else {
      console.log("Speech recognition is supported in this browser");
    }
  }

  /**
   * Start transcription with the provided audio stream
   * @param stream The media stream (used for microphone access permission)
   * @param onTranscript Callback function to receive transcripts
   * @param meetingId The current meeting ID for broadcasting
   */
  async startTranscription(
    stream: MediaStream,
    onTranscript: (transcript: string) => void,
    meetingId: string
  ): Promise<boolean> {
    console.log("Starting Web Speech API transcription");
    
    try {
      if (this.isTranscribing) {
        console.warn("Transcription is already running");
        return false;
      }

      // Store the meeting ID for broadcasting
      this.currentMeetingId = meetingId;
      
      // Store the callback
      this.onTranscriptCallback = onTranscript;
      
      // Store the stream reference (though Web Speech API doesn't use it directly)
      this.mediaStream = stream;

      // Check if browser supports Speech Recognition
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        console.error("Speech recognition not supported in this browser");
        return false;
      }

      this.recognition = new SpeechRecognitionAPI();
      
      // Configure recognition
      this.recognition.continuous = true;
      this.recognition.interimResults = false; // We only want final results
      this.recognition.lang = 'en-US';

      // Set up recognition event handlers
      this.recognition.onstart = () => {
        console.log("Speech recognition started");
        this.isTranscribing = true;
        
        // Emit a socket event to let others know transcription started
        socket.emit("transcription-started", { 
          meetingId: this.currentMeetingId 
        });
      };
      
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log("Speech recognition result received", event);
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal && this.onTranscriptCallback && this.currentMeetingId) {
            console.log("Final transcript:", transcript);
            
            // Call the local callback
            this.onTranscriptCallback(transcript);
            
            // Broadcast to all users in the meeting
            socket.emit("broadcast-transcription", {
              meetingId: this.currentMeetingId,
              transcript
            });
            
            // Log to ensure data is being sent correctly
            console.log(`Sent transcript "${transcript.substring(0, 30)}${transcript.length > 30 ? '...' : ''}" to backend for meeting ${this.currentMeetingId}`);
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };
      
      this.recognition.onend = () => {
        console.log("Speech recognition ended");
        // Auto-restart if we're still supposed to be transcribing
        if (this.isTranscribing && this.recognition) {
          console.log("Restarting speech recognition as it ended unexpectedly");
          this.recognition.start();
        }
      };

      // Start recognition
      this.recognition.start();
      console.log("Recognition started successfully");
      
      return true;
    } catch (error) {
      console.error("Failed to start transcription:", error);
      await this.stopTranscription();
      return false;
    }
  }

  /**
   * Stop the transcription service
   */
  async stopTranscription(): Promise<void> {
    console.log("Stopping transcription");
    
    try {
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }
      
      this.isTranscribing = false;
      
      // Notify others that transcription has stopped
      if (this.currentMeetingId) {
        socket.emit("transcription-stopped", { 
          meetingId: this.currentMeetingId 
        });
        this.currentMeetingId = null;
      }
      
      this.onTranscriptCallback = null;
      
      console.log("Transcription stopped successfully");
    } catch (error) {
      console.error("Error stopping transcription:", error);
    }
  }

  /**
   * Set up listeners for transcription events from other users
   * @param onRemoteTranscript Callback to handle transcripts from other users
   */
  setupTranscriptionListeners(onRemoteTranscript: (transcript: string) => void): () => void {
    // Listen for transcripts from other users
    socket.on("receive-transcription", (data) => {
      console.log("Received transcription from another user:", data);
      if (data && data.transcript) {
        onRemoteTranscript(data.transcript);
      }
    });
    
    // Return a cleanup function to remove listeners
    return () => {
      socket.off("receive-transcription");
    };
  }

  /**
   * Check if transcription is currently active
   */
  isActive(): boolean {
    return this.isTranscribing;
  }
}

// Singleton instance
export const transcribeService = new TranscribeService(); 