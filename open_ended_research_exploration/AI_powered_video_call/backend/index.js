// WebRTC Application with Signaling Server(Socket.io) + Node.js + Express
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { client } from './src/services/redis.js';
import meeting from "./src/routes/meeting_room.js";
import openai from "./src/routes/openai.js";
import dotenv from "dotenv";
import { createTable } from "./src/services/awsDynamoDB.js";
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming";
import { storeTranscription } from "./src/controllers/dynamoDB_controller.js";
import { addTranscription, getTranscriptions, processQuestion } from "./src/services/openai.js";

dotenv.config();
createTable();

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Be careful with this in production
    methods: ["GET", "POST"]
  }
});

// AWS Transcribe client
const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Be careful with this in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Express app and enable JSON parsing middleware
app.use(express.json());

app.get('/', (req, res) => res.send('Hello World'));
app.use("/api/meeting", meeting);
app.use("/api/openai", openai);

// Track transcription storage intervals by meeting
const transcriptionIntervals = {};

// Create a 10-second interval for a meeting to store and process transcripts
const createTranscriptionInterval = (meetingId) => {
  // Clear any existing interval
  if (transcriptionIntervals[meetingId]) {
    clearInterval(transcriptionIntervals[meetingId]);
  }
  
  // Collect transcriptions for this meeting
  const meetingTranscripts = {};
  
  // Create a new interval
  transcriptionIntervals[meetingId] = setInterval(async () => {
    // Only process if we have new transcripts
    if (meetingTranscripts[meetingId] && meetingTranscripts[meetingId].length > 0) {
      console.log(`Processing ${meetingTranscripts[meetingId].length} pending transcripts for meeting ${meetingId}`);
      
      // Join all pending transcripts
      const combinedTranscript = meetingTranscripts[meetingId].join(" ");
      
      // Reset the pending transcripts
      meetingTranscripts[meetingId] = [];
      
      try {
        // Store in DynamoDB
        await storeTranscription(meetingId, combinedTranscript);
        
        // Add to OpenAI context
        await addTranscription(meetingId, combinedTranscript);
        
        console.log(`Stored and processed transcription block for meeting ${meetingId}`);
      } catch (error) {
        console.error(`Error processing transcription interval for meeting ${meetingId}:`, error);
      }
    }
  }, 10000); // 10 seconds
  
  console.log(`Created 10-second transcription interval for meeting ${meetingId}`);
  
  // Return a function to accumulate transcripts
  return (transcript) => {
    if (!meetingTranscripts[meetingId]) {
      meetingTranscripts[meetingId] = [];
    }
    meetingTranscripts[meetingId].push(transcript);
  };
};

// Clean up interval for a meeting
const cleanupTranscriptionInterval = (meetingId) => {
  if (transcriptionIntervals[meetingId]) {
    clearInterval(transcriptionIntervals[meetingId]);
    delete transcriptionIntervals[meetingId];
    console.log(`Cleaned up transcription interval for meeting ${meetingId}`);
    return true;
  }
  return false;
};

