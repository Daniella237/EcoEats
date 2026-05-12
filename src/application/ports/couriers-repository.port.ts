import type { Courier } from '../../domain/entities/courier.js';

export interface CouriersRepositoryPort {
  findCourierById(id: string): Promise<Courier | null>;
  persistCourier(courier: Courier): Promise<void>;
}
