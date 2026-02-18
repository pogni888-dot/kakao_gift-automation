const io = require('socket.io-client');

const socket = io('http://134.185.101.88:3001');

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('run-test', 'generate_auth.spec.ts');
});

socket.on('test-start', (filename) => {
    console.log(`Test started: ${filename}`);
});

socket.on('test-output', (data) => {
    process.stdout.write(data);
});

socket.on('test-complete', (result) => {
    console.log('Test complete:', result);
    socket.disconnect();
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    socket.disconnect();
});
