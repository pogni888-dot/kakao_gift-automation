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
  'yeogi_login.spec.ts': '여기어때 로그인(카카오톡)',
  'yeogi_searchs.spec.ts': '지역 검색 후 상세페이지 진입',
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

  // 현재 로그인된 유저
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const saved = localStorage.getItem('loggedInUser');
    return saved ? JSON.parse(saved) : null;
  });

  // 로그인 모달 상태
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // 회원가입 상태
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpId, setSignUpId] = useState('');
  const [signUpPw, setSignUpPw] = useState('');

  const fetchAuthStatus = () => {
    fetch(`${API_BASE}/api/auth-status`)
      .then(res => res.json())
      .then(data => setAuthLastRun(data.lastModified || 0))
      .catch(err => console.error("Failed to fetch auth status", err));
  };

  // 사용자 입력 (보안문자 등) 처리
  const [userInput, setUserInput] = useState('');
  const sendUserInput = () => {
    if (!userInput.trim()) return;
    socket.emit('send-input', userInput);
    setLogs(prev => [...prev, `\n🗣️ [User Input Sent]: ${userInput}\n`]);
    setUserInput('');
  };

  const [isClickMode, setIsClickMode] = useState(false);

  const handleImageClick = (e) => {
    if (!isClickMode) return;
    const rect = e.target.getBoundingClientRect();
    // 비율 계산 (0.0 ~ 1.0)
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    socket.emit('send-click', { x: xRatio, y: yRatio });
    setLogs(prev => [...prev, `🖱️ [Click Sent] Relative: (${xRatio.toFixed(3)}, ${yRatio.toFixed(3)})`]);
    setIsClickMode(false);
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

  const handleSignUpSubmit = async () => {
    if (!signUpName || !signUpId || !signUpPw) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signUpName, user_id: signUpId, password: signUpPw }),
      });

      const data = await response.json();

      if (response.status === 409) {
        alert('중복된 아이디입니다');
      } else if (response.ok) {
        alert('회원가입이 완료되었습니다.');
        setShowSignUpModal(false);
        setSignUpName('');
        setSignUpId('');
        setSignUpPw('');
      } else {
        alert(data.error || '회원가입 중 에러가 발생했습니다.');
      }
    } catch (err) {
      console.error('SignUp Error:', err);
      alert('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  const handleLoginSubmit = async () => {
    if (!loginId || !loginPw) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: loginId, password: loginPw }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`어서오세요, ${data.user.name}님`);
        localStorage.setItem('loggedInUser', JSON.stringify(data.user));
        setShowLoginModal(false);
        // 2초 대기 후 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(data.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      alert('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    window.location.reload();
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <Activity className="icon-pulse" size={28} />
          <h1>최민호 자동화 포트폴리오</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!loggedInUser ? (
            <>
              <button className="btn" onClick={() => setShowSignUpModal(true)} style={{ backgroundColor: '#3b82f6', color: '#fff' }}>회원가입</button>
              <button className="btn" onClick={() => setShowLoginModal(true)} style={{ backgroundColor: '#10b981', color: '#fff' }}>로그인</button>
            </>
          ) : (
            <>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{loggedInUser.name}님</span>
              <button className="btn" onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: '#fff' }}>로그아웃</button>
            </>
          )}
          <div className="status-badge">
            <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            {isConnected ? 'System Ready' : 'Disconnected'}
          </div>
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

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowLoginModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <CheckCircle size={22} />
              <h2>로그인</h2>
            </div>
            <p className="auth-modal-desc">
              아이디와 비밀번호를 입력해주세요.
            </p>
            <div className="auth-form">
              <div className="auth-field">
                <label htmlFor="login-id">아이디</label>
                <input
                  id="login-id"
                  type="text"
                  placeholder="아이디 입력"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('login-pw').focus()}
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label htmlFor="login-pw">비밀번호</label>
                <input
                  id="login-pw"
                  type="password"
                  placeholder="비밀번호 입력"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()}
                />
              </div>
              <div className="auth-actions">
                <button className="btn auth-cancel-btn" onClick={() => setShowLoginModal(false)}>
                  취소
                </button>
                <button className="btn btn-run auth-submit-btn" onClick={handleLoginSubmit}>
                  <CheckCircle size={16} /> 로그인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원가입 모달 */}
      {showSignUpModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowSignUpModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <CheckCircle size={22} />
              <h2>회원가입</h2>
            </div>
            <p className="auth-modal-desc">
              회원 정보를 입력해주세요.
            </p>
            <div className="auth-form">
              <div className="auth-field">
                <label htmlFor="signup-name">이름</label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="이름 입력"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('signup-id').focus()}
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-id">아이디</label>
                <input
                  id="signup-id"
                  type="text"
                  placeholder="아이디 입력"
                  value={signUpId}
                  onChange={(e) => setSignUpId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('signup-pw').focus()}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-pw">비밀번호</label>
                <input
                  id="signup-pw"
                  type="password"
                  placeholder="비밀번호 입력"
                  value={signUpPw}
                  onChange={(e) => setSignUpPw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignUpSubmit()}
                />
              </div>
              <div className="auth-actions">
                <button className="btn auth-cancel-btn" onClick={() => setShowSignUpModal(false)}>
                  취소
                </button>
                <button className="btn btn-run auth-submit-btn" onClick={handleSignUpSubmit}>
                  <CheckCircle size={16} /> 확인
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
              <button
                onClick={() => setIsClickMode(!isClickMode)}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  fontSize: '0.85rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: isClickMode ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isClickMode ? '🎯 Active' : '👆 Click Mode'}
              </button>
            </div>
            <img
              src={streamImage}
              alt="Live Stream"
              className="live-image"
              onClick={handleImageClick}
              style={{ cursor: isClickMode ? 'crosshair' : 'default' }}
            />
          </div>
        </div>
      )}

      <main className="main-content">
        {(() => {
          const giftTests = tests.filter(test => test.includes('kakao') || test.includes('generate'));
          const otherTests = tests.filter(test => !test.includes('kakao') && !test.includes('generate'));

          const renderTestCard = (test) => {
            const isAuthTest = test.includes('generate') || test === '초.ts';
            const isUrgent = isAuthTest && isSessionExpired;

            // [New] Generate 파일 선행 실행이 필요한 테스트 파일들
            const isDependentTest = /resume|wishlist|giftbox/i.test(test);
            const showTooltip = testDescriptions[test] || isAuthTest || isDependentTest;

            return (
              <div key={test} className={`test-card ${activeTest === test ? 'running' : ''} ${isUrgent ? 'urgent' : ''}`}>
                {showTooltip && (
                  <div className="tooltip">
                    {testDescriptions[test]}
                    {isAuthTest && (
                      <div style={{ color: '#ef4444', marginTop: '6px', fontSize: '0.8rem', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        🔍 세션 생성/갱신용
                      </div>
                    )}
                    {isDependentTest && (
                      <div style={{ color: '#ef4444', marginTop: '6px', fontSize: '0.8rem', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                        ⚠ generate 파일 실행 후 로그인 세션 생성 필요
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
              </div>
            );
          };

          return (
            <>
              {giftTests.length > 0 && (
                <div className="category-wrapper" style={{ marginBottom: '2.5rem' }}>
                  <h2 className="category-title" style={{ fontSize: '1.3rem', color: '#e2e8f0', marginBottom: '1.2rem', paddingLeft: '0.8rem', borderLeft: '4px solid #facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎁 선물하기 자동화
                  </h2>
                  <div className="test-grid">
                    {giftTests.map(renderTestCard)}
                  </div>
                </div>
              )}

              {otherTests.length > 0 && (
                <div className="category-wrapper" style={{ marginBottom: '2.5rem' }}>
                  <h2 className="category-title" style={{ fontSize: '1.3rem', color: '#e2e8f0', marginBottom: '1.2rem', paddingLeft: '0.8rem', borderLeft: '4px solid #3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📦 여기어때 자동화
                  </h2>
                  <div className="test-grid">
                    {otherTests.map(renderTestCard)}
                  </div>
                </div>
              )}

              {tests.length === 0 && <div className="empty-state">No tests found in /tests folder.</div>}
            </>
          );
        })()}

        {/* 사용자 입력 전송 컨트롤 (Test Interaction) */}
        <div className="input-control-section fade-in">
          <div className="input-wrapper">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendUserInput()}
              placeholder="💬 테스트 중 보안문자 등이 나오면 여기에 입력하고 엔터를 누르세요..."
              disabled={!activeTest}
              className="user-input-field"
            />
            <button
              className="btn btn-send"
              onClick={sendUserInput}
              disabled={!activeTest || !userInput.trim()}
            >
              Send Input
            </button>
          </div>
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
