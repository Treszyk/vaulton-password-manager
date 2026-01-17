import {
  Directive,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  AfterViewInit,
  NgZone,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
  selector:
    'input[scroll-indicator], input[type="text"], input[type="password"], input[type="email"], input[type="search"]',
  standalone: true,
})
export class ScrollIndicatorDirective implements OnInit, OnDestroy, AfterViewInit {
  private indicator: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private listeners: (() => void)[] = [];
  private control = inject(NgControl, { optional: true, self: true });
  private sub?: Subscription;

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    private zone: NgZone,
  ) {}

  ngOnInit() {
    if (this.control) {
      this.sub = this.control.valueChanges?.subscribe(() => {
        setTimeout(() => this.check(), 0);
      });
    }
  }

  ngAfterViewInit() {
    this.createIndicator();
    this.setupListeners();
    this.check();
  }

  private createIndicator() {
    const parent = this.el.nativeElement.parentElement;
    if (!parent) return;

    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      this.renderer.setStyle(parent, 'position', 'relative');
    }

    this.indicator = this.renderer.createElement('div');
    this.renderer.addClass(this.indicator!, 'input-scroll-thumb');
    this.renderer.setStyle(this.indicator, 'z-index', '100');
    this.renderer.appendChild(parent, this.indicator);
  }

  private setupListeners() {
    this.zone.runOutsideAngular(() => {
      const el = this.el.nativeElement;

      this.listeners.push(
        this.renderer.listen(el, 'input', () => this.check()),
        this.renderer.listen(el, 'scroll', () => this.updatePosition()),
        this.renderer.listen(el, 'focus', () => this.check()),
        this.renderer.listen(el, 'blur', () => this.check()),
        this.renderer.listen(el, 'transitionend', () => this.check()),
        this.renderer.listen(el, 'animationend', () => this.check()),
      );

      this.resizeObserver = new ResizeObserver(() => this.check());
      this.resizeObserver.observe(el);
    });
  }

  private check() {
    if (!this.indicator) return;

    const el = this.el.nativeElement;
    const overflow = el.scrollWidth > el.clientWidth;

    if (overflow) {
      this.renderer.setStyle(this.indicator, 'opacity', '1');
      this.updatePosition();
    } else {
      this.renderer.setStyle(this.indicator, 'opacity', '0');
    }
  }

  private updatePosition() {
    if (!this.indicator) return;

    const el = this.el.nativeElement;
    const w = el.clientWidth;
    const sw = el.scrollWidth;
    const styles = window.getComputedStyle(el);
    const pl = parseFloat(styles.paddingLeft) || 0;
    const pr = parseFloat(styles.paddingRight) || 0;

    const trackWidth = w - pl - pr;

    if (sw <= w) {
      this.renderer.setStyle(this.indicator, 'opacity', '0');
      return;
    }

    const ratio = trackWidth / sw;
    const thumbWidth = trackWidth * ratio;

    const maxScroll = sw - w;
    const progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;

    const maxThumbTravel = trackWidth - thumbWidth;
    const leftPos = pl + progress * maxThumbTravel;

    this.renderer.setStyle(this.indicator, 'width', `${thumbWidth}px`);
    this.renderer.setStyle(this.indicator, 'transform', `translateX(${leftPos}px)`);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.listeners.forEach((unsub) => unsub());
    this.resizeObserver?.disconnect();
    if (this.indicator) {
      this.indicator.remove();
    }
  }
}
