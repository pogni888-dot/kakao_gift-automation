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

    // ===== 캘린더 날짜 선택 로직 시작 =====
    console.log('캘린더 열기...');
    // 1. div클래스 'css-1es3gy' 클릭 (요소가 2개라서 첫번째 명시)
    await page.locator('div.css-1es3gy').first().click();

    // 2. 2초 대기
    await page.waitForTimeout(2000);

    // 3. div클래스 'gc-calendar-month' 첫번째 요소 확인
    const calendarMonth = page.locator('div.gc-calendar-month').first();
    await calendarMonth.waitFor({ state: 'visible', timeout: 5000 });

    // 4. 해당 요소 하위의 ul클래스 'css-gwlvhb' 두번째 요소 확인
    const targetUl = calendarMonth.locator('ul.css-gwlvhb').nth(1);

    // 5. 2초대기
    await page.waitForTimeout(2000);

    // 6. 해당 ul 클래스 하위의 li 태그 확인
    const liElements = targetUl.locator('li');

    // 해당 월 달력에서 선택 가능한 맨 마지막 두 날짜 찾기
    const liCount = await liElements.count();
    const availableIndices = [];

    // 7. 모든 li를 순회하며 선택 가능한(버튼이 활성화된) 날짜의 인덱스를 수집
    for (let i = 0; i < liCount; i++) {
        const button = liElements.nth(i).locator('button');
        if (await button.count() > 0) {
            // 버튼이 활성화되어 있는지 확인 (disabled 상태 제외)
            const isEnabled = await button.isEnabled();
            if (isEnabled) {
                availableIndices.push(i);
            }
        }
    }

    // 8. 마지막 두 날짜 선택
    if (availableIndices.length >= 2) {
        const checkinIndex = availableIndices[availableIndices.length - 2];
        const checkoutIndex = availableIndices[availableIndices.length - 1];

        console.log(`선택 가능한 맨 마지막 두 날짜 클릭 (인덱스: ${checkinIndex}, ${checkoutIndex})`);

        // 체크인 날짜 (마지막에서 두 번째)
        await liElements.nth(checkinIndex).locator('button').click();

        // 9. 2초 대기
        await page.waitForTimeout(2000);

        // 10. 체크아웃 날짜 (마지막)
        await liElements.nth(checkoutIndex).locator('button').click();
    } else {
        console.log("선택 가능한 날짜가 2개 이상 존재하지 않습니다.");
    }

    // 11. 2초 대기
    await page.waitForTimeout(2000);
    // ===== 캘린더 날짜 선택 로직 끝 =====

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

    // 7. 2초 대기
    await page.waitForTimeout(2000);

    // 8. div클래스 'css-1jiha5s' 노출 확인
    console.log("검색 결과 컨테이너('css-1jiha5s') 노출 대기...");
    const resultContainer = page.locator('div.css-1jiha5s');
    await resultContainer.waitFor({ state: 'visible', timeout: 5000 });

    // 9. 해당 클래스 하위의 div클래스 'css-1u8qly9' 첫번째 요소 확인
    console.log("결과 항목 첫 번째 요소 확인...");
    const firstResultItem = resultContainer.locator('div.css-1u8qly9').first();

    // 10. a 클래스 'css-131wkdg' 하위 특정 요소 클릭
    const aTag = firstResultItem.locator('a.css-131wkdg');

    // 1. a 클래스 하위에 있는 div클래스 'css-gvoll6' 확인
    console.log("a 클래스 하위 div 'css-gvoll6' 확인...");
    const innerDiv1 = aTag.locator('div.css-gvoll6');
    await innerDiv1.waitFor({ state: 'visible', timeout: 5000 });

    // 2. 해당 div클래스 하위의 div클래스 'css-7xiv94' 클릭 전, 새 창 열림을 방지하기 위해 a 태그의 target 속성 제거
    console.log("새 창 열림 방지를 위해 a 태그 target 속성 제거...");
    await aTag.evaluate(node => node.removeAttribute('target'));

    // 3. 요소 클릭 (현재 창에서 이동됨)
    console.log("div 'css-7xiv94' 클릭...");
    await innerDiv1.locator('div.css-7xiv94').click();
    // 3. 3초 대기
    await page.waitForTimeout(3000);

    // 1. 화면에 버튼 클래스중 span태그의 텍스트값이 '대실 예약'인 버튼이 있는지 확인하고, 그중 첫번째 요소 클릭
    console.log("'숙박 예약' 버튼 확인 및 클릭 시도...");
    const reserveButton = page.locator('button').filter({ has: page.locator('span', { hasText: '숙박 예약' }) });

    if (await reserveButton.count() > 0) {
        console.log("'숙박 예약' 버튼을 찾았습니다. 해당 위치로 스크롤합니다.");
        const firstButton = reserveButton.first();
        await firstButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);

        console.log("첫 번째 요소를 클릭합니다.");
        await firstButton.click();
    } else {
        console.log("'숙박 예약' 버튼을 찾을 수 없습니다.");
    }

    // 11. 5초 대기
    await page.waitForTimeout(5000);
});
