import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CreateVaultEntryRequest, EntryDto } from '../crypto/worker/crypto.worker.types';

@Injectable({ providedIn: 'root' })
export class VaultApiService {
  private readonly baseUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  list(skip = 0, take = 200): Observable<EntryDto[]> {
    return this.http.get<EntryDto[]>(`${this.baseUrl}/vault/entries`, {
      params: { skip, take },
    });
  }

  create(req: CreateVaultEntryRequest): Observable<{ EntryId: string }> {
    return this.http.post<{ EntryId: string }>(`${this.baseUrl}/vault/entries`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vault/entries/${id}`);
  }
}
