import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 서버에서 실행하여 로그인 세션(auth.json)을 생성/갱신하는 스크립트
 * 
 * [사용법]
 * 대시보드에서 이 파일을 실행하면:
 * 1. 카카오 로그인 페이지로 이동
 * 2. ID/PW 자동 입력 후 로그인
 * 3. 성공 시 auth.json에 쿠키 저장
 * 4. 이후 다른 테스트 파일에서 이 쿠키를 자동으로 불러와 로그인 상태 유지
 */

const authFile = path.resolve(__dirname, '../auth.json');

// 카카오 계정 정보
const KAKAO_ID = 'pogni822@naver.com';
const KAKAO_PW = 'wpwnehQ!12';

test('카카오 로그인 세션 생성 및 저장', async ({ page }) => {
    test.setTimeout(300000); // 5분 타임아웃 (2차 인증 대기 포함)

    console.log(`📂 세션 파일 저장 경로: ${authFile}`);

    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. 현재 로그인 상태 확인
    const loginBtn = page.locator('a.link_login');
    const logoutBtn = page.locator('.btn_logout');

    // 이미 로그인 되어있는지 확인
    if (await logoutBtn.isVisible()) {
        console.log('🟢 이미 로그인 상태입니다!');
    } else if (await loginBtn.isVisible()) {
        console.log('🔵 로그인이 필요합니다. 자동 로그인을 시도합니다...');

        // 3. 로그인 페이지로 이동
        await loginBtn.click();
        await page.waitForTimeout(2000);

        // 4. ID/PW 자동 입력
        try {
            const idInput = page.locator('#loginId--1');
            await idInput.waitFor({ state: 'visible', timeout: 10000 });
            await idInput.fill(KAKAO_ID);
            await page.waitForTimeout(500);

            await page.fill('#password--2', KAKAO_PW);
            await page.waitForTimeout(500);

            // 5. 로그인 버튼 클릭
            await page.click('button.btn_g.highlight.submit');
            console.log('🔄 로그인 요청 전송됨. 결과 대기 중...');
        } catch (e) {
            console.log('⚠️ 자동 입력 실패. 이미 입력되었거나 폼을 찾을 수 없습니다.');
        }

        // 6. 로그인 완료 대기 (2차 인증 + continue 버튼 처리)
        console.log('⏳ 로그인 완료 대기 중... (2차 인증 / continue 버튼 자동 처리)');

        const maxWait = 240000; // 최대 4분
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            // gift.kakao.com으로 돌아왔는지 확인
            if (page.url().includes('gift.kakao.com')) {
                console.log('✅ 카카오 선물하기 페이지로 돌아왔습니다!');
                await page.waitForTimeout(2000);
                break;
            }

            // 'continue' 버튼이 보이면 클릭
            try {
                const continueBtn = page.locator('button:has-text("continue"), a:has-text("continue"), input[value="continue"], button:has-text("Continue"), a:has-text("Continue")').first();
                if (await continueBtn.isVisible()) {
                    console.log('🔘 "continue" 버튼 발견! 클릭합니다...');
                    await continueBtn.click();
                    await page.waitForTimeout(3000);
                    continue;
                }
            } catch (e) {
                // 버튼 못 찾으면 무시
            }

            // 3초마다 체크
            await page.waitForTimeout(3000);
        }

        // 4분 지났는데도 gift.kakao.com이 아니면 직접 이동
        if (!page.url().includes('gift.kakao.com')) {
            console.log('📍 리다이렉트 대기 실패. 홈으로 직접 이동합니다...');
            await page.goto('https://gift.kakao.com/home', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
        }
    } else {
        console.log('� 로그인 버튼이 보이지 않습니다. 로그인 상태로 간주합니다.');
    }

    // 7. 최종 로그인 상태 확인
    const finalLoginBtn = page.locator('a.link_login');
    const isLoggedIn = !(await finalLoginBtn.isVisible());

    if (isLoggedIn) {
        console.log('✅ 로그인 확인됨!');
    } else {
        console.log('❌ 로그인 실패. auth.json이 제대로 생성되지 않을 수 있습니다.');
    }

    // 8. 세션(쿠키) 저장
    await page.context().storageState({ path: authFile });

    // 9. 저장 결과 확인
    if (fs.existsSync(authFile)) {
        const data = fs.readFileSync(authFile, 'utf8');
        const authData = JSON.parse(data);
        console.log(`💾 auth.json 저장 완료! (쿠키 ${authData.cookies.length}개)`);

        if (authData.cookies.length < 5) {
            console.log('⚠️ 쿠키가 너무 적습니다. 로그인이 완전히 되지 않았을 수 있습니다.');
        } else {
            console.log('🎉 세션 생성 성공! 이제 다른 테스트 파일을 실행하면 자동 로그인됩니다.');
        }
    } else {
        console.log('❌ auth.json 파일 생성 실패');
    }
});
