const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('offer', (data) => {
        socket.broadcast.emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data);
    });

    socket.on('candidate', (data) => {
        socket.broadcast.emit('candidate', data);
    });
});

// Route to trigger iperf3 when WebRTC call starts
app.get('/run-iperf', (req, res) => {
    const cmd = 'iperf3 -c 192.168.0.21 -u -t 10 -b 10M'; // 🔁 Replace <RECEIVER_IP>
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error('iperf error:', err);
            res.status(500).send('iperf error');
            return;
        }
        console.log('iperf3 output:\n', stdout);
        res.send('iperf3 test started');
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
