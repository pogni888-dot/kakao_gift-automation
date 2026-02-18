import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Play, Square, Terminal, CheckCircle, XCircle, Activity, Lock } from 'lucide-react';
import './App.css';

const isProduction = import.meta.env.PROD;
const API_BASE = isProduction ? window.location.origin : 'http://localhost:3001';

const socket = io(API_BASE);

const testDescriptions = {
  'kakao_gift.spec.ts': '간단한 검색 기능',
  'kakao_login.spec.ts': '로그인 기능',
  'kakao_resume.spec.ts': '상품 검색 및 상세 페이지 내 옵션 설정 & 친구 선택 후 주문서 진입',
  'kakao_giftbox.spec.ts': '상품 검색, 장바구니 추가/진입, 주문서 진입 (옵션형 배송 상품 자동 설정)',
  'kakao_resume2.spec.ts': '상품 검색 및 상세 페이지 내 옵션 설정 & 친구 선택 후 주문서 진입',
  'kakao_giftpage.spec.ts': '상품 검색 및 상세페이지 진입',
  'kakao_wishlist.spec.ts': '상품 검색 및 상세페이지 내 위시리스트 추가',
  'generate_auth.spec.ts': '서버 내 카카오 로그인 세션(auth.json) 생성 및 저장',
};

function App() {
  const [tests, setTests] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [logs, setLogs] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const terminalEndRef = useRef(null);
  const [authLastRun, setAuthLastRun] = useState(0);

  const fetchAuthStatus = () => {
    fetch(`${API_BASE}/api/auth-status`)
      .then(res => res.json())
      .then(data => setAuthLastRun(data.lastModified || 0))
      .catch(err => console.error("Failed to fetch auth status", err));
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/tests`)
      .then(res => res.json())
      .then(data => setTests(data))
      .catch(err => console.error("Failed to fetch tests", err));

    fetchAuthStatus();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('test-start', (filename) => {
      setActiveTest(filename);
      setLogs(prev => [...prev, `\n--- STARTING TEST: ${filename} ---\n`]);
    });

    socket.on('test-output', (data) => {
      setLogs(prev => [...prev, data]);
    });

    socket.on('test-complete', ({ code, video }) => {
      setActiveTest(null);
      setLogs(prev => [...prev, `\n--- TEST COMPLETED WITH EXIT CODE: ${code} ---\n`]);
      if (video) {
        setLogs(prev => [...prev, `🎥 Video found: ${video}\n`]);
        setVideoUrl(video);
      } else {
        setLogs(prev => [...prev, `ℹ️ No video recording found.\n`]);
      }
      fetchAuthStatus();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('test-start');
      socket.off('test-output');
      socket.off('test-complete');
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runTest = (filename) => {
    if (activeTest) return;

    if (filename === 'generate_auth.spec.ts' && (Date.now() - authLastRun < 24 * 60 * 60 * 1000)) {
      alert("⚠️ 이 테스트는 최근 24시간 내에 실행된 기록이 있어 잠겨있습니다.");
      return;
    }

    setLogs([]); // Clear logs on new run
    setVideoUrl(null);
    socket.emit('run-test', filename);
  };

  const stopTest = () => {
    socket.emit('stop-test');
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <Activity className="icon-pulse" size={28} />
          <h1>Automation Hub</h1>
        </div>
        <div className="status-badge">
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          {isConnected ? 'System Ready' : 'Disconnected'}
        </div>
      </header>

      {videoUrl && (
        <div className="video-player-section fade-in">
          <div className="video-wrapper">
            <div className="video-header">
              <span>Test Execution Replay</span>
              <button className="close-video-btn" onClick={() => setVideoUrl(null)}><XCircle size={20} /></button>
            </div>
            <video
              src={`${API_BASE}${videoUrl}`}
              controls
              autoPlay
              muted
              playsInline
              className="test-video"
              onEnded={() => setVideoUrl(null)}
            />
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="test-grid">
          {tests.map(test => {
            const isAuthTest = test === 'generate_auth.spec.ts';
            const isLocked = isAuthTest && (Date.now() - authLastRun < 24 * 60 * 60 * 1000);

            return (
              <div key={test} className={`test-card ${activeTest === test ? 'running' : ''}`}>
                {testDescriptions[test] && (
                  <div className="tooltip">
                    {testDescriptions[test]}
                    {isLocked && (
                      <div style={{ color: '#ef4444', marginTop: '6px', fontSize: '0.8rem', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        🔒 최근 24시간 내 실행됨
                      </div>
                    )}
                    <div className="tooltip-arrow"></div>
                  </div>
                )}
                <div className="card-header">
                  <div className="file-icon">TS</div>
                  <h3>{test}</h3>
                </div>
                <div className="card-actions">
                  {activeTest === test ? (
                    <button onClick={stopTest} className="btn btn-stop">
                      <Square size={16} /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => runTest(test)}
                      className={`btn ${isLocked ? 'btn-locked' : 'btn-run'}`}
                      disabled={activeTest !== null || isLocked}
                      style={isLocked ? { background: '#334155', cursor: 'not-allowed', opacity: 0.7, boxShadow: 'none' } : {}}
                    >
                      {isLocked ? <Lock size={16} /> : <Play size={16} />}
                      {isLocked ? 'Locked' : 'Run Test'}
                    </button>
                  )}
                </div>
                {activeTest === test && <div className="loading-bar"><div className="bar-fill"></div></div>}
              </div>
            );
          })}
          {tests.length === 0 && <div className="empty-state">No tests found in /tests folder.</div>}
        </div>

        <div className="terminal-section">
          <div className="terminal-header">
            <Terminal size={18} />
            <span>Console Output</span>
            <button className="clear-btn" onClick={() => setLogs([])}>Clear</button>
          </div>
          <div className="terminal-window">
            {logs.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