io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);
    console.log("Active connections:", io.engine.clientsCount);

    // Transcription session variables
    let transcribeStream = null;
    let isTranscribing = false;
    let currentMeetingId = null;
    let addTranscriptFn = null;

    socket.on("join-meeting", (meetingID) => {
        console.log(`User ${socket.id} joining meeting: ${meetingID}`);
        socket.join(meetingID);
        console.log(`Rooms for this socket:`, socket.rooms);
        
        // Store the current meeting ID
        currentMeetingId = meetingID;
        
        // Notify others in the room that a new user has joined
        socket.to(meetingID).emit("user-joined", { id: socket.id });
    });

    socket.on("disconnect", (reason) => {
        console.log("🔴 User disconnected:", socket.id, "Reason:", reason);
        
        // Get all rooms this socket was in
        const rooms = Array.from(socket.rooms);
        
        // Notify others in each room that this user has left
        rooms.forEach(room => {
            if (room !== socket.id) { // Skip the room that's the socket's own ID
                socket.to(room).emit("user-left", { id: socket.id });
            }
        });

        // Clean up transcription resources if active
        if (isTranscribing && transcribeStream) {
            try {
                transcribeStream.AudioStream.end();
                transcribeStream = null;
                isTranscribing = false;
                console.log("Transcription ended due to disconnect");
            } catch (error) {
                console.error("Error ending transcription on disconnect:", error);
            }
        }
        
        // Clear transcription interval if this was the last user in a meeting
        if (currentMeetingId) {
            const meetingRoom = io.sockets.adapter.rooms.get(currentMeetingId);
            if (!meetingRoom || meetingRoom.size === 0) {
                cleanupTranscriptionInterval(currentMeetingId);
            }
        }
    });

    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });

    socket.on("send-offer", ({ meetingID, offer }) => {
        console.log(`📤 Forwarding offer for meeting ${meetingID}`);
        socket.to(meetingID).emit("receive-offer", { offer });
    });

    socket.on("send-answer", ({ meetingID, answer }) => {
        console.log(`📤 Forwarding answer for meeting ${meetingID}`);
        socket.to(meetingID).emit("receive-answer", { answer });
    }); 

    socket.on("send-ice-candidate", ({ meetingID, candidate }) => {
        console.log(`ICE Candidate received for meeting ${meetingID}`);
        socket.to(meetingID).emit("receive-ice-candidate", { candidate });
    });
    
    // Handle transcription broadcasting
    socket.on("broadcast-transcription", async ({ meetingId, transcript }) => {
        console.log(`Broadcasting transcription in meeting ${meetingId}: ${transcript.substring(0, 30)}${transcript.length > 30 ? '...' : ''}`);
        
        // Broadcast transcription to all other users in the meeting
        socket.to(meetingId).emit("receive-transcription", { transcript });
        
        try {
            // Add to OpenAI context and queue for storage
            await addTranscription(meetingId, transcript);
            console.log(`Added transcription to OpenAI context for meeting ${meetingId}`);
            
            // Add to interval-based storage if available
            if (addTranscriptFn) {
                addTranscriptFn(transcript);
                console.log(`Added transcription to interval storage for meeting ${meetingId}`);
            } else {
                console.log(`Warning: No addTranscriptFn available for meeting ${meetingId}`);
            }
        } catch (error) {
            console.error(`Error handling transcription for meeting ${meetingId}:`, error);
        }
    });
    
    // Handle transcription start notification
    socket.on("transcription-started", ({ meetingId }) => {
        console.log(`Transcription started in meeting ${meetingId} by ${socket.id}`);
        
        // Create the interval for this meeting if not already exists
        if (!transcriptionIntervals[meetingId]) {
            addTranscriptFn = createTranscriptionInterval(meetingId);
        }
        
        // Notify all other users that transcription has started
        socket.to(meetingId).emit("transcription-status", { 
            isActive: true,
            startedBy: socket.id
        });
    });
    
    // Handle transcription stop notification
    socket.on("transcription-stopped", ({ meetingId }) => {
        console.log(`Transcription stopped in meeting ${meetingId} by ${socket.id}`);
        
        // Notify all other users that transcription has stopped
        socket.to(meetingId).emit("transcription-status", { 
            isActive: false,
            stoppedBy: socket.id
        });
    });
    
    // Handle assistant questions
    socket.on("ask-assistant", async ({ meetingId, question }) => {
        console.log(`Assistant question from ${socket.id} in meeting ${meetingId}: "${question}"`);
        
        try {
            // Debug: Check if we have transcription data for this meeting
            const transcriptions = getTranscriptions(meetingId);
            console.log(`Found ${transcriptions.length} transcriptions for meeting ${meetingId} to process question`);
            
            const response = await processQuestion(meetingId, question);
            
            // Send the answer back to the client
            socket.emit("assistant-response", {
                success: true,
                answer: response.answer || response.message
            });
            console.log(`Sent assistant response to client for meeting ${meetingId}`);
        } catch (error) {
            console.error("Error processing assistant question:", error);
            console.error(error.stack); // Log the full stack trace
            socket.emit("assistant-response", {
                success: false,
                message: "Failed to process your question. Please try again."
            });
        }
    });
    
    // Handle transcription commands
    socket.on("start-transcription", async () => {
        console.log(`Starting transcription for socket ${socket.id}`);
        
        if (isTranscribing) {
            console.log("Transcription already in progress");
            return;
        }
        
        try {
            const command = new StartStreamTranscriptionCommand({
                LanguageCode: 'en-US',
                MediaEncoding: 'pcm',
                MediaSampleRateHertz: 16000,
            });

            transcribeStream = await transcribeClient.send(command);
            isTranscribing = true;

            // Handle transcription responses
            (async () => {
                try {
                    for await (const event of transcribeStream.TranscriptResultStream) {
                        if (event.TranscriptEvent?.Transcript?.Results?.length > 0) {
                            const results = event.TranscriptEvent.Transcript.Results;
                            for (const result of results) {
                                if (!result.IsPartial && result.Alternatives?.[0]?.Transcript) {
                                    const transcript = result.Alternatives[0].Transcript;
                                    
                                    // Send to the client
                                    socket.emit("transcription-result", {
                                        transcript
                                    });
                                    
                                    // Add to OpenAI context
                                    if (currentMeetingId) {
                                        try {
                                            await addTranscription(currentMeetingId, transcript);
                                            
                                            // Add to interval storage queue
                                            if (addTranscriptFn) {
                                                addTranscriptFn(transcript);
                                            }
                                        } catch (error) {
                                            console.error("Error adding transcription to context:", error);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error in transcription stream:", error);
                    socket.emit("transcription-error", { message: "Transcription stream error" });
                }
            })();
            
            console.log("Transcription started successfully");
        } catch (error) {
            console.error("Error starting transcription:", error);
            socket.emit("transcription-error", { message: "Failed to start transcription" });
        }
    });
    
    socket.on("stop-transcription", () => {
        console.log(`Stopping transcription for socket ${socket.id}`);
        
        if (transcribeStream) {
            try {
                transcribeStream.AudioStream.end();
                console.log("Transcription stream ended");
            } catch (error) {
                console.error("Error ending transcription stream:", error);
            }
        }
        
        transcribeStream = null;
        isTranscribing = false;
    });
    
    socket.on("transcription-audio", (data) => {
        if (!isTranscribing || !transcribeStream) {
            return;
        }
        
        try {
            // Convert array back to Uint8Array
            const audioData = new Uint8Array(data.audio);
            // Create a buffer for AWS Transcribe
            const buffer = Buffer.from(audioData.buffer);
            // Send to AWS Transcribe
            transcribeStream.AudioStream.writeChunk(buffer);
        } catch (error) {
            console.error("Error sending audio to transcribe:", error);
        }
    });
});


// Modified server startup
const startServer = async () => {
  try {
    await client.connect();
    console.log('Successfully connected to Redis Cloud');
    
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Socket.IO is listening for connections`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        httpServer.listen(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();