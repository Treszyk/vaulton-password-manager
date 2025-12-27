import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { fromEvent, Subject, takeUntil } from 'rxjs';

interface Star {
  x: number;
  y: number;
  size: number;
  depth: number;
  twinkleOffset: number;
  twinkleSpeed: number;
  birthTime: number;
  fadeSpeed: number;
}

@Component({
  selector: 'app-starfield',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'contents' },
  template: `
    <canvas #canvas class="fixed inset-0 w-full h-full pointer-events-none z-0"></canvas>
  `,
})
export class StarfieldComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private stars: Star[] = [];
  private mouseX = 0;
  private mouseY = 0;
  private currentX = 0;
  private currentY = 0;

  private readonly STAR_COUNT = 80;
  private readonly FLICKER_SPEED = 0.002;

  constructor(private readonly ngZone: NgZone) {}

  ngAfterViewInit() {
    this.generateStars();
    this.startAnimationLoop();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateStars() {
    this.stars = [];
    this.addStars(40, 1, 3, 0.002);
    this.addStars(25, 2, 4, 0.008);
    this.addStars(15, 2, 5, 0.015);
  }

  private addStars(count: number, minSize: number, maxSize: number, depth: number) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: minSize + Math.random() * (maxSize - minSize),
        depth: depth,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        birthTime: Math.random() * 2000,
        fadeSpeed: 1 + Math.random(),
      });
    }
  }

  private startAnimationLoop() {
    this.ngZone.runOutsideAngular(() => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const resizeObserver = new ResizeObserver(() => {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      });
      resizeObserver.observe(document.body);

      fromEvent<MouseEvent>(window, 'mousemove')
        .pipe(takeUntil(this.destroy$))
        .subscribe((e) => {
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          this.mouseX = e.clientX - centerX;
          this.mouseY = e.clientY - centerY;
        });

      let animationStart: number | null = null;

      const animate = (time: number) => {
        if (this.destroy$.closed) {
          resizeObserver.disconnect();
          return;
        }

        if (animationStart === null) animationStart = time;
        const elapsed = time - animationStart;

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.currentX += (this.mouseX - this.currentX) * 0.025;
        this.currentY += (this.mouseY - this.currentY) * 0.025;

        ctx.clearRect(0, 0, width, height);
        this.stars.forEach((star) => {
          let alphaMultiplier = 0;
          if (elapsed > star.birthTime) {
            const age = elapsed - star.birthTime;
            alphaMultiplier = Math.min(1, age / (1000 / star.fadeSpeed));
          }

          if (alphaMultiplier <= 0) return;

          let posX = star.x * width + this.currentX * star.depth * -1;
          let posY = star.y * height + this.currentY * star.depth * -1;

          ctx.beginPath();
          ctx.arc(posX, posY, star.size / 2, 0, Math.PI * 2);

          const twinkle = Math.sin(
            time * this.FLICKER_SPEED * star.twinkleSpeed + star.twinkleOffset
          );
          const rawAlpha = 0.25 + twinkle * 0.15;
          const finalAlpha = rawAlpha * alphaMultiplier;

          ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
          ctx.fill();
        });

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    });
  }
}
