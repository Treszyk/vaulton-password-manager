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
import { ActivatedRoute, Params, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MarkdownModule, MarkdownService } from 'ngx-markdown';
import { map, switchMap, Subscription } from 'rxjs';
import { getWorkerPolicy } from '../../core/crypto/worker/crypto-worker.factory';

@Component({
  selector: 'app-docs-viewer',
  standalone: true,
  imports: [CommonModule, MarkdownModule, HttpClientModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="animate-fade-in content-container w-full overflow-x-clip">
      <div
        #contentArea
        class="prose prose-invert prose-purple max-w-none w-full break-normal
               prose-headings:tracking-tighter prose-headings:font-black
               prose-a:text-vault-purple prose-a:no-underline hover:prose-a:underline
               prose-pre:bg-vault-dark prose-pre:border prose-pre:border-zinc-800
               prose-blockquote:border-vault-purple prose-blockquote:py-1"
      ></div>
    </div>
  `,
})
export class DocsViewerComponent implements OnDestroy {
  @ViewChild('contentArea', { static: true }) contentArea!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private markdownService = inject(MarkdownService);
  private renderer = inject(Renderer2);
  private sub = new Subscription();

  private readonly DOC_TITLES: Record<string, string> = {
    auth: 'AUTHENTICATION',
    crypto: 'CRYPTOGRAPHY',
    threatmodel: 'THREAT MODEL',
    extension: 'EXTENSION',
  };

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
        const translatedHtml = this.translateMarkdownLinks(html);
        const policy = getWorkerPolicy();
        if (policy && policy.createHTML) {
          const trustedHtml = policy.createHTML(translatedHtml);
          this.renderer.setProperty(this.contentArea.nativeElement, 'innerHTML', trustedHtml);
        } else {
          this.renderer.setProperty(this.contentArea.nativeElement, 'innerHTML', translatedHtml);
        }
      });
  }

  private translateMarkdownLinks(html: string): string {
    let processedHtml = html;

    Object.keys(this.DOC_TITLES).forEach((slug) => {
      const title = this.DOC_TITLES[slug];

      const codeRegex = new RegExp(`<code>\\s*${slug}\\.md\\s*<\/code>`, 'gi');
      processedHtml = processedHtml.replace(
        codeRegex,
        `<a href="/docs/${slug}.md" class="doc-ref-link">${title}</a>`,
      );

      const plainTextRegex = new RegExp(`(?<![\\/="])\\b${slug}\\.md\\b`, 'gi');
      processedHtml = processedHtml.replace(
        plainTextRegex,
        `<a href="/docs/${slug}.md" class="doc-ref-link">${title}</a>`,
      );
    });

    return processedHtml.replace(
      /<a\s+[^>]*href="([^"]+\.md)"[^>]*>(.*?)<\/a>/gi,
      (match, href, text) => {
        const slug = href.replace('.md', '').split('/').pop() || '';
        const title = this.DOC_TITLES[slug];

        if (!title) return match;

        const cleanText = text.trim().toLowerCase();
        if (
          cleanText === href.toLowerCase() ||
          cleanText === slug.toLowerCase() ||
          cleanText === (slug + '.md').toLowerCase() ||
          cleanText === title.toLowerCase()
        ) {
          return `<a href="${href}" class="doc-ref-link">${title}</a>`;
        }
        return match;
      },
    );
  }

  @HostListener('click', ['$event'])
  onContentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        window.open(src, '_blank');
      }
      return;
    }

    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href?.endsWith('.md')) {
        event.preventDefault();
        const slug = href.replace('.md', '').split('/').pop();
        if (slug) {
          this.router.navigate(['/docs', slug]);
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
