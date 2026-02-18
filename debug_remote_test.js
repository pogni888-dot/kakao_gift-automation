const io = require('socket.io-client');

const socket = io('http://134.185.101.88:3001');

socket.on('connect', () => {
    console.log('Connected to server');
    // 1단계: generate_auth로 서버 내에서 로그인 세션 생성
    socket.emit('run-test', 'generate_auth.spec.ts');
});

socket.on('test-start', (filename) => {
    console.log(`Test started: ${filename}`);
});

socket.on('test-output', (data) => {
    process.stdout.write(data);
});

socket.on('test-complete', (result) => {
    console.log('\n\nTest complete:', JSON.stringify(result));
    socket.disconnect();
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    socket.disconnect();
});
