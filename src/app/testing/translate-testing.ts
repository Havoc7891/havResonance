import { Provider } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';

export function provideTranslateTesting(): Provider[] {
  return provideTranslateService({
    fallbackLang: 'en',
    lang: 'en',
  });
}
