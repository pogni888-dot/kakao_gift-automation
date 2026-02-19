const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in local dev
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// API to list test files
app.get('/api/tests', (req, res) => {
    const testsDir = path.join(__dirname, 'tests');

    if (!fs.existsSync(testsDir)) {
        return res.status(404).json({ error: 'Tests directory not found' });
    }

    fs.readdir(testsDir, (err, files) => {
        if (err) {
            console.error('Error reading tests directory:', err);
            return res.status(500).json({ error: 'Unable to read tests directory' });
        }

        // Filter for .spec.ts or .test.ts files
        const testFiles = files.filter(file => file.endsWith('.spec.ts') || file.endsWith('.test.ts'));
        res.json(testFiles);
    });
});

// Get auth.json last modified time (for 24h lockout)
app.get('/api/auth-status', (req, res) => {
    const authPath = path.join(__dirname, 'auth.json');
    try {
        if (fs.existsSync(authPath)) {
            const stats = fs.statSync(authPath);
            res.json({ lastModified: stats.mtimeMs });
        } else {
            res.json({ lastModified: null });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve test results (videos, screenshots)
const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
}
const serveIndex = require('serve-index');
app.use('/test-results', express.static(testResultsDir), serveIndex(testResultsDir, { 'icons': true }));

// Serve static files from the React app (dashboard/dist)
// This enables the app to be served directly from backend in production
const dashboardDist = path.join(__dirname, 'dashboard', 'dist');
if (fs.existsSync(dashboardDist)) {
    app.use(express.static(dashboardDist));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    // Fixed for Express 5: Use regex /.*/ instead of string '*'
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(dashboardDist, 'index.html'));
    });
}

let activeProcess = null;

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('run-test', (filename, credentials) => {
        if (activeProcess) {
            socket.emit('test-output', 'A test is already running. Please wait.\n');
            return;
        }

        console.log(`Running test: ${filename}`);
        socket.emit('test-start', filename);

        // Construct command: npx playwright test "<absolute_path>"
        // Using absolute path is safer to avoid relative path resolution issues
        const testPath = path.join(__dirname, 'tests', filename);
        const command = 'npx';
        // We quote the path in case of spaces, though spawn with args array usually handles it.
        // On Windows with shell:true, quoting might be needed if paths have spaces.
        // However, passing arguments as array to spawn with shell:true might behave differently.
        // Let's explicitly construct the command string for shell execution to be 100% sure.

        const fullCommand = `npx playwright test "${testPath.replace(/\\/g, '\\\\')}" --project=chromium`;
        console.log(`Executing: ${fullCommand}`);

        // 환경변수 설정: generate_auth.spec.ts 실행 시 자격 증명 전달
        const env = { ...process.env };
        if (credentials && credentials.id && credentials.pw) {
            env.KAKAO_ID = credentials.id;
            env.KAKAO_PW = credentials.pw;
            console.log(`Using custom credentials for: ${credentials.id}`);
        }

        // Spawn process using the full command string for better control
        // detached: true → 프로세스 그룹 생성 (Stop 시 자식 프로세스까지 한번에 종료)
        activeProcess = spawn(fullCommand, {
            cwd: __dirname,
            shell: true,
            detached: true,
            env: env
        });

        activeProcess.stdout.on('data', (data) => {
            socket.emit('test-output', data.toString());
        });

        activeProcess.stderr.on('data', (data) => {
            // Playwright often outputs logs to stderr
            socket.emit('test-output', data.toString());
        });

        activeProcess.on('close', (code) => {
            console.log(`Test finished with code ${code}`);

            // 비디오 파일 찾기 로직 제거 (실시간 스트리밍으로 대체)
            // 테스트 종료만 알림
            activeProcess = null;
            io.emit('test-complete', { code, video: null }); // video: null 전송
        });

        activeProcess.on('error', (err) => {
            console.error('Failed to start subprocess.', err);
            socket.emit('test-output', `Error: ${err.message}\n`);
            activeProcess = null;
        });
    });

    // [New] Real-time Streaming Relay
    // 테스트 스크립트(Client)가 보내는 화면 데이터를 받아서 대시보드(All Clients)로 브로드캐스트
    socket.on('stream-data', (data) => {
        // 자신(테스트 스크립트)을 제외하고, 대시보드에게만 전송하면 됨
        // 하지만 socket.broadcast가 편함
        socket.broadcast.emit('stream-frame', data);
    });

    socket.on('stop-test', () => {
        if (activeProcess) {
            console.log('Stopping test process:', activeProcess.pid);

            if (process.platform === 'win32') {
                // Windows: Use taskkill to kill the process tree
                // /T = terminate child processes (tree)
                // /F = force terminate
                require('child_process').exec(`taskkill /pid ${activeProcess.pid} /T /F`, (err) => {
                    if (err) {
                        console.error('Failed to kill process tree:', err);
                        // Fallback to standard kill if taskkill fails
                        activeProcess.kill();
                    }
                });
            } else {
                // Unix/Linux/Mac: 프로세스 그룹 전체 종료 (-pid = 그룹 전체)
                // npx → playwright → chromium 모든 자식 프로세스를 한번에 죽입니다.
                try {
                    process.kill(-activeProcess.pid, 'SIGTERM');
                } catch (err) {
                    console.error('Failed to kill process group:', err);
                    // Fallback: 개별 프로세스만 종료
                    try { activeProcess.kill('SIGKILL'); } catch (e) { }
                }
            }

            socket.emit('test-output', '\n--- Process Terminated by User ---\n');
            socket.emit('test-complete', { code: -1, video: null });
            activeProcess = null;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
