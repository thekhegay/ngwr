import { Component, DebugElement } from '@angular/core';
import { fakeAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { wrThemeColors, WrThemeColor } from 'ngwr/core/color';
import { WrDivider } from './divider';
import { WrDividerModule } from './divider-module';

describe('WrDivider', () => {
  let fixture: ComponentFixture<WrDividerTestComponent>;
  let component: WrDividerTestComponent;
  let debugElement: DebugElement;
  let divider: HTMLElement;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [WrDividerModule],
      declarations: [WrDividerTestComponent],
    });
    TestBed.compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WrDividerTestComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    divider = debugElement.query(By.directive(WrDivider)).nativeElement;
    fixture.detectChanges();
  });

  for (const color of wrThemeColors) {
    it(`should apply classname based on ${color} wrColor`, () => {
      if (color === 'primary') {
        expect(divider.classList).toContain(`wr-divider--${color}`);
      } else {
        expect(divider.classList).toContain('wr-divider--primary');
        expect(divider.classList).not.toContain(`wr-divider--${color}`);
        component.wrColor = color;
        fixture.detectChanges();
        expect(divider.classList).toContain(`wr-divider--${color}`);
      }
    });
  }

  it(`should apply classname based on solid wrType`, () => {
    expect(divider.classList).not.toContain(`wr-divider--dotted`);
    expect(divider.classList).not.toContain(`wr-divider--dashed`);
    expect(divider.classList).toContain(`wr-divider--solid`);
  });

  it(`should apply classname based on dashed wrType`, () => {
    expect(divider.classList).not.toContain(`wr-divider--dotted`);
    expect(divider.classList).not.toContain(`wr-divider--dashed`);
    expect(divider.classList).toContain(`wr-divider--solid`);
    component.wrType = 'dashed';
    fixture.detectChanges();
    expect(divider.classList).not.toContain(`wr-divider--solid`);
    expect(divider.classList).toContain(`wr-divider--dashed`);
  });

  it(`should apply classname based on dotted wrType`, () => {
    expect(divider.classList).not.toContain(`wr-divider--dotted`);
    expect(divider.classList).not.toContain(`wr-divider--dashed`);
    expect(divider.classList).toContain(`wr-divider--solid`);
    component.wrType = 'dotted';
    fixture.detectChanges();
    expect(divider.classList).not.toContain(`wr-divider--solid`);
    expect(divider.classList).toContain(`wr-divider--dotted`);
  });

  it('should set aria role properly', () => {
    expect(divider.getAttribute('role')).toBe('separator');
  });
});

@Component({
  template: `<wr-divider [wrColor]="wrColor" [wrType]="wrType" [wrWidth]="wrWidth"></wr-divider>`,
})
class WrDividerTestComponent {
  wrColor: WrThemeColor = 'primary';
  wrType: 'solid' | 'dashed' | 'dotted' = 'solid';
  wrWidth: string = '1px';
}
