import { request } from '@playwright/test';

/**
 * Send test results or specific data to Google Sheets via Webhook
 * @param webhookUrl The Web App URL from Google Apps Script
 * @param data Object containing data to send (e.g. { testName, status } or { cell, value })
 */
export async function sendToSheet(webhookUrl: string, data: Record<string, any>) {
    if (!webhookUrl || webhookUrl.trim() === '') {
        console.log('⚠️ Google Sheets Webhook URL is missing. Skipping report.');
        return;
    }

    try {
        const context = await request.newContext();
        const response = await context.post(webhookUrl, {
            data: data,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok()) {
            console.log('✅ Data saved to Google Sheets successfully.');
        } else {
            console.error(`❌ Failed to save to Google Sheets: ${response.status()} ${response.statusText()}`);
        }
    } catch (error) {
        console.error('❌ Error sending to Google Sheets:', error);
    }
}
