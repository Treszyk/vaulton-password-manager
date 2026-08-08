import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type {
  CreateVaultEntryRequest,
  CreateVaultEntryResponse,
  EntryDto,
  PreCreateEntryResponse,
  UpdateVaultEntryRequest,
} from './dto/vault.dto';

export type {
  CreateVaultEntryRequest,
  CreateVaultEntryResponse,
  EntryDto,
  PreCreateEntryResponse,
  UpdateVaultEntryRequest,
};

@Injectable({ providedIn: 'root' })
export class VaultApiService {
  private readonly baseUrl = '/api';

  private readonly http = inject(HttpClient);

  list(skip = 0, take = 200): Observable<EntryDto[]> {
    return this.http.get<EntryDto[]>(`${this.baseUrl}/vault/entries`, {
      params: { skip, take },
    });
  }

  preCreate(): Observable<PreCreateEntryResponse> {
    return this.http.post<PreCreateEntryResponse>(`${this.baseUrl}/vault/entries/pre-create`, {});
  }

  create(req: CreateVaultEntryRequest): Observable<CreateVaultEntryResponse> {
    return this.http.post<CreateVaultEntryResponse>(`${this.baseUrl}/vault/entries`, req);
  }

  update(id: string, req: UpdateVaultEntryRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/vault/entries/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vault/entries/${id}`);
  }
}
