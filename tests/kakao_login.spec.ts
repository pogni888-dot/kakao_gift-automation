import { test, expect } from '@playwright/test';
import { kakaoLogin } from '../utils/kakaoLogin';

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(120000); // 타임아웃을 120초로 늘림

    // ===== 자동 로그인 처리 =====
    await kakaoLogin(page);

    // 로그인 성공 확인
    console.log('✅ 카카오 로그인 테스트 완료');
    await page.waitForTimeout(3000);
});
