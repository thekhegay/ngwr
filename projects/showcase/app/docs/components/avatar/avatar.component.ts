import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';

import { WrAvatarModule } from 'ngwr/avatar';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-avatar',
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeComponent, SnippetComponent, WrAvatarModule, WrTagModule],
})
export class AvatarComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Avatar';
  protected readonly pageDescription = 'Component for display profile picture';

  protected readonly code = {
    import: `import{WrAvatarModule}from'ngwr/avatar';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrAvatarModule,],})\nexport class MyComponent {}`,
    usage: '<wr-avatar url="images/image_1.webp" alt="WrAvatar example image" />',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['avatar', 'wr-avatar']);
  }
}
