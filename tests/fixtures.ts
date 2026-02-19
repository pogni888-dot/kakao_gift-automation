import { test as base, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

// Fixture 타입 정의
type TestFixtures = {
    socket: Socket;
    waitForInput: (timeout?: number) => Promise<string | null>;
    waitForClick: (timeout?: number) => Promise<{ x: number, y: number } | null>;
};

/**
 * 💡 StreamTest
 * 테스트 실행 중 화면을 실시간으로 캡처하여 소켓 서버로 전송하는 Custom Fixture입니다.
 * - CDP(Chrome DevTools Protocol)를 사용하여 브라우저 화면을 직접 스트리밍함
 * - 3001 포트로 전송 → 대시보드가 이를 받아 실시간 재생
 * - waitForInput: 대시보드에서 보낸 사용자 입력을 기다리는 헬퍼 함수 제공
 * - waitForClick: 대시보드에서 보낸 사용자 클릭 좌표를 기다리는 헬퍼 함수 제공
 */
export const test = base.extend<TestFixtures>({
    socket: [async ({ page }, use) => {
        // 1. 소켓 서버 연결 (테스트 실행 환경은 도커 내부이므로 localhost:3001)
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            // console.log('🔴 Streaming Connected!');
        });

        // 2. CDP 세션 시작 (스크린캐스트)
        try {
            const client = await page.context().newCDPSession(page);
            await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1280, maxHeight: 720 });

            client.on('Page.screencastFrame', async ({ data, sessionId }) => {
                // 프레임 수신 시 서버로 전송 (Base64 JPEG)
                socket.emit('stream-data', data);

                // 프레임 처리 완료 알림 (필수)
                try {
                    await client.send('Page.screencastFrameAck', { sessionId });
                } catch (e) {
                    // 세션 종료 등으로 인한 에러 무시
                }
            });
        } catch (e) {
            console.error('⚠️ Failed to start screencast (CDP error):', e);
        }

        await use(socket);

        // 3. 테스트 종료 시 정리
        socket.disconnect();
    }, { auto: true }],

    // 사용자 입력 대기 함수 (Fixture)
    waitForInput: async ({ socket }, use) => {
        const inputQueue: string[] = [];

        const handler = (text: string) => {
            console.log(`[Input System] Received: "${text}"`);
            inputQueue.push(text);
        };

        socket.on('user-input', handler);

        const waitFunc = async (timeout = 600000) => { // 기본 10분
            console.log(`💬 [Input System] 사용자 입력을 기다립니다... (대시보드 하단 입력창 사용)`);
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (inputQueue.length > 0) {
                    const chunk = inputQueue.shift();
                    console.log(`✅ [Input System] 처리 시작: "${chunk}"`);
                    return chunk || null;
                }
                await new Promise(r => setTimeout(r, 500));
            }
            console.log('❌ [Input System] 대기 시간 초과');
            return null;
        };

        await use(waitFunc);

        socket.off('user-input', handler);
    },

    // 사용자 클릭 대기 함수 (Fixture)
    waitForClick: async ({ socket }, use) => {
        const clickQueue: { x: number, y: number }[] = [];

        const handler = (data: { x: number, y: number }) => {
            console.log(`[Click System] Received: (${data.x}, ${data.y})`);
            clickQueue.push(data);
        };

        socket.on('user-click', handler);

        const waitFunc = async (timeout = 600000): Promise<{ x: number, y: number } | null> => {
            console.log(`🖱️ [Click System] 사용자 클릭을 기다립니다... (대시보드 라이브 화면 이미지 클릭)`);
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (clickQueue.length > 0) {
                    const chunk = clickQueue.shift();
                    console.log(`✅ [Click System] 클릭 좌표 수신: (${chunk!.x.toFixed(4)}, ${chunk!.y.toFixed(4)})`);
                    return chunk || null;
                }
                await new Promise(r => setTimeout(r, 500));
            }
            console.log('❌ [Click System] 클릭 대기 타임아웃');
            return null;
        };

        await use(waitFunc);

        socket.off('user-click', handler);
    }
});

export { expect };
