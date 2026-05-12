export type IncomingOrderEvent = { readonly orderId: string; readonly restaurantId: string };

export interface OrderEventsPort {
  publishIncomingOrder(event: IncomingOrderEvent): void;
  subscribeIncomingOrders(
    restaurantId: string,
    listener: (event: IncomingOrderEvent) => void,
  ): () => void;
}
