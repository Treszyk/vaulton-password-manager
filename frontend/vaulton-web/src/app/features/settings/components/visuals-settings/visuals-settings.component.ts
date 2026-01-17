import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../core/settings/settings.service';

@Component({
  selector: 'app-visuals-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visuals-settings.component.html',
})
export class VisualsSettingsComponent {
  protected readonly settings = inject(SettingsService);
  accountId = input.required<string>();
}
