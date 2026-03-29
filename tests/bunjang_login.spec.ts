import { test, expect } from './fixtures';

test.describe('번개장터 테스트', () => {
    test.setTimeout(60000);

    test('번개장터 로그인', async ({ page }) => {
        // 환경변수에서 아이디/비밀번호 가져오기 (대시보드 팝업에서 입력한 값)
        const userId = process.env.KAKAO_ID;
        const userPw = process.env.KAKAO_PW;

        if (!userId || !userPw) {
            throw new Error('❌ 아이디와 비밀번호가 입력되지 않았습니다. 대시보드에서 Run Test 클릭 후 입력해주세요.');
        }

        console.log(`🔑 입력된 아이디: ${userId}`);

        // 1. 번개장터 페이지 진입
        await page.goto('https://m.bunjang.co.kr/');
        await page.waitForLoadState('networkidle');

        // 2. 2초 대기
        await page.waitForTimeout(2000);

        // 3. div클래스명 'sc-jtRfpW dwQPdU' 하위(>)의 버튼 클래스명 'sc-dqBHgY dDTfxq' 클릭
        console.log('3. 로그인/회원가입 버튼 클릭...');
        await page.locator('div.sc-jtRfpW.dwQPdU > button.sc-dqBHgY.dDTfxq').click();

        // 4. 2초 대기
        await page.waitForTimeout(2000);

        // 5. div클래스명 'sc-fOKMvo icXGke' 하위(>)의 버튼 클래스명 'sc-gHboQg bSxxhX' 클릭
        console.log('5. 로그인 방식 선택 버튼 클릭...');
        await page.locator('div.sc-fOKMvo.icXGke > button.sc-gHboQg.bSxxhX').click();

        // 6. 2초 대기
        await page.waitForTimeout(2000);

        // 7. div클래스명 'box_tf focus' 하위(>)의 input 아이디명 'loginId--1' 클릭
        console.log('7. 아이디 입력 필드 클릭...');
        await page.locator('input#loginId--1').click();

        // 8. 1초 대기
        await page.waitForTimeout(1000);

        // 9. 아이디 입력 (환경변수)
        await page.locator('input#loginId--1').fill(userId);

        // 10. 1초 대기
        await page.waitForTimeout(1000);

        // 11. div클래스명 'box_tf' 하위(>)의 input 아이디명 'password--2' 클릭
        console.log('11. 비밀번호 입력 필드 클릭...');
        await page.locator('input#password--2').click();

        // 12. 1초 대기
        await page.waitForTimeout(1000);

        // 13. 비밀번호 입력 (환경변수)
        await page.locator('input#password--2').fill(userPw);

        // 14. 1초 대기
        await page.waitForTimeout(1000);

        // 15. 버튼 클래스명 'btn_g highlight submit' 클릭
        console.log('15. 로그인 버튼 클릭...');
        await page.locator('button.btn_g.highlight.submit').click();

        // 16. 3초 대기
        await page.waitForTimeout(3000);

        console.log('✅ 로그인 프로세스 완료!');
    });
});
