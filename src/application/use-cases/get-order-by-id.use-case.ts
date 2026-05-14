import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';

export class GetOrderByIdUseCase {
  constructor(private readonly orders: OrdersRepositoryPort) {}

  async execute(orderId: string): Promise<RestaurantOrder | null> {
    return this.orders.findOrderById(orderId);
  }
}
