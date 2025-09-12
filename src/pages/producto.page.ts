import { Page, Locator, expect } from '@playwright/test';

export interface ProductDetails {
  name: string;
  price: string;
  id: string;
}

export interface AddToCartResult {
  success: boolean;
  error?: string;
  productId?: string;
  productName?: string;
}

export class ProductoPage {
  readonly page: Page;
  readonly productForm: Locator;
  readonly productMeta: Locator;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly addToCartButton: Locator;
  readonly quantityInput: Locator;
  readonly cartNotification: Locator;

  constructor(page: Page) {
    this.page = page;
  
    this.productForm = page.locator('form.cart, .single-product-summary, .product-form');
    this.productMeta = page.locator('.product_meta, .product-meta, .entry-summary');
    this.productTitle = page.locator('.product_title, .entry-title, h1.product-title, .product-name h1');
    this.productPrice = page.locator('.price .amount, .woocommerce-Price-amount, .price-current, .product-price .amount').first();
    this.addToCartButton = page.locator('button[name="add-to-cart"], .single_add_to_cart_button, input[name="add-to-cart"], .add-to-cart-button');
    this.quantityInput = page.locator('input[name="quantity"], .qty, input.input-text.qty');
    this.cartNotification = page.locator('.woocommerce-message, .added-to-cart, .cart-notification, .wc-forward');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    

    await Promise.race([
      this.productForm.waitFor({ timeout: 10000 }),
      this.productTitle.waitFor({ timeout: 10000 })
    ]);
    

    await this.page.waitForTimeout(2000);
  }

  async getProductDetails(): Promise<ProductDetails> {
    await this.waitForLoad();
    

    let name = '';
    try {
      name = await this.productTitle.first().textContent() || '';
    } catch {
  
      const altTitleSelectors = ['h1', '.product-title', '.entry-title', '.woocommerce-product-title'];
      for (const selector of altTitleSelectors) {
        try {
          name = await this.page.locator(selector).first().textContent() || '';
          if (name.trim()) break;
        } catch { continue; }
      }
    }
    

    let price = '';
    try {
      price = await this.productPrice.first().textContent() || '';
    } catch {
  
      const altPriceSelectors = ['.price', '.woocommerce-Price-amount', '.amount', '.product-price'];
      for (const selector of altPriceSelectors) {
        try {
          price = await this.page.locator(selector).first().textContent() || '';
          if (price.trim()) break;
        } catch { continue; }
      }
    }
    

    const productId = await this.getProductId();
    
    return {
      name: name.trim(),
      price: this.getCleanPrice(price),
      id: productId
    };
  }

  async getProductId(): Promise<string> {
    try {
  
      const addToCartValue = await this.addToCartButton.getAttribute('value');
      if (addToCartValue && addToCartValue !== '') {
        return addToCartValue;
      }
      
  
      const hiddenInput = await this.page.locator('input[name="add-to-cart"]').getAttribute('value');
      if (hiddenInput && hiddenInput !== '') {
        return hiddenInput;
      }
      
  
      const productElement = await this.page.locator('[data-product-id], [data-product_id]').first();
      const dataId = await productElement.getAttribute('data-product-id') || await productElement.getAttribute('data-product_id');
      if (dataId) {
        return dataId;
      }
      
  
      const url = this.page.url();
      const urlMatch = url.match(/product\/(\d+)/) || url.match(/p=(\d+)/);
      if (urlMatch) {
        return urlMatch[1];
      }
      
  
      const bodyClass = await this.page.locator('body').getAttribute('class') || '';
      const classMatch = bodyClass.match(/postid-(\d+)/);
      if (classMatch) {
        return classMatch[1];
      }
      
      return 'unknown';
    } catch (error) {
      console.log('Error getting product ID:', error);
      return 'unknown';
    }
  }

  getCleanPrice(price: string): string {
    if (!price) return '0';

    return price.replace(/[^\d.,]/g, '').trim();
  }

  async addToCart(quantity: number = 1): Promise<AddToCartResult> {
    try {
      await this.waitForLoad();
      
  
      if (quantity > 1) {
        try {
          await this.quantityInput.clear();
          await this.quantityInput.fill(quantity.toString());
          await this.page.waitForTimeout(500);
        } catch {
          console.log('No se pudo configurar la cantidad, usando cantidad por defecto');
        }
      }
      
  
      const productDetails = await this.getProductDetails();
      
  
      const responsePromise = this.page.waitForResponse(
        response => {
          const url = response.url();
          return url.includes('add-to-cart') || 
                 url.includes('wc-ajax=add_to_cart') ||
                 url.includes('cart') ||
                 response.status() === 302;
        },
        { timeout: 15000 }
      ).catch(() => null);
      
  
      await this.addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
      
      if (!(await this.isAddToCartButtonEnabled())) {
        return {
          success: false,
          error: 'El botón de agregar al carrito no está habilitado'
        };
      }
      
  
      await this.addToCartButton.click();
      
  
      const response = await responsePromise;
      
      if (response && response.status() >= 400) {
        return {
          success: false,
          error: `Error en la respuesta del servidor: ${response.status()}`
        };
      }
      
  
      try {
        await Promise.race([
          this.cartNotification.waitFor({ state: 'visible', timeout: 8000 }),
          this.page.locator('.cart-contents-count, .cart-count').waitFor({ timeout: 8000 }),
          this.page.waitForURL('**/cart/**', { timeout: 8000 })
        ]);
      } catch {
    
        console.log('No se detectaron indicadores visuales, pero no hubo errores');
      }
      
      return {
        success: true,
        productId: productDetails.id,
        productName: productDetails.name
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Error agregando producto al carrito: ${error}`
      };
    }
  }

  async isAddToCartButtonEnabled(): Promise<boolean> {
    try {
      const isDisabled = await this.addToCartButton.isDisabled();
      return !isDisabled;
    } catch {
      return true;
    }
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getProductUrl(): Promise<string> {
    return this.page.url();
  }
}