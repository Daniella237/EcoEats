import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';

export class ListDeliveryProposalsUseCase {
  constructor(private readonly orders: OrdersRepositoryPort) {}

  async execute(): Promise<readonly RestaurantOrder[]> {
    return this.orders.listOrdersEligibleForDeliveryProposal();
  }
}
