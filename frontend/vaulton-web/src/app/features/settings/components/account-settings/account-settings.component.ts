import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ScrollIndicatorDirective } from '../../../../shared/directives/scroll-indicator.directive';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollIndicatorDirective],
  templateUrl: './account-settings.component.html',
})
export class AccountSettingsComponent {
  protected readonly toast = inject(ToastService);
  accountId = input.required<string>();

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast.trigger('Copied to Clipboard');
    });
  }
}
