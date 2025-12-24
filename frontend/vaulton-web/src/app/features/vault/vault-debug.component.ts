import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { VaultApiService, EntryDto } from '../../core/api/vault-api.service';

@Component({
  standalone: true,
  selector: 'app-vault-debug',
  imports: [CommonModule],
  template: `
    <h2>Vault Debug</h2>

    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
      <button (click)="list()">List</button>
      <button (click)="createDummy()">Create dummy</button>
    </div>

    <h3>Entries ({{ entries().length }})</h3>
    <ul>
      <li *ngFor="let e of entries()">
        <code>{{ e.Id }}</code>
        <button style="margin-left:8px;" (click)="del(e.Id)">Delete</button>
        <div style="font-size:12px; opacity:0.8;">
          DomainTag len: {{ e.DomainTag.length }}, Nonce len: {{ e.Payload.Nonce.length }}, CT len:
          {{ e.Payload.CipherText.length }}, Tag len: {{ e.Payload.Tag.length }}
        </div>
      </li>
    </ul>

    <h3 style="margin-top:16px;">Result</h3>
    <pre style="white-space: pre-wrap;">{{ result() }}</pre>
  `,
})
export class VaultDebugComponent {
  entries = signal<EntryDto[]>([]);
  result = signal('');

  constructor(private readonly api: VaultApiService) {}

  list(): void {
    this.api.list(0, 200).subscribe({
      next: (items) => {
        this.entries.set(items);
        this.result.set(`List OK (${items.length})`);
      },
      error: (e) => this.result.set(`List FAILED\n${this.pretty(e)}`),
    });
  }

  createDummy(): void {
    const req = {
      DomainTag: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      Payload: {
        Nonce: 'AAAAAAAAAAAAAAAA',
        CipherText: 'AQ==',
        Tag: 'AAAAAAAAAAAAAAAAAAAAAA==',
      },
    };

    this.api.create(req).subscribe({
      next: (r) => {
        this.result.set(`Create OK\nEntryId: ${r.EntryId}`);
        this.list();
      },
      error: (e) => this.result.set(`Create FAILED\n${this.pretty(e)}`),
    });
  }

  del(id: string): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.result.set(`Delete OK\nId: ${id}`);
        this.list();
      },
      error: (e) => this.result.set(`Delete FAILED\n${this.pretty(e)}`),
    });
  }

  private pretty(e: any): string {
    return JSON.stringify({ status: e?.status, error: e?.error }, null, 2);
  }
}
