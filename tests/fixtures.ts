import { test as base, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

/**
 * 💡 StreamTest
 * 테스트 실행 중 화면을 실시간으로 캡처하여 소켓 서버로 전송하는 Custom Fixture입니다.
 * - CDP(Chrome DevTools Protocol)를 사용하여 브라우저 화면을 직접 스트리밍함
 * - 3001 포트로 전송 → 대시보드가 이를 받아 실시간 재생
 */
export const test = base.extend<{ socket: Socket }>({
    socket: [async ({ page }, use) => {
        // 1. 소켓 서버 연결 (테스트 실행 환경은 도커 내부이므로 localhost:3001)
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            // console.log('🔴 Streaming Connected!');
        });

        // 2. CDP 세션 시작 (스크린캐스트)
        try {
            const client = await page.context().newCDPSession(page);
            await client.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720 });

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
            console.error('⚠️ Failed to start screencast:', e);
        }

        await use(socket);

        // 3. 테스트 종료 시 정리
        socket.disconnect();
    }, { auto: true }] // auto: true → 모든 테스트에서 자동 실행
});

export { expect };
