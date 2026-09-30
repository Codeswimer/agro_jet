export const fmt = (n) => Number(n ?? 0).toLocaleString();

export const money = (amount, currency) => {
  const symbol = currency === 'USDB' ? '$' : '₦';
  return `${symbol}${fmt(amount)}`;
};

export const today = () => new Date().toISOString().split('T')[0];
