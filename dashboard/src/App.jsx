import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Play, Square, Terminal, CheckCircle, XCircle, Activity, KeyRound } from 'lucide-react';
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
  const [streamImage, setStreamImage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const terminalEndRef = useRef(null);
  const terminalWindowRef = useRef(null);
  const [authLastRun, setAuthLastRun] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authId, setAuthId] = useState('');
  const [authPw, setAuthPw] = useState('');
  const [pendingTest, setPendingTest] = useState(null);

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

    // 실시간 스트리밍 데이터 수신
    socket.on('stream-frame', (data) => {
      setStreamImage(`data:image/jpeg;base64,${data}`);
    });

    socket.on('test-complete', ({ code }) => {
      setActiveTest(null);
      setLogs(prev => [...prev, `\n--- TEST COMPLETED WITH EXIT CODE: ${code} ---\n`]);
      fetchAuthStatus();

      // 3초 후 스트리밍 화면 닫기 (결과 확인용 대기)
      setTimeout(() => setStreamImage(null), 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('test-start');
      socket.off('test-output');
      socket.off('test-complete');
    };
  }, []);

  // Auto-scroll terminal (log only, prevent window scrolling)
  useEffect(() => {
    if (terminalWindowRef.current) {
      terminalWindowRef.current.scrollTop = terminalWindowRef.current.scrollHeight;
    }
  }, [logs]);

  // 1분마다 now 업데이트 (UI 갱신용)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // 세션 만료 여부: authLastRun이 0(없음)이거나 24시간 지남
  const isSessionExpired = !authLastRun || (now - authLastRun > 24 * 60 * 60 * 1000);

  const runTest = (filename) => {
    if (activeTest) return;

    // generate_auth.spec.ts이거나 kakao_login.spec.ts일 때 로그인 모달 표시
    if (filename === 'generate_auth.spec.ts' || filename === 'kakao_login.spec.ts') {
      setPendingTest(filename);
      setShowAuthModal(true);
      return;
    }

    // 만료되었는데 다른 일반 테스트를 실행하려 할 때 경고
    if (isSessionExpired) {
      const msg = "⚠️ 로그인 세션이 만료되었습니다 (혹은 생성되지 않았습니다).\n\n이 상태로 실행하면 테스트가 실패할 수 있습니다.\n먼저 'generate_auth.spec.ts'를 실행하는 것이 좋습니다.\n\n그래도 실행하시겠습니까?";
      if (!confirm(msg)) {
        return;
      }
    }

    setLogs([]); // Clear logs on new run
    setStreamImage(null);
    socket.emit('run-test', filename);
  };

  // 로그인 모달에서 실행 버튼 클릭
  const handleAuthSubmit = () => {
    const id = authId.trim();
    const pw = authPw.trim();

    if (!id || !pw) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setShowAuthModal(false);
    setLogs([]);
    setStreamImage(null);

    const targetFile = pendingTest || 'generate_auth.spec.ts';
    socket.emit('run-test', targetFile, { id, pw });
    setPendingTest(null);
    // 입력 필드 초기화
    setAuthId('');
    setAuthPw('');
  };

  const stopTest = () => {
    socket.emit('stop-test');
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <Activity className="icon-pulse" size={28} />
          <h1>최민호 자동화 포트폴리오</h1>
        </div>
        <div className="status-badge">
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          {isConnected ? 'System Ready' : 'Disconnected'}
        </div>
      </header>

      {isSessionExpired && (
        <div className="session-warning-banner fade-in">
          ⚠️ <strong>로그인 세션이 만료되었습니다.</strong> 원활한 테스트를 위해 <code>generate_auth.spec.ts</code>를 먼저 실행해주세요.
        </div>
      )}

      {/* 로그인 자격 증명 입력 모달 */}
      {showAuthModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <KeyRound size={22} />
              <h2>카카오 로그인 정보 입력</h2>
            </div>
            <p className="auth-modal-desc">
              카카오 계정 정보를 입력하면 해당 정보로 로그인 세션을 생성합니다.
            </p>
            <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '16px', fontWeight: 'bold' }}>
              ⚠ 카카오 계정 상태에 따라 2차 인증 수동 해제 필요
            </p>
            <div className="auth-form">
              <div className="auth-field">
                <label htmlFor="auth-id">카카오 아이디 (이메일)</label>
                <input
                  id="auth-id"
                  type="email"
                  placeholder="example@email.com"
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('auth-pw').focus()}
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label htmlFor="auth-pw">비밀번호</label>
                <input
                  id="auth-pw"
                  type="password"
                  placeholder="비밀번호 입력"
                  value={authPw}
                  onChange={(e) => setAuthPw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                />
              </div>
              <div className="auth-actions">
                <button className="btn auth-cancel-btn" onClick={() => setShowAuthModal(false)}>
                  취소
                </button>
                <button className="btn btn-run auth-submit-btn" onClick={handleAuthSubmit}>
                  <Play size={16} /> 로그인 세션 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {streamImage && (
        <div className="live-stream-section fade-in">
          <div className="stream-wrapper">
            <div className="stream-header">
              <div className="live-badge">
                <span className="blink-dot"></span> LIVE
              </div>
              <span className="stream-title">Real-time Execution</span>
              {activeTest && <span className="stream-filename">({activeTest})</span>}
            </div>
            <img src={streamImage} alt="Live Stream" className="live-image" />
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="test-grid">
          {tests.map(test => {
            const isAuthTest = test === 'generate_auth.spec.ts';
            // generate_auth.spec.ts는 만료되었을 때 강조 (빨간 테두리)
            const isUrgent = isAuthTest && isSessionExpired;

            return (
              <div key={test} className={`test-card ${activeTest === test ? 'running' : ''} ${isUrgent ? 'urgent' : ''}`}>
                {testDescriptions[test] && (
                  <div className="tooltip">
                    {testDescriptions[test]}
                    {isAuthTest && (
                      <div style={{ color: '#ef4444', marginTop: '6px', fontSize: '0.8rem', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        🔍 세션 생성/갱신용
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
                  {activeTest === test && (
                    <div className="mini-loader" title="Running...">
                      <div className="spinner"></div>
                    </div>
                  )}

                  {activeTest === test ? (
                    <button onClick={stopTest} className="btn btn-stop">
                      <Square size={16} /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => runTest(test)}
                      className="btn btn-run"
                      disabled={activeTest !== null}
                    >
                      <Play size={16} />
                      Run Test
                    </button>
                  )}
                </div>
                {/* loading-bar 제거됨 */}
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
          <div className="terminal-window" ref={terminalWindowRef}>
            {logs.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
