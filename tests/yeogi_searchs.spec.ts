import { test, expect } from './fixtures';

test('여기어때 사이트 진입', async ({ page }) => {
    // 1. 여기어때 메인 페이지로 이동
    console.log('여기어때 메인 페이지 접속 시도...');
    await page.goto('https://www.yeogi.com/', { waitUntil: 'domcontentloaded' });

    // 2. 접속 확인
    // URL이 yeogi.com을 포함하는지 확인합니다.
    await expect(page).toHaveURL(/.*yeogi\.com.*/);
    console.log('여기어때 메인 페이지 접속 성공!');

    // 2. 3초 대기 (화면 로딩 대기)
    await page.waitForTimeout(3000);

    // 3. 검색 인풋박스 클릭
    console.log('검색 인풋박스 클릭 시도...');
    const searchInput = page.getByPlaceholder('여행지나 숙소를 검색해보세요.');
    await searchInput.click();

    // 4. '서울' 입력
    console.log("'서울' 입력 시도...");
    await searchInput.fill('서울');
    
    // 2초 대기
    await page.waitForTimeout(2000);

    // 5. 인풋박스 하위 연관검색어 컨테이너 노출 확인
    console.log("연관 검색어 노출 확인 시도...");
    await page.waitForSelector('div.css-sv8dvj.transition-toast-fade-in-out-enter-done', { state: 'visible', timeout: 2000 });

    // 6. ul.css-bkjmb2 하위의 li 중 두번째 요소(인덱스 1) 클릭
    console.log("두 번째 연관 검색어 클릭 시도...");
    await page.locator('ul.css-bkjmb2 > li').nth(1).click();

    // 7. 5초 대기
    await page.waitForTimeout(5000);
});
