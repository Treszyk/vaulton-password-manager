import {
  Component,
  inject,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
  Renderer2,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownModule, MarkdownService } from 'ngx-markdown';
import { map, switchMap, Subscription } from 'rxjs';
import { getWorkerPolicy } from '../../core/crypto/worker/crypto-worker.factory';

@Component({
  selector: 'app-docs-viewer',
  standalone: true,
  imports: [CommonModule, MarkdownModule, HttpClientModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="animate-fade-in content-container w-full overflow-visible">
      <div
        #contentArea
        class="prose prose-invert prose-purple max-w-none w-full break-normal
               prose-headings:tracking-tighter prose-headings:font-black
               prose-a:text-vault-purple prose-a:no-underline hover:prose-a:underline
               prose-pre:bg-vault-dark prose-pre:border prose-pre:border-zinc-800
               prose-blockquote:border-vault-purple prose-blockquote:bg-vault-purple/5 prose-blockquote:py-1"
      ></div>
    </div>
  `,
})
export class DocsViewerComponent implements OnDestroy {
  @ViewChild('contentArea', { static: true }) contentArea!: ElementRef;

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private markdownService = inject(MarkdownService);
  private renderer = inject(Renderer2);
  private sub = new Subscription();

  constructor() {
    this.sub = this.route.params
      .pipe(
        map((params: Params) => {
          const slug = params['slug'] || 'auth';
          return `/docs/${slug}.md`;
        }),
        switchMap((path) => this.http.get(path, { responseType: 'text' })),
        switchMap((markdown) => {
          const parsed = this.markdownService.parse(markdown);
          if (parsed instanceof Promise) return parsed;
          return Promise.resolve(parsed);
        }),
      )
      .subscribe((html) => {
        const policy = getWorkerPolicy();
        if (policy && policy.createHTML) {
          const trustedHtml = policy.createHTML(html);
          this.renderer.setProperty(this.contentArea.nativeElement, 'innerHTML', trustedHtml);
        } else {
          this.renderer.setProperty(this.contentArea.nativeElement, 'innerHTML', html);
        }
      });
  }

  @HostListener('click', ['$event'])
  onImageClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        window.open(src, '_blank');
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
