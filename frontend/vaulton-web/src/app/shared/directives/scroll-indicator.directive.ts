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
    'input[scroll-indicator], input[type="text"], input[type="password"], input[type="email"], input[type="search"], [scroll-indicator]',
  standalone: true,
})
export class ScrollIndicatorDirective implements OnInit, OnDestroy, AfterViewInit {
  private indicator: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private listeners: (() => void)[] = [];
  private control = inject(NgControl, { optional: true, self: true });
  private sub?: Subscription;
  private isDragging = false;
  private startX = 0;
  private startScrollLeft = 0;
  private dragIndicatorSub?: () => void;
  private globalMoveSub?: () => void;
  private globalUpSub?: () => void;

  constructor(
    private el: ElementRef<HTMLElement>,
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
    this.renderer.setStyle(this.indicator, 'top', '0');
    this.renderer.setStyle(this.indicator, 'left', '0');
    this.renderer.setStyle(this.indicator, 'z-index', '100');
    this.renderer.appendChild(parent, this.indicator);

    this.zone.runOutsideAngular(() => {
      this.dragIndicatorSub = this.renderer.listen(this.indicator, 'mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.startDragging(e);
      });
    });
  }

  private startDragging(e: MouseEvent) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startScrollLeft = this.el.nativeElement.scrollLeft;
    this.renderer.addClass(this.indicator!, 'is-dragging');

    this.globalMoveSub = this.renderer.listen('window', 'mousemove', (me: MouseEvent) => {
      if (this.isDragging) {
        this.onDrag(me);
      }
    });

    this.globalUpSub = this.renderer.listen('window', 'mouseup', () => {
      this.stopDragging();
    });
  }

  private onDrag(e: MouseEvent) {
    if (!this.indicator) return;

    const deltaX = e.clientX - this.startX;
    const el = this.el.nativeElement;
    const sw = el.scrollWidth;
    const w = el.clientWidth;
    const styles = window.getComputedStyle(el);
    const pl = parseFloat(styles.paddingLeft) || 0;
    const pr = parseFloat(styles.paddingRight) || 0;
    const trackWidth = w - pl - pr;

    if (trackWidth <= 0) return;

    const ratio = sw / trackWidth;
    const scrollDelta = deltaX * ratio;

    el.scrollLeft = this.startScrollLeft + scrollDelta;
    this.updatePosition();
  }

  private stopDragging() {
    this.isDragging = false;
    this.renderer.removeClass(this.indicator!, 'is-dragging');
    if (this.globalMoveSub) this.globalMoveSub();
    if (this.globalUpSub) this.globalUpSub();
  }

  private setupListeners() {
    this.zone.runOutsideAngular(() => {
      const el = this.el.nativeElement;

      this.listeners.push(
        this.renderer.listen(el, 'input', () => this.check()),
        this.renderer.listen(el, 'scroll', () => {
          if (!this.isDragging) this.updatePosition();
        }),
        this.renderer.listen(el, 'focus', () => this.check()),
        this.renderer.listen(el, 'blur', () => this.check()),
        this.renderer.listen(el, 'transitionend', () => this.check()),
        this.renderer.listen(el, 'animationend', () => this.check()),
      );

      this.resizeObserver = new ResizeObserver(() => this.check());
      this.resizeObserver.observe(el);

      this.mutationObserver = new MutationObserver(() => this.check());
      this.mutationObserver.observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
  }

  private check() {
    if (!this.indicator || this.isDragging) return;

    const el = this.el.nativeElement;
    const overflow = el.scrollWidth > el.clientWidth + 2;

    if (overflow) {
      this.renderer.addClass(this.indicator, 'is-visible');
      this.updatePosition();
    } else {
      this.renderer.removeClass(this.indicator, 'is-visible');
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

    if (sw <= w + 2) {
      this.renderer.removeClass(this.indicator, 'is-visible');
      return;
    }

    const ratio = trackWidth / sw;
    const thumbWidth = Math.max(20, trackWidth * ratio);

    const maxScroll = sw - w;
    let progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;

    if (Math.abs(maxScroll - el.scrollLeft) < 2) {
      progress = 1;
    }

    progress = Math.max(0, Math.min(1, progress));

    const maxThumbTravel = trackWidth - thumbWidth;
    const leftPos = pl + progress * maxThumbTravel;

    const isInput = el.tagName === 'INPUT';
    const bottomOffset = (el.offsetHeight > 30 ? 14 : 6) - (isInput ? 0 : 6);
    const topPos = el.offsetTop + el.offsetHeight - bottomOffset;

    this.renderer.setStyle(this.indicator, 'width', `${thumbWidth}px`);
    this.renderer.setStyle(this.indicator, 'transform', `translate(${leftPos}px, ${topPos}px)`);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.listeners.forEach((unsub) => unsub());
    if (this.dragIndicatorSub) this.dragIndicatorSub();
    if (this.globalMoveSub) this.globalMoveSub();
    if (this.globalUpSub) this.globalUpSub();
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    if (this.indicator) {
      this.indicator.remove();
    }
  }
}
