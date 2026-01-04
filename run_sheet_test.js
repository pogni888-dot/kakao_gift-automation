const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. 설정 파일 읽기
const configPath = path.join(__dirname, 'test_runner_config.json');

if (!fs.existsSync(configPath)) {
    console.error('Error: test_runner_config.json file not found.');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!config.testFile) {
    console.error('Error: "testFile" is not specified in config.');
    process.exit(1);
}

// 2. 환경 변수 준비
const env = {
    ...process.env,
    SHEET_WEBHOOK_URL: config.webhookUrl,
    SHEET_TARGET_CELL: config.targetCell || 'L53' // 지정되지 않은 경우 기본값 L53 사용
};

// 3. Playwright 명령어 생성
// utils/SheetReporter.ts에 위치한 커스텀 리포터를 사용합니다.
// 참고: Playwright는 기본적으로 TS 리포터를 지원하므로 TS 파일을 직접 지정해도 동작합니다.

const command = `npx playwright test ${config.testFile} --reporter=./utils/SheetReporter.ts,line`;

console.log(`Starting test: ${config.testFile}`);
console.log(`Target Cell: ${config.targetCell}`);
console.log(`Command: ${command}`);

// 4. 명령어 실행
const child = exec(command, { env: env }, (error, stdout, stderr) => {
    if (error) {
        // 테스트 실패 시 Playwright가 비정상 종료 코드(non-zero)를 반환하는데, exec에서는 이를 에러로 취급할 수 있음
        // 하지만 출력은 여전히 보여줘야 함
        console.error(`Test finished with exit code ${error.code}`);
    }
});

// 콘솔에 출력 스트림 표시
child.stdout.on('data', (data) => console.log(data));
child.stderr.on('data', (data) => console.error(data));
