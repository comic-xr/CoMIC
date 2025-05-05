import { socket } from './socket';
import { store } from '../store/store';
import { setRTCPeer } from '../features/rtcSlice';

// Configuration for STUN servers
const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:relay.metered.ca:80", username: "user", credential: "pass" },
        { urls: "turn:relay.metered.ca:443", username: "user", credential: "pass" },
    ],
};

// Create peer connection with the configuration
export const peer = new RTCPeerConnection(configuration);
store.dispatch(setRTCPeer(peer));

// Store ICE candidates until remote description is set
let iceCandidatesQueue: RTCIceCandidate[] = [];

const createOffer = async (meetingId: string) => {
    try {
        console.log("Starting createOffer process...");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate from offer:", event.candidate);
                socket.emit("send-ice-candidate", {
                    meetingID: meetingId,
                    candidate: event.candidate,
                });
            }
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit('send-offer', { meetingID: meetingId, offer });
        console.log('✅ Offer Sent:', offer);
    } catch (error) {
        console.error('❌ Error creating offer:', error);
    }
};

const createAnswer = async (meetingID: string, offer: RTCSessionDescriptionInit) => {
    try {
        console.log('Starting createAnswer process...');

        // First set remote description
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('Remote description set');

        // Process any queued ICE candidates
        while (iceCandidatesQueue.length > 0) {
            const candidate = iceCandidatesQueue.shift();
            if (candidate) {
                await peer.addIceCandidate(candidate);
                console.log("Processed queued ICE candidate");
            }
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate from answer:", event.candidate);
                socket.emit("send-ice-candidate", {
                    meetingID,
                    candidate: event.candidate,
                });
            }
        };
        
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        console.log('Local description set');

        socket.emit("send-answer", { meetingID, answer });  
        console.log("✅ Answer Sent:", answer);

    } catch (error) {
        console.error("❌ Error creating answer:", error);
    }
};

const receiveIceCandidate = async (candidate: RTCIceCandidate) => {       
    try {
        // If remote description is not set, queue the candidate
        if (!peer.remoteDescription) {
            console.log("Queueing ICE candidate until remote description is set");
            iceCandidatesQueue.push(candidate);
            return;
        }

        await peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Successfully added ICE candidate");
    } catch (error) {
        console.error("Error adding ICE candidate:", error);
    }
};

// Send ICE candidate to the signaling server   
const sendIceCandidate = (meetingID: string) => {
    console.log("Setting up ICE candidate handling");
    
    // Log the current state of the peer connection
    console.log("Current peer connection state:", {
        iceConnectionState: peer.iceConnectionState,
        connectionState: peer.connectionState,
        signalingState: peer.signalingState,
        iceGatheringState: peer.iceGatheringState
    });

    // Check if peer connection is valid
    if (!peer) {
        console.error("Peer connection is null!");
        return;
    }

    peer.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        console.log("ICE Candidate Event triggered");
        console.log("ICE Candidate Event:", event);
        if (event.candidate) {
            // console.log("Sending ICE Candidate:", event.candidate);
            socket.emit("send-ice-candidate", { meetingID, candidate: event.candidate });
        } else {
            console.log("Null candidate - ICE gathering complete");
        }
    };

    peer.oniceconnectionstatechange = () => {
        console.log("ICE Connection State:", peer.iceConnectionState);
    };

    peer.onconnectionstatechange = () => {
        console.log("Connection State:", peer.connectionState);
    };

    peer.onnegotiationneeded = () => {
        console.log("Negotiation Needed");
    };
};

// Add this function to help debug the connection
export const logPeerStatus = () => {
    console.log({
        iceConnectionState: peer.iceConnectionState,
        connectionState: peer.connectionState,
        signalingState: peer.signalingState,
        iceGatheringState: peer.iceGatheringState
    });
};

// Add a function to handle received answer
const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
        if (!peer.currentRemoteDescription) {
            console.log("Setting remote description from answer");
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            
            // Process any queued ICE candidates after setting remote description
            while (iceCandidatesQueue.length > 0) {
                const candidate = iceCandidatesQueue.shift();
                if (candidate) {
                    await peer.addIceCandidate(candidate);
                    console.log("Processed queued ICE candidate after answer");
                }
            }
        }
    } catch (error) {
        console.error("Error handling answer:", error);
    }
};

// Export the setup function so it can be called early
export { createOffer, createAnswer, sendIceCandidate, receiveIceCandidate, handleAnswer };