import { test, expect } from '@playwright/test';
import { kakaoLogin } from '../utils/kakaoLogin';

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(120000); // 타임아웃을 120초로 늘림 (로그인 대기 포함)

    // ===== 자동 로그인 처리 =====
    await kakaoLogin(page);

    // 5. 로그인 성공 확인
    await page.waitForTimeout(1000);

    // 6. 검색 버튼 클릭 및 '볼펜' 검색
    await page.click('a.link_search');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('#searchInput');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('볼펜');
    await page.waitForTimeout(1000);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // 7. 검색 결과에서 첫 번째 상품 클릭
    const firstProduct = page.locator('a.link_thumb').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();
    await page.waitForLoadState();
    await page.waitForTimeout(5000);
});