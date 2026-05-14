import type { Courier } from '../../domain/entities/courier.js';
import type { CouriersRepositoryPort } from '../ports/couriers-repository.port.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';

export class GetCourierByIdUseCase {
  constructor(
    private readonly couriers: CouriersRepositoryPort,
    private readonly orders: OrdersRepositoryPort,
  ) {}

  async execute(courierId: string): Promise<Courier | null> {
    const courier = await this.couriers.findCourierById(courierId);
    if (!courier) {
      return null;
    }
    const assignedOrders = await this.orders.listAssignedOrdersForCourier(courierId);
    const activeFromOrders = assignedOrders.map((o) => ({
      orderId: o.id,
      restaurantId: o.restaurantId,
    }));
    return {
      ...courier,
      activeDeliveries: activeFromOrders,
    };
  }
}
