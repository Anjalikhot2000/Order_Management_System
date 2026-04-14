export const toNumber = (value) => Number.parseFloat(value || 0) || 0;

export const formatCurrency = (value) => `Rs. ${toNumber(value).toFixed(2)}`;
