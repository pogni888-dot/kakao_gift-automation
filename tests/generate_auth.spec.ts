
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 이 스크립트는 '최초 1회' 실행하여 로그인 세션을 저장하는 용도입니다.
 * 실행 명령: npx playwright test tests/generate_auth.spec.ts --headed
 */

const authFile = path.resolve(__dirname, '../auth.json');

test.use({ headless: false });

test('카카오 로그인 세션 생성 및 저장', async ({ page }) => {
    console.log(`📂 세션 파일이 저장될 경로: ${authFile}`);

    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home', { waitUntil: 'domcontentloaded' });


    // [중요] 페이지 로딩 대기
    console.log('페이지 로딩 중...');
    // waitForSelector가 실패할 수 있으므로, domcontentloaded 상태와 넉넉한 타임아웃을 사용합니다.
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // UI 렌더링 안정화 대기

    // 2. 로그인 버튼 vs 마이페이지 버튼 확인
    // 헤더가 늦게 뜰 수 있으니 찾을 때까지 약간 기다립니다.
    const loginBtn = page.locator('a.link_login');
    const myPageBtn = page.locator('a.link_mypage'); // 로그인 됐을 때 나오는 버튼(예시)

    let needLogin = true;

    // 로그인 버튼이 보이거나, 마이페이지 버튼이 보일 때까지 잠시 대기
    try {
        await expect(loginBtn.or(myPageBtn)).toBeVisible({ timeout: 10000 });
        if (await myPageBtn.isVisible()) {
            needLogin = false;
        }
    } catch (e) {
        console.log('로그인 버튼이나 마이페이지 버튼을 찾을 수 없습니다. (로딩 지연 가능성)');
    }

    if (needLogin) {
        console.log('🔵 로그인이 필요합니다.');
        await loginBtn.click();

        // 아이디 입력 시도
        try {
            await page.fill('#loginId--1', 'pogni822@naver.com');
            await page.fill('#password--2', 'wpwnehQ!12');
            await page.click('button.btn_g.highlight.submit');
        } catch (e) {
            console.log('자동 입력 실패/이미 입력됨. 수동 진행해주세요.');
        }

        console.log('⚠️ [사용자 개입 필요] 캡챠/2단계 인증 해결 후 로그인을 완료해주세요.');
        console.log('⏳ "로그아웃" 혹은 "마이페이지"가 보일 때까지 대기합니다...');

        // 로그인이 완료되어 홈으로 돌아오고, 로그인 버튼이 사라질 때까지 대기
        await expect(loginBtn).toBeHidden({ timeout: 600000 }); // 10분 대기
        console.log('로그인 버튼 사라짐 확인. 로그인 완료 추정.');

        // 추가 대기
        await page.waitForTimeout(5000);
    } else {
        console.log('🟢 이미 로그인 상태로 감지됩니다. (로그인 버튼이 안보임)');
        // 혹시 모르니 쿠키 확인
        const context = page.context();
        const cookies = await context.cookies();
        console.log(`현재 쿠키 개수: ${cookies.length}개`);

        if (cookies.length < 5) {
            console.log('⚠️ 쿠키가 너무 적습니다. 실제로는 로그아웃 상태일 수 있습니다. 브라우저를 다시 띄워 로그인을 시도할 것을 권장합니다.');
            // 강제로 로그인 페이지로 보내볼 수도 있음
            // await page.goto('https://accounts.kakao.com/login?continue=https://gift.kakao.com/home');
        }
    }

    // 3. 세션 저장
    await page.context().storageState({ path: authFile });

    console.log(`✅ auth.json 저장 완료! 경로: ${authFile}`);

    // 최종 확인
    if (fs.existsSync(authFile)) {
        const data = fs.readFileSync(authFile, 'utf8');
        const authData = JSON.parse(data);
        console.log(`최종 저장된 쿠키 개수: ${authData.cookies.length}개`);

        if (authData.cookies.length < 5) {
            console.log('❌ [실패 가능성] 저장된 쿠키가 너무 적습니다. (3개 이하면 로그인 실패 확률 높음)');
            console.log('👉 기존 auth.json을 삭제하거나, 브라우저가 뜨면 우측 상단 "로그인"을 직접 눌러서 확실히 로그인해주세요!');
        }
    }
});
