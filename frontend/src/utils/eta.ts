/**
 * Client-side ETA calculator
 * Mirrors the backend formula:
 * ETA = BasePrepTime + (PendingOrders × DelayFactor) + KitchenLoadMultiplier
 */
export const calcETA = (basePrepTime: number, queueLength: number): number => {
  const DELAY_FACTOR = 0.3;
  const kitchenLoad = queueLength > 15 ? 2.5 : queueLength > 8 ? 1.5 : 1.0;
  const queueDelay = queueLength * DELAY_FACTOR;
  return Math.round(basePrepTime + queueDelay + kitchenLoad);
};

export const etaColor = (eta: number): string => {
  if (eta <= 5) return '#22C55E';
  if (eta <= 12) return '#F59E0B';
  return '#EF4444';
};

export const queueLoadLabel = (queueLength: number): string => {
  if (queueLength <= 5) return 'Low Load';
  if (queueLength <= 15) return 'Moderate';
  return 'High Load';
};

export const formatTime = (date: string): string =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
