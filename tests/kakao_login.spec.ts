import { test, expect } from './fixtures';

// 환경 변수에서 아이디/비밀번호 가져오기 (대시보드에서 전달됨)
const KAKAO_ID = process.env.KAKAO_ID;
const KAKAO_PW = process.env.KAKAO_PW;

test('카카오 로그인 테스트', async ({ page, waitForInput }) => {
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

            // [보안문자 대응] 입력 필드가 보이면 사용자 입력 대기 (2분)
            try {
                const captchaInput = page.locator('input[name="captcha"], #captcha, .inp_captcha, input[placeholder*="보안문자"]');
                // 보안문자가 떴는지 확인 (2초 정도만 확인)
                if (await captchaInput.isVisible({ timeout: 2000 })) {
                    console.log('🚨 보안문자가 감지되었습니다!');
                    console.log('👉 대시보드 하단 입력창에 보안문자를 입력해주세요. (최대 2분 대기)');

                    const userCaptcha = await waitForInput(120000); // 2분 대기

                    if (userCaptcha) {
                        console.log(`✅ 보안문자 입력 수신: "${userCaptcha}"`);
                        await captchaInput.fill(userCaptcha);
                        await page.waitForTimeout(500);

                        console.log('🔄 보안문자 입력 후 재로그인 시도...');
                        await page.click('button.btn_g.highlight.submit');
                        await page.waitForTimeout(3000);
                    } else {
                        console.error('❌ 보안문자 입력 시간 초과');
                    }
                }
            } catch (e) {
                // 보안문자 입력창이 없으면 그냥 넘어감
            }

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

        // 5. 로그인 완료 및 2차 인증 대응 (최대 4분 대기)
        console.log('⏳ 로그인 처리 대기 중... (2차 인증 / continue 버튼 자동 감지)');

        const maxWait = 240000; // 4분
        const startTime = Date.now();
        let isLoggedIn = false;

        while (Date.now() - startTime < maxWait) {
            // A. 선물하기 홈으로 돌아왔는지 확인
            if (page.url().includes('gift.kakao.com')) {
                console.log('✅ 카카오 선물하기 페이지로 돌아왔습니다!');
                isLoggedIn = true;
                await page.waitForTimeout(2000);
                break;
            }

            // B. 'continue' 버튼이 보이면 클릭 (2차 인증 후)
            try {
                // 다양한 형태의 continue 버튼 탐색
                // case-insensitive 'continue' check
                const continueBtn = page.locator('button, a, input[type="button"], input[type="submit"]')
                    .filter({ hasText: /continue/i }).first();

                if (await continueBtn.isVisible({ timeout: 500 })) {
                    console.log('🔘 "continue" 버튼 발견! 클릭합니다...');
                    await continueBtn.click();
                    await page.waitForTimeout(3000);
                    continue; // 클릭했으면 루프 처음으로
                }
            } catch (e) {
                // 버튼 못 찾으면 무시
            }

            // 3초 대기 후 재시도
            await page.waitForTimeout(3000);
        }

        // C. 시간이 지났는데도 여전히 로그인 페이지라면 강제 이동 시도
        if (!isLoggedIn) {
            console.log('📍 리다이렉트가 늦어지고 있습니다. 홈으로 직접 이동을 시도합니다...');
            await page.goto('https://gift.kakao.com/home', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
        }

        // 6. 최종 로그인 성공 확인
        try {
            await expect(page.locator('.btn_logout')).toBeVisible({ timeout: 10000 });
            console.log('✅ 로그인 성공 확인 완료! (로그아웃 버튼 존재)');
        } catch (e) {
            console.error('❌ 로그인 성공 확인 실패. 2차 인증을 완료하지 못했거나, 계정 잠김 상태일 수 있습니다.');
            console.error(`Current URL: ${page.url()}`);
            throw new Error('로그인 실패 (타임아웃)');
        }
    }
});
