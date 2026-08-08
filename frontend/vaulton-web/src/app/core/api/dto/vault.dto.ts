import type {
  CreateVaultEntryRequest,
  EntryDto,
  PreCreateEntryResponse,
  UpdateVaultEntryRequest,
} from '../../crypto/worker/crypto.worker.types';

export type {
  CreateVaultEntryRequest,
  EntryDto,
  PreCreateEntryResponse,
  UpdateVaultEntryRequest,
};

export interface CreateVaultEntryResponse {
  EntryId: string;
}
