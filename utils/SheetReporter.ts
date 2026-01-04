import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { sendToSheet } from './sendToSheet';

class SheetReporter implements Reporter {
    async onTestEnd(test: TestCase, result: TestResult) {
        const webhookUrl = process.env.SHEET_WEBHOOK_URL;
        const targetCell = process.env.SHEET_TARGET_CELL;

        if (!webhookUrl) {
            console.log('SheetReporter: No webhook URL provided in environment variables.');
            return;
        }

        if (!targetCell) {
            console.log('SheetReporter: No target cell provided in environment variables.');
            return;
        }

        const status = result.status === 'passed' ? 'PASS' : 'FAIL';
        console.log(`SheetReporter: Test finished. Status: ${status}. Sending to ${targetCell}...`);

        await sendToSheet(webhookUrl, {
            cell: targetCell,
            value: status,
            testName: test.title,
            status: status
        });
    }
}

export default SheetReporter;
