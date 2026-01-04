import { type Page, type Locator, expect } from '@playwright/test';

export class ShopPage {
    readonly page: Page;
    readonly title: RegExp;
    readonly url: string;

    constructor(page: Page) {
        this.page = page;
        this.title = /TechVolt/;
        this.url = 'https://loveforladybug.github.io/shop-website-demo/';
    }

    /**
     * 메인 페이지로 이동합니다.
     */
    async navigate() {
        await this.page.goto(this.url);
    }

    /**
     * 페이지 타이틀이 올바른지 확인합니다.
     */
    async verifyTitle() {
        await expect(this.page).toHaveTitle(this.title);
    }

    /**
     * 특정 카테고리 링크를 가져옵니다.
     * @param categoryName 카테고리 이름 (예: '스마트폰', '노트북')
     */
    getCategoryLink(categoryName: string): Locator {
        return this.page.getByRole('link', { name: categoryName, exact: true });
    }

    /**
     * 섹션 헤더가 보이는지 확인합니다.
     * @param headerName 헤더 이름 (예: '최신 기술의 새로운 경험', '인기 상품')
     */
    async verifySectionHeaderVisible(headerName: string) {
        // h1, h2, h3 등 헤더 태그 내의 텍스트를 찾습니다.
        const header = this.page.getByRole('heading', { name: headerName });
        await expect(header).toBeVisible();
    }
}
