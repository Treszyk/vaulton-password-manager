import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AccountSettingsComponent } from './components/account-settings/account-settings.component';
import { VisualsSettingsComponent } from './components/visuals-settings/visuals-settings.component';
import { SecuritySettingsComponent } from './components/security-settings/security-settings.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    AccountSettingsComponent,
    VisualsSettingsComponent,
    SecuritySettingsComponent,
  ],
  host: {
    class: 'flex-1 min-h-0 flex flex-col',
  },
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  protected readonly persistence = inject(AuthPersistenceService);
  protected readonly api = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);

  activeTab = signal<'GENERAL' | 'SECURITY'>('GENERAL');
  accountId = signal<string>('');
  initialShowPasscodeSetup = signal(false);

  constructor() {
    this.api.me().subscribe({
      next: (res) => this.accountId.set(res.accountId),
      error: () => {
        this.persistence.getAccountId().then((id) => {
          if (id) this.accountId.set(id);
        });
      },
    });
  }

  async ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['tab']) {
        this.activeTab.set(params['tab'] as any);
      }
      if (params['setupPasscode'] === 'true') {
        this.initialShowPasscodeSetup.set(true);
      }
    });

    if (!this.accountId()) {
      const id = await this.persistence.getAccountId();
      if (id) this.accountId.set(id);
    }
  }

  setTab(tab: 'GENERAL' | 'SECURITY') {
    this.activeTab.set(tab);
  }
}
