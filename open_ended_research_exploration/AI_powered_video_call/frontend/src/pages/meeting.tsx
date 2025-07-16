import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  createAnswer,
  createOffer,
  receiveIceCandidate,
  peer,
  handleAnswer,
} from "../services/sdp";
import { connectSocket, disconnectSocket, socket } from "../services/socket";
import { GetMeetingID } from "../services/meeting";
import { transcribeService } from "../services/transcribe";
import { ChatBox, ChatBoxRef } from "../components/ChatBox";

const MeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams<{ meetingId: string }>();
  const [host, setHost] = useState<string>("");
  const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [remoteTranscribing, setRemoteTranscribing] = useState<boolean>(false);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState<boolean>(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const isHost = useRef<boolean>(false);
  const chatBoxRef = useRef<ChatBoxRef>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const transcriptionSaveTimerRef = useRef<number | null>(null);

  const hostNameInBrowser = localStorage.getItem("host");

  const videoRef = useRef<HTMLVideoElement>(null);

  // Function to save transcripts to DynamoDB
  const saveTranscriptsToDb = async () => {
    if (!meetingId || transcripts.length === 0) return;

    try {
      console.log(`Saving ${transcripts.length} transcripts to DynamoDB for meeting ${meetingId}`);
      await fetch(`${import.meta.env.VITE_API_URL}/meeting/transcription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId,
          transcript: transcripts.join(" "),
        }),
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      }).then(data => {
        console.log("✅ Transcripts saved to DynamoDB successfully:", data);
      });
    } catch (err) {
      console.error("❌ Failed to save transcripts to DynamoDB", err);
      // Retry once after a short delay if we hit an error
      setTimeout(async () => {
        try {
          console.log("Retrying transcript save...");
          await fetch(`${import.meta.env.VITE_API_URL}/meeting/transcription`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meetingId,
              transcript: transcripts.join(" "),
            }),
          });
          console.log("✅ Retry successful");
        } catch (retryErr) {
          console.error("❌ Retry failed:", retryErr);
        }
      }, 1000);
    }
  };

  // Function to handle transcription toggle
  const toggleTranscription = async () => {
    if (!meetingId) return;
    
    if (isTranscribing) {
      // Stop transcription
      if (transcripts && transcripts.length > 0) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/meeting/transcription`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meetingId,
              transcript: transcripts.join(" "), // Send just one at a time
            }),
          });
        } catch (err) {
          console.error("❌ Failed to send transcript to backend", err);
        }
      }

      // Clear the periodic save timer if it exists
      if (transcriptionSaveTimerRef.current) {
        clearInterval(transcriptionSaveTimerRef.current);
        transcriptionSaveTimerRef.current = null;
      }

      await transcribeService.stopTranscription();
      setIsTranscribing(false);
    } else {
      // Start transcription
      const success = await transcribeService.startTranscription(
        new MediaStream(), // Web Speech API doesn't need the media stream
        (transcript) => {
          setTranscripts((prev) => [...prev, transcript]);
        },
        meetingId
      );

      setIsTranscribing(success);
      
      // Start periodic save timer if transcription started successfully
      if (success) {
        // Set up timer to save transcripts every 10 seconds
        transcriptionSaveTimerRef.current = window.setInterval(() => {
          saveTranscriptsToDb();
        }, 10000); // 10 seconds
      }
    }
  };

  // Set up listeners for remote transcription events
  useEffect(() => {
    if (!meetingId) return;
    
    // Setup listeners for transcription from other users
    const cleanup = transcribeService.setupTranscriptionListeners((transcript) => {
      console.log("Received transcript from remote user:", transcript);
      setTranscripts((prev) => [...prev, transcript]);
    });
    
    // Store the cleanup function
    cleanupListenersRef.current = cleanup;
    
    // Listen for transcription status updates
    socket.on("transcription-status", (data) => {
      console.log("Transcription status update:", data);
      setRemoteTranscribing(data.isActive);
    });
    
    return () => {
      // Clean up transcription listeners
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
      }
      
      socket.off("transcription-status");
    };
  }, [meetingId]);

  // Initialize or reinitialize the connection
  const initializeConnection = async (meetingId: string) => {
    try {
      const response: any = await GetMeetingID(meetingId);
      const data = JSON.parse(response.meetingRoom);

      console.log("Meeting data:", data, "Host in browser:", hostNameInBrowser);
      setHost(data.name);
      
      // Determine if current user is the host
      isHost.current = data.name === hostNameInBrowser;
      
      // If we're the host, create an offer
      if (isHost.current) {
        console.log("I am the host, creating offer");
        createOffer(meetingId);
      } else {
        console.log("I am not the host, waiting for offer");
      }
    } catch (error) {
      console.error("Error initializing connection:", error);
    }
  };

  // No longer need this placeholder function as we're using the OpenAI assistant
  // through the ChatBox component directly with useAssistant={true}
  const handleSendChatMessage = async (message: string): Promise<void> => {
    // This is now just a fallback in case we don't want to use the assistant
    if (!meetingId) return;
    
    setIsChatProcessing(true);
    
    // Add a simple response
    if (chatBoxRef.current) {
      chatBoxRef.current.addBotMessage("This message is handled by the local handler, not the AI assistant.");
    }
    
    setIsChatProcessing(false);
  };

  // Handle reconnection attempts
  const handleReconnection = () => {
    // Only the host initiates reconnection with a new offer
    if (isHost.current) {
      console.log("Host attempting to reconnect...");
      
      // Clear any existing reconnection timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      // Set a timer to recreate the offer if not connected
      reconnectTimerRef.current = setTimeout(() => {
        if (!peerConnected && socket.connected && meetingId) {
          console.log("Creating new offer after connection loss");
          
          // Reset peer connection before creating a new offer
          if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
            console.log("Resetting peer connection before new offer");
            // We'll reuse existing stream when recreating the offer
            const existingStream = videoRef.current?.srcObject as MediaStream;
            if (existingStream) {
              createOffer(meetingId);
            }
          } else if (peer.connectionState === 'disconnected') {
            // Just try one more offer if disconnected
            createOffer(meetingId);
          }
          
        }
      }, 5000); // First retry after 5 seconds
    }
  };

  // Monitor peer connection state changes
  useEffect(() => {
    if (!peer) return;
    
    const handleConnectionChange = () => {
      console.log("Peer connection state:", peer.connectionState);
      if (peer.connectionState === 'connected') {
        setPeerConnected(true);
        
        // Clear reconnection timer if we're connected
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      } else if (peer.connectionState === 'disconnected' || 
                peer.connectionState === 'failed' || 
                peer.connectionState === 'closed') {
        setPeerConnected(false);
        
        // Start reconnection process if connection is lost
        handleReconnection();
      }
    };
    
    peer.addEventListener('connectionstatechange', handleConnectionChange);
    
    return () => {
      peer.removeEventListener('connectionstatechange', handleConnectionChange);
      
      // Clear reconnection timer on cleanup
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) {
      navigate("/");
      return;
    }

    setPeerConnected(false);
    setParticipants([]);

    // Setup video stream first
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log("Got local media stream:", stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Clear existing tracks before adding new ones
          const senders = peer.getSenders();
          senders.forEach(sender => {
            peer.removeTrack(sender);
          });
          
          // Add tracks to the peer connection
          stream.getTracks().forEach((track) => {
            console.log(`Adding track to peer: ${track.kind}`);
            peer.addTrack(track, stream);
          });
          
          // Manually check if the local video is playing
          videoRef.current.onloadedmetadata = () => {
            console.log("Local video metadata loaded");
            videoRef.current?.play()
              .then(() => console.log("Local video playing"))
              .catch(err => console.error("Error playing local video:", err));
          };
        }
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    // Add peer connection track handler
    peer.ontrack = (event) => {
      console.log("🎥 Remote track received:", event.streams[0]);
      
      // Print track details
      event.streams[0].getTracks().forEach(track => {
        console.log(`Remote track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      });
      
      if (!remoteVideoRef.current) {
        console.error("Remote video element not found!");
        return;
      }

      try {
        // Store the remote stream and force a UI update by setting state
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log("Remote video stream set successfully");
        
        // Set a state to force re-render which helps update the video
        setPeerConnected(true);

        // Add event listeners to verify video is playing
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log("Remote video metadata loaded");
          remoteVideoRef.current
            ?.play()
            .then(() => console.log("Remote video playing"))
            .catch((err) => console.error("Error playing remote video:", err));
        };

        remoteVideoRef.current.onerror = (e) => {
          console.error("Remote video error:", e);
        };
      } catch (error) {
        console.error("Error setting remote stream:", error);
      }
    };

    // Add debug logs for socket connection
    console.log("Attempting to connect socket...");
    connectSocket();
    console.log("Socket connection initiated");

    socket.on("connect", () => {
      console.log("Socket connected successfully with ID:", socket.id);
      socket.emit("join-meeting", meetingId);
      console.log("Joined meeting room:", meetingId);
      
      // Initialize connection after socket is connected
      initializeConnection(meetingId);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Track who's in the meeting
    socket.on("user-joined", (userData) => {
      console.log("User joined the meeting:", userData);
      
      // Add to participants list if not already there
      setParticipants(prev => {
        if (prev.includes(userData.id)) {
          return prev;
        }
        return [...prev, userData.id];
      });
      
      // If we're the host and someone new joined, send an offer
      // But only if we're not already connected to avoid redundant offers
      if (isHost.current && !peerConnected) {
        console.log("Host sending offer to newly joined user");
        // Add slight delay to ensure the other side is ready to receive the offer
        setTimeout(() => {
          createOffer(meetingId);
        }, 1000);
      }
    });
    
    socket.on("user-left", (userData) => {
      console.log("User left the meeting:", userData);
      setParticipants(prev => prev.filter(id => id !== userData.id));
      
      // If peer was connected and the remote user left, update the connection state
      if (peerConnected && remoteVideoRef.current?.srcObject) {
        console.log("Remote user left, resetting connection state");
        setPeerConnected(false);
        // Clear the remote video
        if (remoteVideoRef.current) {
          const stream = remoteVideoRef.current.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          remoteVideoRef.current.srcObject = null;
        }
      }
    });

    // Setup socket listeners
    socket.on("receive-offer", (data) => {
      console.log("📨 Offer Received:", data.offer);
      if (data.offer) {
        setOffer(data.offer);
        createAnswer(meetingId, data.offer);
      }
    });

    socket.on("receive-answer", async (data) => {
      console.log("📨 Answer Received:", data.answer);
      await handleAnswer(data.answer);
    });

    socket.on("receive-ice-candidate", (data) => {
      console.log("📨 ICE Candidate Received:", data.candidate);
      receiveIceCandidate(data.candidate);
    });

    // Cleanup
    return () => {
      // Stop transcription if active
      if (isTranscribing) {
        transcribeService.stopTranscription();
      }
      
      // Clear transcript save timer
      if (transcriptionSaveTimerRef.current) {
        clearInterval(transcriptionSaveTimerRef.current);
        transcriptionSaveTimerRef.current = null;
      }
      
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      
      // Clear any reconnection timers
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      socket.emit("leave-meeting", meetingId);
      socket.off("receive-offer");
      socket.off("receive-answer");
      socket.off("receive-ice-candidate");
      socket.off("user-joined");
      socket.off("user-left");
      disconnectSocket();
    };
  }, [meetingId]);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);


  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Meeting hosted by {host}
            </h2>
            <div className="text-sm text-gray-500 flex items-center">
              <span>ID: {meetingId}</span>
              <button
                onClick={() => navigator.clipboard.writeText(meetingId || '')}
                className="ml-2 text-gray-400 hover:text-gray-600"
                title="Copy meeting ID"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center text-sm mt-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${peerConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">
                {peerConnected ? 'Connected' : 'Not connected'} · {participants.length} participant(s)
              </span>
              {remoteTranscribing && !isTranscribing && (
                <span className="ml-3 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                  Remote transcription active
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {isHost.current && (
              <button 
                onClick={toggleTranscription}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  isTranscribing 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isTranscribing ? 'Stop Transcription' : 'Start Transcription'}
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video section - takes 2/3 on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local video */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="relative aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 text-sm rounded">
                    You {isHost.current ? "(Host)" : ""}
                  </div>
                </div>
              </div>

              {/* Remote video */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="relative aspect-video bg-gray-800">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 text-sm rounded">
                    Remote User
                  </div>
                  {!remoteVideoRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50 text-sm">
                      Waiting for remote user...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transcription box */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Live Transcription</h3>
              </div>
              <div className="bg-gray-50 rounded border border-gray-200 p-3 h-64 overflow-y-auto">
                {transcripts.length > 0 ? (
                  transcripts.map((text, index) => (
                    <p key={index} className="mb-2 text-gray-700 text-sm">{text}</p>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">
                    {isHost.current 
                      ? "Click 'Start Transcription' to begin..." 
                      : "Waiting for host to start transcription..."}
                  </p>
                )}
              </div>
              {!isHost.current && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  <p>Only the host can start or stop transcription. All participants see the transcriptions.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat section with AI Assistant */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm h-full">
              <h3 className="font-medium text-gray-900 p-4 border-b border-gray-200">
                AI Assistant
                <span className="text-xs ml-2 text-gray-500">Ask questions about the meeting</span>
              </h3>
              <div className="h-[calc(100%-56px)]"> {/* Adjust for header height */}
                <ChatBox 
                  ref={chatBoxRef}
                  meetingId={meetingId}
                  useAssistant={true}
                  isProcessing={isChatProcessing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;