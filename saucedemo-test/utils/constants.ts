export const BASE_URL = 'https://www.saucedemo.com/';

export const LOGIN_SELECTORS = {
  USERNAME: '#user-name',
  PASSWORD: '#password',
  LOGIN_BUTTON: '#login-button',
};

export const INVENTORY_SELECTORS = {
  LIST: '.inventory_list',
  ITEM: '.inventory_item',
  ITEM_NAME: '.inventory_item_name',
  ITEM_PRICE: '.inventory_item_price',
  CART_LINK: '.shopping_cart_link',
  ADD_TO_CART_BUTTON: 'button',
};

export const CART_SELECTORS = {
  ITEM: '.cart_item',
  QUANTITY: '.cart_quantity',
  REMOVE_BUTTON: 'button',
};

export const TIMEOUTS = {
  DEFAULT: 5000,
  INVENTORY: 10000,
};

export const DELAYS = {
  ADD_ITEM: { MIN: 100, MAX: 200 },
  REMOVE_ITEM: { MIN: 500, MAX: 1000 },
};

export const APP_CONFIG = {
  CURRENCY: '$',
  DEFAULT_QTY: 1,
};

export const WAIT_STATES = {
  NETWORK_IDLE: 'networkidle' as const,
};

export const ERROR_MESSAGES = {
  PRODUCT_NOT_FOUND: (name: string) => `Product "${name}" not found`,
  ADD_BUTTON_NOT_FOUND: (name: string) => `Add button not found for "${name}"`,
  ITEM_NOT_FOUND_IN_CART: (name: string) => `Item "${name}" not found in cart`,
};

export const PRODUCT_SEARCH_TERMS = {
  MEN_HATS: 'hats for men',
  WOMEN_HATS: 'hats for women',
};