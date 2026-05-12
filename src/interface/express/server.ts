import express, { type NextFunction, type Request, type Response } from 'express';
import type { PlaceOrderInput } from '../../application/use-cases/place-order.use-case.js';
import { createMemoryEcoRoot } from '../../composition/memory-root.js';
import { createSqliteEcoRoot } from '../../composition/sqlite-root.js';
import {
  createEcoHttpHandlers,
  type AddCartItemBody,
  type ReplaceCartAddBody,
} from '../http/eco-http-handlers.js';

const port = Number(process.env.PORT ?? 3000);
const persistence = process.env.PERSISTENCE ?? 'memory';
const root =
  persistence === 'sqlite'
    ? createSqliteEcoRoot(process.env.SQLITE_PATH ?? ':memory:')
    : createMemoryEcoRoot();
const h = createEcoHttpHandlers(root);

const app = express();
app.use(express.json());

app.get('/api/catalog', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.getCatalog());
  } catch (e) {
    next(e);
  }
});

function isCartShape(value: unknown): value is AddCartItemBody['cart'] {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const o = value as { restaurantId?: unknown; lines?: unknown };
  return (
    ('restaurantId' in o && (o.restaurantId === null || typeof o.restaurantId === 'string')) &&
    Array.isArray(o.lines)
  );
}

app.post('/api/cart/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<AddCartItemBody>;
    if (!isCartShape(body.cart)) {
      res.status(400).json({
        ok: false,
        reason: 'invalid_body',
        message: 'cart attendu : { restaurantId: string | null, lines: { menuItemId, quantity }[] }',
      });
      return;
    }
    if (
      typeof body.restaurantId !== 'string' ||
      typeof body.menuItemId !== 'string' ||
      typeof body.quantity !== 'number'
    ) {
      res.status(400).json({
        ok: false,
        reason: 'invalid_body',
        message: 'restaurantId, menuItemId (string) et quantity (number) requis',
      });
      return;
    }
    const payload: AddCartItemBody = {
      cart: body.cart,
      restaurantId: body.restaurantId,
      menuItemId: body.menuItemId,
      quantity: body.quantity,
    };
    res.json(await h.postAddCartItem(payload));
  } catch (e) {
    next(e);
  }
});

app.post('/api/cart/items/replace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<ReplaceCartAddBody>;
    if (
      typeof body.restaurantId !== 'string' ||
      typeof body.menuItemId !== 'string' ||
      typeof body.quantity !== 'number'
    ) {
      res.status(400).json({
        ok: false,
        reason: 'invalid_body',
        message: 'restaurantId, menuItemId (string) et quantity (number) requis',
      });
      return;
    }
    const payload: ReplaceCartAddBody = {
      restaurantId: body.restaurantId,
      menuItemId: body.menuItemId,
      quantity: body.quantity,
    };
    res.json(await h.postReplaceCartAndAddItem(payload));
  } catch (e) {
    next(e);
  }
});

app.post('/api/orders/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.postPlaceOrder(req.body as PlaceOrderInput));
  } catch (e) {
    next(e);
  }
});

app.get('/api/owners/:ownerId/restaurants/:restaurantId/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.getRestaurantOrders(req.params.ownerId!, req.params.restaurantId!));
  } catch (e) {
    next(e);
  }
});

app.post('/api/owners/:ownerId/restaurants/:restaurantId/orders/:orderId/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const minutes = Number((req.body as { estimatedPrepMinutes?: number })?.estimatedPrepMinutes);
    res.json(
      await h.postAcceptOrder(req.params.ownerId!, req.params.restaurantId!, req.params.orderId!, minutes),
    );
  } catch (e) {
    next(e);
  }
});

app.post('/api/owners/:ownerId/restaurants/:restaurantId/orders/:orderId/refuse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.postRefuseOrder(req.params.ownerId!, req.params.restaurantId!, req.params.orderId!));
  } catch (e) {
    next(e);
  }
});

app.post('/api/owners/:ownerId/restaurants/:restaurantId/orders/:orderId/ready', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.postMarkReady(req.params.ownerId!, req.params.restaurantId!, req.params.orderId!));
  } catch (e) {
    next(e);
  }
});

app.post('/api/owners/:ownerId/restaurants/:restaurantId/menu/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.postMenuItem(req.params.ownerId!, req.params.restaurantId!, req.body as never));
  } catch (e) {
    next(e);
  }
});

app.patch('/api/owners/:ownerId/restaurants/:restaurantId/menu/items/:menuItemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(
      await h.patchMenuItem(req.params.ownerId!, req.params.restaurantId!, req.params.menuItemId!, req.body as never),
    );
  } catch (e) {
    next(e);
  }
});

app.delete('/api/owners/:ownerId/restaurants/:restaurantId/menu/items/:menuItemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.deleteMenuItem(req.params.ownerId!, req.params.restaurantId!, req.params.menuItemId!));
  } catch (e) {
    next(e);
  }
});

app.put('/api/owners/:ownerId/restaurants/:restaurantId/menu/items/:menuItemId/daily-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dailyStock = Number((req.body as { dailyStock?: number })?.dailyStock);
    res.json(
      await h.putDailyStock(req.params.ownerId!, req.params.restaurantId!, req.params.menuItemId!, dailyStock),
    );
  } catch (e) {
    next(e);
  }
});

app.post('/api/couriers/:courierId/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(
      await h.postCourierAvailability(
        req.params.courierId!,
        (req.body as { availability: 'available' | 'unavailable' }).availability,
      ),
    );
  } catch (e) {
    next(e);
  }
});

app.get('/api/couriers/delivery-proposals', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.getDeliveryProposals());
  } catch (e) {
    next(e);
  }
});

app.post('/api/couriers/:courierId/deliveries/:orderId/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.postAcceptDelivery(req.params.courierId!, req.params.orderId!));
  } catch (e) {
    next(e);
  }
});

app.post('/api/couriers/:courierId/deliveries/:orderId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await h.postCompleteDelivery(req.params.courierId!, req.params.orderId!));
  } catch (e) {
    next(e);
  }
});

app.get('/api/restaurants/:restaurantId/events/orders', (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId!;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const unsubscribe = h.subscribeIncomingOrders(restaurantId, (e) => {
    res.write(`data: ${JSON.stringify(e)}\n\n`);
  });
  req.on('close', () => {
    unsubscribe();
    res.end();
  });
});

app.listen(port, () => {
  console.log(`EcoEats API (Express) sur http://localhost:${port} [${persistence}]`);
});
