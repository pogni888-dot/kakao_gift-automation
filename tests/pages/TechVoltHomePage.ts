import { type Page, type Locator, expect } from '@playwright/test';

export class TechVoltHomePage {
    readonly page: Page;
    readonly headerLogo: Locator;
    readonly navLinks: Locator;
    readonly heroSection: Locator;
    readonly productList: Locator;
    readonly addToCartButtons: Locator;
    readonly cartIcon: Locator;

    constructor(page: Page) {
        this.page = page;
        this.headerLogo = page.locator('header h1');
        this.navLinks = page.locator('nav ul li a');
        this.heroSection = page.locator('.hero');
        this.productList = page.locator('.product-card');
        this.addToCartButtons = page.locator('text=장바구니 담기');
        this.cartIcon = page.locator('.cart-icon');
    }

    async goto() {
        await this.page.goto('https://loveforladybug.github.io/shop-website-demo/');
    }

    async verifyTitle() {
        await expect(this.page).toHaveTitle(/TechVolt/);
    }

    async verifyHeader() {
        await expect(this.headerLogo).toBeVisible();
        await expect(this.headerLogo).toHaveText('TechVolt');
    }

    async verifyProductListVisible() {
        await expect(this.productList.first()).toBeVisible();
    }

    async clickFirstProductAddToCart() {
        await this.addToCartButtons.first().click();
    }
}
