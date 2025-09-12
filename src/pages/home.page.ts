import { Page, Locator } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly menuAmor: Locator;
    readonly buttonList: Locator;

    constructor(page: Page) {
        this.page = page;
        this.menuAmor = page.locator('#primary-menu li a:has-text("Amor")');
        this.buttonList = page.locator('button[title="List"]');
    }

    async goto() {
        await this.page.goto('/');
    }

    async navigateToAmorCategory() {
    
        await this.menuAmor.click();
        await this.buttonList.click();
        await this.page.waitForTimeout(3000);

    }

}