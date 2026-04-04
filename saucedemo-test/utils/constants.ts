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
};

export const CART_SELECTORS = {
  ITEM: '.cart_item',
  QUANTITY: '.cart_quantity',
};

export const TIMEOUTS = {
  DEFAULT: 5000,
  INVENTORY: 10000,
};

export const DELAYS = {
  ADD_ITEM: { MIN: 100, MAX: 200 },
  REMOVE_ITEM: { MIN: 500, MAX: 1000 },
};