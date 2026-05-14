import { AcceptDeliveryUseCase } from '../application/use-cases/accept-delivery.use-case.js';
import { AcceptRestaurantOrderUseCase } from '../application/use-cases/accept-restaurant-order.use-case.js';
import { AddItemToCartUseCase } from '../application/use-cases/add-item-to-cart.use-case.js';
import { AddMenuItemUseCase } from '../application/use-cases/add-menu-item.use-case.js';
import { BrowseAvailableMenusUseCase } from '../application/use-cases/browse-available-menus.use-case.js';
import { CompleteDeliveryUseCase } from '../application/use-cases/complete-delivery.use-case.js';
import { GetCourierByIdUseCase } from '../application/use-cases/get-courier-by-id.use-case.js';
import { GetOrderByIdUseCase } from '../application/use-cases/get-order-by-id.use-case.js';
import { ListDeliveryProposalsUseCase } from '../application/use-cases/list-delivery-proposals.use-case.js';
import { ListRestaurantOrdersUseCase } from '../application/use-cases/list-restaurant-orders.use-case.js';
import { MarkOrderReadyForPickupUseCase } from '../application/use-cases/mark-order-ready.use-case.js';
import { PlaceOrderUseCase } from '../application/use-cases/place-order.use-case.js';
import { RefuseRestaurantOrderUseCase } from '../application/use-cases/refuse-restaurant-order.use-case.js';
import { RemoveMenuItemUseCase } from '../application/use-cases/remove-menu-item.use-case.js';
import { SetCourierAvailabilityUseCase } from '../application/use-cases/set-courier-availability.use-case.js';
import { SetDailyStockUseCase } from '../application/use-cases/set-daily-stock.use-case.js';
import { UpdateMenuItemUseCase } from '../application/use-cases/update-menu-item.use-case.js';
import { SqliteEcoRepository } from '../infrastructure/persistence/sqlite-eco.repository.js';

export type SqliteEcoRoot = ReturnType<typeof createSqliteEcoRoot>;

export function createSqliteEcoRoot(dbPath: string = ':memory:'): {
  readonly store: SqliteEcoRepository;
  readonly browseMenus: BrowseAvailableMenusUseCase;
  readonly addToCart: AddItemToCartUseCase;
  readonly placeOrder: PlaceOrderUseCase;
  readonly addMenuItem: AddMenuItemUseCase;
  readonly updateMenuItem: UpdateMenuItemUseCase;
  readonly removeMenuItem: RemoveMenuItemUseCase;
  readonly setDailyStock: SetDailyStockUseCase;
  readonly listRestaurantOrders: ListRestaurantOrdersUseCase;
  readonly acceptRestaurantOrder: AcceptRestaurantOrderUseCase;
  readonly refuseRestaurantOrder: RefuseRestaurantOrderUseCase;
  readonly markOrderReady: MarkOrderReadyForPickupUseCase;
  readonly setCourierAvailability: SetCourierAvailabilityUseCase;
  readonly listDeliveryProposals: ListDeliveryProposalsUseCase;
  readonly acceptDelivery: AcceptDeliveryUseCase;
  readonly completeDelivery: CompleteDeliveryUseCase;
  readonly getOrderById: GetOrderByIdUseCase;
  readonly getCourierById: GetCourierByIdUseCase;
} {
  const store = new SqliteEcoRepository(dbPath);
  return {
    store,
    browseMenus: new BrowseAvailableMenusUseCase(store),
    addToCart: new AddItemToCartUseCase(store),
    placeOrder: new PlaceOrderUseCase(store, store),
    addMenuItem: new AddMenuItemUseCase(store),
    updateMenuItem: new UpdateMenuItemUseCase(store),
    removeMenuItem: new RemoveMenuItemUseCase(store),
    setDailyStock: new SetDailyStockUseCase(store),
    listRestaurantOrders: new ListRestaurantOrdersUseCase(store, store),
    acceptRestaurantOrder: new AcceptRestaurantOrderUseCase(store, store),
    refuseRestaurantOrder: new RefuseRestaurantOrderUseCase(store, store),
    markOrderReady: new MarkOrderReadyForPickupUseCase(store, store),
    setCourierAvailability: new SetCourierAvailabilityUseCase(store),
    listDeliveryProposals: new ListDeliveryProposalsUseCase(store),
    acceptDelivery: new AcceptDeliveryUseCase(store, store),
    completeDelivery: new CompleteDeliveryUseCase(store, store),
    getOrderById: new GetOrderByIdUseCase(store),
    getCourierById: new GetCourierByIdUseCase(store, store),
  };
}
