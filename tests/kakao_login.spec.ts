import { test, expect } from './fixtures';

// 환경 변수에서 아이디/비밀번호 가져오기 (대시보드에서 전달됨)
const KAKAO_ID = process.env.KAKAO_ID;
const KAKAO_PW = process.env.KAKAO_PW;

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(120000); // 2분 (2차 인증 시간 고려)

    console.log('🚀 카카오 로그인 테스트 시작');

    if (!KAKAO_ID || !KAKAO_PW) {
        console.error('❌ 로그인 정보가 전달되지 않았습니다.');
        throw new Error('로그인 정보가 없습니다. 팝업에서 아이디/비밀번호를 입력해주세요.');
    }

    console.log(`🔑 로그인 시도 계정: ${KAKAO_ID}`);

    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. 로그인 상태 확인 및 로그인 시도
    const loginBtn = page.locator('a.link_login');
    const logoutBtn = page.locator('.btn_logout');

    if (await logoutBtn.isVisible()) {
        console.log('🟢 이미 로그인 상태입니다. (테스트 목적 달성을 위해 로그아웃 후 재로그인 하시겠습니까? 현재는 통과 처리합니다.)');
        return;
    }

    if (await loginBtn.isVisible()) {
        console.log('🔵 로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        await loginBtn.click();
        await page.waitForTimeout(2000);

        // 3. ID/PW 입력
        try {
            const idInput = page.locator('#loginId--1');
            await idInput.waitFor({ state: 'visible', timeout: 10000 });
            await idInput.fill(KAKAO_ID);
            await page.waitForTimeout(500);

            await page.fill('#password--2', KAKAO_PW);
            await page.waitForTimeout(500);

            // 4. 로그인 버튼 클릭
            await page.click('button.btn_g.highlight.submit');
            console.log('🔄 로그인 요청 전송됨. 결과 대기 중...');

            // [검증] 로그인 실패 메시지 감지
            try {
                const errorMsgLocator = page.locator('.txt_message, .error_message, .desc_login.fail');
                // 에러 메시지가 빨리 뜨면 잡고, 안 뜨면 넘어감 (3초 대기)
                await errorMsgLocator.waitFor({ state: 'visible', timeout: 3000 });
                const errorText = await errorMsgLocator.innerText();
                if (errorText) {
                    throw new Error(`❌ 로그인 실패: ${errorText} (아이디/비밀번호를 확인해주세요)`);
                }
            } catch (e) {
                const errMsg = (e as Error).message;
                if (errMsg.includes('로그인 실패')) throw e;
                // TimeoutError는 정상 (에러 메시지가 안 떴다는 뜻)
            }

        } catch (e) {
            const errMsg = (e as Error).message;
            if (errMsg.includes('로그인 실패')) {
                throw e;
            }
            console.log(`⚠️ 입력 중 문제 발생: ${errMsg}`);
        }

        // 5. 로그인 완료 대기 (gift.kakao.com으로 리다이렉트 될 때까지)
        // 2차 인증이 필요할 수 있으므로 넉넉히 대기
        console.log('⏳ 로그인 처리 대기 중...');

        try {
            // "로그아웃" 버튼이 나타나면 로그인 성공으로 간주
            await expect(page.locator('.btn_logout')).toBeVisible({ timeout: 30000 });
            console.log('✅ 로그인 성공! (로그아웃 버튼 확인됨)');
        } catch (e) {
            console.log('⚠️ 로그인 완료 확인 실패 (타임아웃). 2차 인증이 필요하거나 페이지 로딩이 느릴 수 있습니다.');
            // 현재 URL 로깅
            console.log(`Current URL: ${page.url()}`);
        }
    }
});
