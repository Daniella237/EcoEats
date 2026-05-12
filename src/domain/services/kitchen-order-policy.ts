import type { KitchenOrderStatus, RestaurantOrder } from '../entities/restaurant-order.js';

export function isOrderVisibleAsDeliveryProposal(order: RestaurantOrder): boolean {
  if (order.courierId !== null) {
    return false;
  }
  return order.kitchenStatus === 'preparing' || order.kitchenStatus === 'ready_for_pickup';
}

export function assertPendingAcceptance(status: KitchenOrderStatus): void {
  if (status !== 'pending_acceptance') {
    throw new Error(`Action impossible : statut cuisine ${status}`);
  }
}

export function assertPreparing(status: KitchenOrderStatus): void {
  if (status !== 'preparing') {
    throw new Error(`Action impossible : statut cuisine ${status}`);
  }
}
