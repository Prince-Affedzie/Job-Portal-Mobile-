// src/services/paymentCallbacks.js
// A simple module-level store so functions survive navigation serialization

let _callbacks = {};

export const setPaymentCallbacks = (id, callbacks) => {
  _callbacks[id] = callbacks;
};

export const getPaymentCallbacks = (id) => {
  return _callbacks[id] || {};
};

export const clearPaymentCallbacks = (id) => {
  delete _callbacks[id];
};