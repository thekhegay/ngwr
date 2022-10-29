import { CommonModule } from '@angular/common';
import { Component, DebugElement, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WrButtonColor, WrButtonComponent, WrButtonModule, WrButtonSize } from 'ngwr';

describe('WrButtonComponent', () => {
  describe('wr-btn used within button element', () => {
    describe('classNames', () => {
      beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
          imports: [CommonModule, WrButtonModule],
          declarations: [TestButtonComponent]
        });

        TestBed.compileComponents();
      }));

      let fixture: ComponentFixture<TestButtonComponent>;
      let component: TestButtonComponent;
      let nativeElement: HTMLElement;
      let debugElement: DebugElement;
      let buttonElement: HTMLButtonElement;
      let colors: WrButtonColor[] = ['secondary', 'success', 'warning', 'danger', 'light', 'medium', 'dark'];

      beforeEach(() => {
        fixture = TestBed.createComponent(TestButtonComponent);
        component = fixture.componentInstance;
        nativeElement = fixture.nativeElement;
        debugElement = fixture.debugElement;
        buttonElement = debugElement.query(By.directive(WrButtonComponent)).nativeElement;
        fixture.detectChanges();
      });

      it('should apply classname', () => {
        expect(buttonElement.classList.contains('wr-btn')).toBe(true);
      });
      it('should apply classname based on primary color', () => {
        expect(buttonElement.classList).toContain('wr-btn--primary');
      });
      it('should apply classname based on default size', () => {
        expect(buttonElement.classList).toContain('wr-btn--default');
      });
      it(`should apply classname based on small size`, () => {
        expect(buttonElement.classList).not.toContain(`wr-btn--small`);
        component.size = 'small';
        fixture.detectChanges();
        expect(buttonElement.classList).toContain(`wr-btn--small`);
      });
      for (const color of colors) {
        it(`should apply classname based on ${color} color`, () => {
          expect(buttonElement.classList).not.toContain(`wr-btn--${color}`);
          component.color = color;
          fixture.detectChanges();
          expect(buttonElement.classList).toContain(`wr-btn--${color}`);
        });
      }
      it(`should apply classname based on outlined`, () => {
        expect(buttonElement.classList).not.toContain(`wr-btn--outlined`);
        component.outlined = true;
        fixture.detectChanges();
        expect(buttonElement.classList).toContain(`wr-btn--outlined`);
      });
      it(`should apply classname based on rounded`, () => {
        expect(buttonElement.classList).not.toContain(`wr-btn--rounded`);
        component.rounded = true;
        fixture.detectChanges();
        expect(buttonElement.classList).toContain(`wr-btn--rounded`);
      });
      it(`should apply classname based on loading`, () => {
        expect(buttonElement.classList).not.toContain(`wr-btn--loading`);
        component.loading = true;
        fixture.detectChanges();
        expect(buttonElement.classList).toContain(`wr-btn--loading`);
      });
      it(`should apply classname based on fullwidth`, () => {
        expect(buttonElement.classList).not.toContain(`wr-btn--full`);
        component.fullwidth = true;
        fixture.detectChanges();
        expect(buttonElement.classList).toContain(`wr-btn--full`);
      });
      it('should not clear previous defined classes', () => {
        buttonElement.classList.add('custom-class');
        fixture.detectChanges();

        expect(buttonElement.classList.contains('wr-btn')).toBe(true);
        expect(buttonElement.classList.contains('custom-class')).toBe(true);

        component.color = 'success';
        fixture.detectChanges();

        expect(buttonElement.classList.contains('wr-btn--primary')).toBe(false);
        expect(buttonElement.classList.contains('custom-class')).toBe(true);
        expect(buttonElement.classList.contains('wr-btn--success')).toBe(true);

        component.loading = true;
        fixture.detectChanges();

        expect(buttonElement.classList.contains('wr-btn--success')).toBe(true);
        expect(buttonElement.classList.contains('custom-class')).toBe(true);
        expect(buttonElement.classList.contains('wr-btn--loading')).toBe(true);
      });
    });
  });
});

@Component({
  template: `
    <button
      wr-btn
      [color]="color"
      [size]="size"
      [disabled]="disabled"
      [outlined]="outlined"
      [rounded]="rounded"
      [loading]="loading"
      [fullwidth]="fullwidth"
    >
      button
    </button>
  `
})
export class TestButtonComponent {
  @Input() color: WrButtonColor = 'primary';
  @Input() size: WrButtonSize = 'default';
  @Input() disabled: boolean = false;
  @Input() outlined: boolean = false;
  @Input() rounded: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullwidth: boolean = false;
}

// @Component({
//   template: `<button wr-btn (click)="load()" [loading]="loading">{{ 'Click me!' }}</button>`
// })
// export class TestButtonBindingComponent {
//   loading = false;
//   load(): void {
//     this.loading = true;
//     setTimeout(() => (this.loading = false), 5000);
//   }
// }
//
// @Component({
//   template: `
//     <button wr-btn>
//       {{ title }}
//       <span nz-icon nzType="caret-down"></span>
//     </button>
//   `
// })
// export class TestButtonWithIconComponent implements OnInit {
//   title?: string;
//   ngOnInit(): void {
//     setTimeout(() => (this.title = 'button'), 5000);
//   }
// }
//
// @Component({
//   template: `<button nz-button [nzLoading]="nzLoading" (click)="buttonClick()">click me</button> `
// })
// export class TestButtonWithLoadingComponent {
//   @Input() nzLoading: boolean = false;
// }
//
// @Component({
//   template: '<a nz-button [disabled]="disabled"> anchor </a>'
// })
// export class TestAnchorComponent {
//   disabled = false;
// }
