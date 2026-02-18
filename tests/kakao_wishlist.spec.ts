import { test, expect } from '@playwright/test';
import { kakaoLogin } from '../utils/kakaoLogin';

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(120000); // 타임아웃을 120초로 늘림 (로그인 대기 포함)

    // ===== 자동 로그인 처리 =====
    await kakaoLogin(page);

    // 3. 검색을 통해 상품 상세 페이지 진입
    console.log('상품 검색 시작: 초콜릿');
    await page.click('a.link_search');
    await page.fill('#searchInput', '초콜릿');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 검색 결과 첫 번째 상품 진입
    const firstProduct = page.locator('div.cmp_prd').first();
    await firstProduct.click();
    await page.waitForLoadState();
    await page.waitForTimeout(2000);

    // 상품명 저장 (검증용)
    const productTitleLocator = page.locator('h4.tit_subject');
    await productTitleLocator.waitFor();
    const productTitle = await productTitleLocator.innerText();
    console.log(`선택된 상품명: ${productTitle}`);

    // 4. 위시리스트(찜) 버튼 클릭
    // 상세페이지 내 찜하기 버튼 식별 (button.btn_wish)
    const wishBtn = page.locator('button.btn_wish').first();
    await wishBtn.click();
    await page.waitForTimeout(1000);

    const wishlist = await page.locator('div.group_wshradio').nth(1);
    await wishlist.locator('span.ico_base.ico_radio').click();
    await page.waitForTimeout(1000);

    await page.locator('button.btn_wshlimit').click();
    await page.waitForTimeout(5000);
});
