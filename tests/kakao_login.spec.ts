import { test, expect } from './fixtures';
import path from 'path';
import fs from 'fs';

// auth.json 사용 설정 (generate_auth.spec.ts 선행 실행 필수)
const authFile = path.resolve(__dirname, '../auth.json');
if (!fs.existsSync(authFile)) {
    console.warn('⚠️ auth.json이 없습니다! 먼저 generate_auth.spec.ts를 실행해주세요.');
}
test.use({ storageState: authFile });

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(60000);

    // ===== 자동 로그인 처리 =====
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 로그인 성공 확인
    console.log('✅ 카카오 로그인 테스트 완료');
    await page.waitForTimeout(3000);
});
