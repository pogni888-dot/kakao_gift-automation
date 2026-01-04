# Levyplay Automation

This repository contains Playwright automation scripts for KakaoTalk services.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run Tests
   ```bash
   # Chrome
   npm run test:chrome
   
   # Mobile
   npm run test:mobile
   ```

## CI/CD Service

This project is configured with GitHub Actions.
Check `.github/workflows/playwright.yml` for details.

> **Note:** Current tests rely on `connectOverCDP` to a local Chrome instance. These specific tests may fail in CI environments unless refactored to launch their own browser instance.
