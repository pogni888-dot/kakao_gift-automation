import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';

/**
 * 번개장터 상품 등록 자동화
 * 
 * [사전 조건]
 * - bunjang_login.spec.ts를 먼저 실행하여 bunjang_auth.json 세션 생성 필요
 * - api/image에 상품 이미지가 업로드되어 있어야 함
 */

const bunjangAuth = path.resolve(__dirname, '../bunjang_auth.json');

// 2. 저장된 번개장터 로그인 세션 불러오기 (자동 로그인)
test.use({
    storageState: fs.existsSync(bunjangAuth) ? bunjangAuth : undefined
});

test.describe('번개장터 상품 등록', () => {
    test.setTimeout(120000);

    test('상품 등록', async ({ page }) => {
        // 1. 번개장터 접속
        console.log('1. 번개장터 접속...');
        await page.goto('https://m.bunjang.co.kr/');
        await page.waitForLoadState('networkidle');

        // 3. 2초 대기
        await page.waitForTimeout(2000);

        // 4. a 클래스명 'sc-eXEjpC BltZS' 요소 클릭
        console.log('4. 판매하기 버튼 클릭...');
        await page.locator('a.sc-eXEjpC.BltZS').nth(1).click();

        // 5. 2초 대기
        await page.waitForTimeout(2000);

        // 6. api/image에 있는 이미지 파일을 input type="file"인 요소에 등록
        console.log('6. API에서 이미지 가져와서 등록...');
        const imageResponse = await page.request.get('http://localhost:3001/api/image');
        const imageList = await imageResponse.json();

        if (!imageList.images || imageList.images.length === 0) {
            throw new Error('❌ api/image에 등록된 이미지가 없습니다. Postman으로 먼저 이미지를 업로드해주세요.');
        }

        // 첫 번째 이미지를 가져옴
        const firstImage = imageList.images[0];
        console.log(`📷 이미지 파일: ${firstImage.filename}`);

        const imgResponse = await page.request.get(`http://localhost:3001/api/image/${firstImage.filename}`);
        const imageBuffer = await imgResponse.body();

        // input type="file" 요소에 이미지 등록
        await page.setInputFiles('input[type="file"]', {
            name: firstImage.filename,
            mimeType: firstImage.filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
            buffer: imageBuffer
        });
        console.log('✅ 이미지 등록 완료');

        // 7. 1초 대기
        await page.waitForTimeout(1000);

        // 8. input 클래스명 'sc-fONwsr yAEIL' 클릭
        console.log('8. 상품명 입력 필드 클릭...');
        await page.locator('input.sc-fONwsr.yAEIL').first().click();

        // 9. '상품명테스트입력' 문구 입력
        await page.locator('input.sc-fONwsr.yAEIL').first().fill('상품명테스트입력');
        console.log('9. 상품명 입력 완료');

        // 10. 1초 대기
        await page.waitForTimeout(1000);

        // 11. 버튼 텍스트가 '여성의류'인 버튼 클릭
        console.log('11. 카테고리 선택: 여성의류...');
        await page.locator('button:has-text("여성의류")').click();

        // 12. 1초 대기
        await page.waitForTimeout(1000);

        // 13. 버튼 텍스트가 '아우터'인 버튼 클릭
        console.log('13. 카테고리 선택: 아우터...');
        await page.locator('button:has-text("아우터")').click();

        // 14. 1초 대기
        await page.waitForTimeout(1000);

        // 15. 버튼 텍스트가 '패딩'인 버튼 클릭
        console.log('15. 카테고리 선택: 패딩...');
        await page.locator('button:has-text("패딩")').click();

        // 16. 1초 대기
        await page.waitForTimeout(1000);

        // 17. label 클래스명 'sc-elNKlv kBjqEq' 요소 클릭
        console.log('17. 라벨 클릭...');
        await page.locator('label:has(input[type="radio"]):has-text("새 상품 (미사용)")').click();

        // 18. 1초 대기
        await page.waitForTimeout(1000);

        // 19. input 클래스명 'sc-fONwsr yAEIL sc-hRmvpr eyswfN' 요소 클릭
        console.log('19. 입력 필드 클릭...');
        await page.locator('input.sc-fONwsr.yAEIL.sc-hRmvpr.eyswfN').click();

        // 20. 1초 대기
        await page.waitForTimeout(1000);

        // 21. input value 값이 'Free' 인 요소 클릭
        console.log('21. Free 옵션 선택...');
        await page.locator('input[value="Free"]').click();

        // 22. 1초 대기
        await page.waitForTimeout(1000);

        // 23. 버튼 클래스명 'sc-gEvEer bZhDVM bun-ui-button' 요소 클릭
        console.log('23. 확인 버튼 클릭...');
        await page.locator('button.sc-gEvEer.bZhDVM.bun-ui-button').click();

        // 24. 1초 대기
        await page.waitForTimeout(1000);

        // 25. div 클래스명 하위(>)의 textarea 요소 클릭
        console.log('25. 상품 설명 입력 필드 클릭...');
        await page.locator('div.ProductNewstyle__Content-sc-7fge4a-7.nqDMw > textarea').click();

        // 26. 1초 대기
        await page.waitForTimeout(1000);

        // 27. '테스트상품설명' 입력
        await page.locator('div.ProductNewstyle__Content-sc-7fge4a-7.nqDMw > textarea').fill('테스트상품설명');
        console.log('27. 상품 설명 입력 완료');

        // 28. 1초 대기
        await page.waitForTimeout(1000);

        // 29. div 클래스명 하위(>)의 input 요소 클릭 (태그 입력)
        console.log('29. 태그 입력 필드 클릭...');
        await page.locator('div.TagBoxstyle__WithDeleteAll-sc-jn2mit-12.ihIdoc > input').click();

        // 30. 1초 대기
        await page.waitForTimeout(1000);

        // 31. '태그' 입력
        await page.locator('div.TagBoxstyle__WithDeleteAll-sc-jn2mit-12.ihIdoc > input').fill('태그');
        console.log('31. 태그 입력 완료');

        // 32. 1초 대기
        await page.waitForTimeout(1000);

        // 추천 태그 첫 번째 항목 클릭
        console.log('추천 태그 첫 번째 항목 클릭...');
        await page.locator('ul.TagBoxstyle__SuggestedTags-sc-jn2mit-8.ixHygc > li:first-child > button').click();

        // 1초 대기
        await page.waitForTimeout(1000);

        // 33. div 클래스명 하위(>) input 요소 클릭 (가격 입력)
        console.log('33. 가격 입력 필드 클릭...');
        await page.locator('div.sc-gVyKpa.RBCDN > div > input').click();

        // 34. 1초 대기
        await page.waitForTimeout(1000);

        // 35. '10000' 입력
        await page.locator('div.sc-gVyKpa.RBCDN > div > input').fill('10000');
        console.log('35. 가격 입력 완료: 10,000원');

        // 36. 3초 대기
        await page.waitForTimeout(3000);

        console.log('✅ 상품 등록 프로세스 완료!');
    });
});
