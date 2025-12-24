import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

type EncryptedValueDto = {
  Nonce: string;
  CipherText: string;
  Tag: string;
};

export type EntryDto = {
  Id: string;
  DomainTag: string;
  Payload: EncryptedValueDto;
};

type CreateEntryRequest = {
  DomainTag: string;
  Payload: EncryptedValueDto;
};

type CreateEntryResponse = { EntryId: string };

@Injectable({ providedIn: 'root' })
export class VaultApiService {
  private readonly baseUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  list(skip = 0, take = 200): Observable<EntryDto[]> {
    return this.http.get<EntryDto[]>(`${this.baseUrl}/vault/entries`, {
      params: { skip, take },
    });
  }

  create(req: CreateEntryRequest): Observable<CreateEntryResponse> {
    return this.http.post<CreateEntryResponse>(`${this.baseUrl}/vault/entries`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vault/entries/${id}`);
  }
}
