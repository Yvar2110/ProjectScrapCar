import { Page, Locator } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly menuAmor: Locator;
    readonly buttonList: Locator;

    private readonly productSelectors = [
        '.product .woocommerce-loop-product__link',
        '.product a[href*="/product/"]',
        'h2.woocommerce-loop-product__title a',
        '.product-title a',
        '.entry-title a[href*="/product/"]',
        'a.woocommerce-LoopProduct-link'
    ];

    private readonly categorySelectors = [
        'a[href*="category"]',
        'a[href*="amor"]',
        '.product-category',
        '.menu-item a'
    ];

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
    }

    async findProductLinks(maxProducts = 5): Promise<string[]> {
        const productLinks: string[] = [];
        
        for (const selector of this.productSelectors) {
            try {
                const elements = await this.page.locator(selector).all();
                if (elements.length > 0) {
                    console.log(`Encontrados ${elements.length} elementos con selector: ${selector}`);
                    
                    for (let i = 0; i < Math.min(elements.length, maxProducts); i++) {
                        try {
                            const href = await elements[i].getAttribute('href');
                            if (href && href.includes('/product/') && !href.includes('category')) {
                                productLinks.push(href);
                            }
                        } catch (e) {
                            // Continue with next element
                        }
                    }
                    
                    if (productLinks.length > 0) break;
                }
            } catch (e) {
                console.log(`Selector ${selector} no encontrado`);
            }
        }
        
        return productLinks;
    }

    async navigateToAnyCategory(): Promise<boolean> {
        for (const selector of this.categorySelectors) {
            try {
                const categoryLinks = await this.page.locator(selector).all();
                if (categoryLinks.length > 0) {
                    console.log(`Encontradas ${categoryLinks.length} categorías`);
                    await categoryLinks[0].click();
                    await this.page.waitForTimeout(4500);
                    return true;
                }
            } catch (e) {
                console.log(`No se pudo hacer clic en categoría con selector: ${selector}`);
            }
        }
        return false;
    }

}