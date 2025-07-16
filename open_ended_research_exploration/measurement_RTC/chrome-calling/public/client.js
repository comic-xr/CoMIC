const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
    });

peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};

peer.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit('candidate', event.candidate);
    }
};

socket.on('offer', async (offer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate) => {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
});

function startCall() {
    peer.createOffer()
        .then(offer => {
            peer.setLocalDescription(offer);
            socket.emit('offer', offer);

            // Trigger iperf3 on server
            fetch('/run-iperf')
                .then(res => res.text())
                .then(console.log)
                .catch(console.error);
        });
}
