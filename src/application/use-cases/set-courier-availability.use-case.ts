import type { Courier, CourierAvailability } from '../../domain/entities/courier.js';
import type { CouriersRepositoryPort } from '../ports/couriers-repository.port.js';

export type SetCourierAvailabilityResult =
  | { readonly ok: true; readonly courier: Courier }
  | { readonly ok: false; readonly reason: 'unknown_courier' };

export class SetCourierAvailabilityUseCase {
  constructor(private readonly couriers: CouriersRepositoryPort) {}

  async execute(courierId: string, availability: CourierAvailability): Promise<SetCourierAvailabilityResult> {
    const courier = await this.couriers.findCourierById(courierId);
    if (!courier) {
      return { ok: false, reason: 'unknown_courier' };
    }
    const next: Courier = { ...courier, availability };
    await this.couriers.persistCourier(next);
    return { ok: true, courier: next };
  }
}
