import { Page, Locator } from '@playwright/test';

export class CategoriaPage {
  readonly page: Page;
  readonly amor: Locator;
  readonly productos: Locator;
  

  constructor(page: Page) {
    this.page = page;
    this.amor = page.locator('a:has-text("Amor")');
    this.productos = page.locator('.product, .producto, [data-product]');
    
  }

  async navigateToAmorCategory() {
    await this.amor.first().click();
  }
  
  
}