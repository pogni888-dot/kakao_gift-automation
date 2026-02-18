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

    socket.on('run-test', (filename) => {
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

        // Spawn process using the full command string for better control
        // detached: true → 프로세스 그룹 생성 (Stop 시 자식 프로세스까지 한번에 종료)
        activeProcess = spawn(fullCommand, {
            cwd: __dirname,
            shell: true,
            detached: true
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

            // Wait a bit to ensure video file is flushed to disk
            setTimeout(() => {
                // Helper to recursively find the latest .webm file
                const findLatestWebm = (dir) => {
                    let latestFile = null;
                    let latestMtime = 0;

                    const search = (currentDir) => {
                        try {
                            if (!fs.existsSync(currentDir)) return;
                            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
                            for (const entry of entries) {
                                const fullPath = path.join(currentDir, entry.name);
                                if (entry.isDirectory()) {
                                    search(fullPath);
                                } else if (entry.isFile() && entry.name.endsWith('.webm')) {
                                    const stats = fs.statSync(fullPath);
                                    if (stats.mtimeMs > latestMtime) {
                                        latestMtime = stats.mtimeMs;
                                        latestFile = fullPath;
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(`Error reading dir ${currentDir}:`, e);
                        }
                    };

                    search(dir);
                    return latestFile;
                };

                const latestVideo = findLatestWebm(testResultsDir);
                let videoUrl = null;

                if (latestVideo) {
                    // Convert absolute path to relative URL path
                    // testResultsDir is absolute, e.g. /app/test-results
                    // latestVideo is absolute, e.g. /app/test-results/sub/video.webm
                    // relative: sub/video.webm
                    const relativePath = path.relative(testResultsDir, latestVideo);
                    // URL: /test-results/sub/video.webm
                    videoUrl = `/test-results/${relativePath.replace(/\\/g, '/')}`;
                    console.log('Latest video found:', videoUrl);
                } else {
                    console.log('No video file found in test-results.');
                }

                socket.emit('test-complete', { code, video: videoUrl });
                activeProcess = null;
            }, 5000);
        });

        activeProcess.on('error', (err) => {
            console.error('Failed to start subprocess.', err);
            socket.emit('test-output', `Error: ${err.message}\n`);
            activeProcess = null;
        });
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
