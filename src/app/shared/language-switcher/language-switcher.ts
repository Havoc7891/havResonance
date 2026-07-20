import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService, SupportedLanguage } from '../../core/language/language.service';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  templateUrl: './language-switcher.html',
})
export class LanguageSwitcher {
  public readonly language = inject(LanguageService);

  public switchLanguage(language: SupportedLanguage): void {
    void this.language.switchLanguage(language);
  }
}
