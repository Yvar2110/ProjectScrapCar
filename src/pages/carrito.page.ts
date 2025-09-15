import { Page, Locator, expect } from '@playwright/test';

export interface CartItem {
  name: string;
  price: string;
  quantity: number;
  total: string;
}

export class CarritoPage {
  readonly page: Page;
  readonly cartTable: Locator;
  readonly cartItems: Locator;
  readonly cartItemNames: Locator;
  readonly cartItemPrices: Locator;
  readonly cartItemQuantities: Locator;
  readonly cartItemTotals: Locator;
  readonly subtotalElement: Locator;
  readonly totalElement: Locator;
  readonly cartCounter: Locator;
  readonly emptyCartMessage: Locator;
  readonly cartIcon: Locator;

  constructor(page: Page) {
    this.page = page;

    this.cartTable = page.locator('.woocommerce-cart-form, .cart_totals, .shop_table');
    this.cartItems = page.locator('.woocommerce-cart-form__cart-item, .cart_item, tr.cart_item');
    this.cartItemNames = page.locator('.product-name a, .woocommerce-cart-form__cart-item .product-name');
    this.cartItemPrices = page.locator('.product-price .amount, .woocommerce-Price-amount');
    this.cartItemQuantities = page.locator('.product-quantity input, input.qty');
    this.cartItemTotals = page.locator('.product-subtotal .amount, .line-total .amount');
    this.subtotalElement = page.locator('.cart-subtotal .amount, .order-total .amount, .cart_totals .amount').first();
    this.totalElement = page.locator('.order-total .amount, .cart_totals .order-total .amount');
    this.cartCounter = page.locator('.cart-contents-count, .cart-count, .cart-counter');
    this.emptyCartMessage = page.locator('.cart-empty, .woocommerce-info, .wc-empty-cart-message');
    this.cartIcon = page.locator('.cart-icon, .shopping-cart, a[href*="cart"]');
  }

  async goto() {
    await this.page.goto('/cart/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToCartViaIcon() {
    try {
      await this.cartIcon.first().click();
      await this.page.waitForLoadState('domcontentloaded');
    } catch {

      await this.goto();
    }
  }

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');

    try {
      await Promise.race([
        this.cartTable.waitFor({ timeout: 5000 }),
        this.emptyCartMessage.waitFor({ timeout: 5000 })
      ]);
    } catch (error) {
      // Si no encuentra ninguno de los elementos, continúa
      console.log('Elementos del carrito no encontrados, continuando...');
    }
  }

  async getCartItems(): Promise<CartItem[]> {
    await this.waitForLoad();
    
    const items: CartItem[] = [];
    

    if (await this.isEmpty()) {
      return items;
    }

    try {

      const cartRows = await this.cartItems.all();
      
      for (const row of cartRows) {
        try {

          const nameElement = row.locator('.product-name a, .product-name, td:nth-child(2) a, td:nth-child(1) a');
          const name = await nameElement.first().textContent() || '';
          

          const priceElement = row.locator('.product-price .amount, .woocommerce-Price-amount, td:nth-child(3), td:nth-child(4)');
          const price = await priceElement.first().textContent() || '';
          

          const quantityElement = row.locator('.product-quantity input, input.qty, td:nth-child(4) input, td:nth-child(5) input');
          let quantity = 1;
          try {
            const qtyValue = await quantityElement.first().inputValue();
            quantity = parseInt(qtyValue) || 1;
          } catch {

            const qtyText = await row.locator('.product-quantity, td:nth-child(4), td:nth-child(5)').first().textContent();
            const qtyMatch = qtyText?.match(/\d+/);
            quantity = qtyMatch ? parseInt(qtyMatch[0]) : 1;
          }
          

          const totalElement = row.locator('.product-subtotal .amount, .line-total .amount, td:last-child .amount, td:last-child');
          const total = await totalElement.first().textContent() || '';
          
          if (name.trim()) {
            items.push({
              name: name.trim(),
              price: price.trim(),
              quantity: quantity,
              total: total.trim()
            });
          }
        } catch (error) {
          console.log('Error processing cart item:', error);
        }
      }
    } catch (error) {
      console.log('Error getting cart items:', error);
    }
    
    return items;
  }

  async getSubtotal(): Promise<string> {
    try {
      await this.waitForLoad();
      const subtotal = await this.subtotalElement.first().textContent();
      return subtotal?.trim() || '';
    } catch {
      return '';
    }
  }

  async getCartCounter(): Promise<number> {
    try {
      const counterText = await this.cartCounter.first().textContent();
      const count = parseInt(counterText?.replace(/[^\d]/g, '') || '0');
      return count;
    } catch {
      return 0;
    }
  }

  async isEmpty(): Promise<boolean> {
    try {

      const emptyMessageVisible = await this.emptyCartMessage.isVisible();
      if (emptyMessageVisible) {
        return true;
      }
      

      const itemCount = await this.cartItems.count();
      return itemCount === 0;
    } catch {
      return true;
    }
  }


  static cleanPrice(price: string): string {
    if (!price) return '0';

    return price.replace(/[^\d.,]/g, '').trim();
  }


  static calculateExpectedSubtotal(items: CartItem[]): string {
    let total = 0;
    
    for (const item of items) {
      const price = parseFloat(this.cleanPrice(item.price).replace(',', '.')) || 0;
      total += price * item.quantity;
    }
    
    return total.toFixed(2);
  }
}