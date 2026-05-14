import {
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { MenuItem } from '../../domain/entities/menu-item.js';
import type { EcoHttpHandlers } from '../http/eco-http-handlers.js';
import { DemoAuthGuard } from './demo-auth.guard.js';
import { ECO_HTTP_HANDLERS } from './eco-nest-tokens.js';

/**
 * Gestion du menu restaurateur (mêmes cas d’usage qu’Express).
 * Préfixe global Nest : `/api` → chemins alignés sur `server.ts` Express.
 */
@Controller('owners')
@UseGuards(DemoAuthGuard)
export class OwnerMenuController {
  constructor(@Inject(ECO_HTTP_HANDLERS) private readonly h: EcoHttpHandlers) {}

  @Post(':ownerId/restaurants/:restaurantId/menu/items')
  postItem(
    @Param('ownerId') ownerId: string,
    @Param('restaurantId') restaurantId: string,
    @Body() body: Omit<MenuItem, 'id'> & { id?: string },
  ) {
    return this.h.postMenuItem(ownerId, restaurantId, body);
  }

  @Patch(':ownerId/restaurants/:restaurantId/menu/items/:menuItemId')
  patchItem(
    @Param('ownerId') ownerId: string,
    @Param('restaurantId') restaurantId: string,
    @Param('menuItemId') menuItemId: string,
    @Body() body: Partial<Omit<MenuItem, 'id'>>,
  ) {
    return this.h.patchMenuItem(ownerId, restaurantId, menuItemId, body);
  }

  @Delete(':ownerId/restaurants/:restaurantId/menu/items/:menuItemId')
  deleteItem(
    @Param('ownerId') ownerId: string,
    @Param('restaurantId') restaurantId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.h.deleteMenuItem(ownerId, restaurantId, menuItemId);
  }

  @Put(':ownerId/restaurants/:restaurantId/menu/items/:menuItemId/daily-stock')
  putDailyStock(
    @Param('ownerId') ownerId: string,
    @Param('restaurantId') restaurantId: string,
    @Param('menuItemId') menuItemId: string,
    @Body() body: { dailyStock?: number },
  ) {
    const dailyStock = Number(body?.dailyStock);
    return this.h.putDailyStock(ownerId, restaurantId, menuItemId, dailyStock);
  }
}
