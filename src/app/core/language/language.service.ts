import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type SupportedLanguage = 'en' | 'de';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static readonly storageKey = 'havResonance.language';

  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly initialLanguage = this.readInitialLanguage();

  public readonly languages = [
    { code: 'en', labelKey: 'language.english', shortLabel: 'EN' },
    { code: 'de', labelKey: 'language.german', shortLabel: 'DE' },
  ] as const;

  public readonly currentLanguage = computed<SupportedLanguage>(() =>
    this.normalizeLanguage(this.translate.currentLang() ?? this.initialLanguage),
  );

  constructor() {
    this.translate.addLangs(this.languages.map((language) => language.code));

    this.switchLanguage(this.initialLanguage);

    effect(() => {
      const language = this.translate.currentLang();

      if (!language) {
        return;
      }

      this.document.documentElement.lang = language;

      try {
        this.document.defaultView?.localStorage.setItem(LanguageService.storageKey, language);
      } catch {
        // Note: Browsers can deny storage access - language switching still works for the current page
      }
    });
  }

  public async switchLanguage(language: SupportedLanguage): Promise<void> {
    await firstValueFrom(this.translate.use(language));
  }

  public isActive(language: SupportedLanguage): boolean {
    return this.currentLanguage() === language;
  }

  private readInitialLanguage(): SupportedLanguage {
    const storedLanguage = this.readStoredLanguage();

    if (storedLanguage) {
      return storedLanguage;
    }

    const browserLanguage = this.translate.getBrowserLang();

    return this.normalizeLanguage(browserLanguage);
  }

  private readStoredLanguage(): SupportedLanguage | null {
    try {
      const storedLanguage = this.document.defaultView?.localStorage.getItem(
        LanguageService.storageKey,
      );

      return storedLanguage === 'en' || storedLanguage === 'de' ? storedLanguage : null;
    } catch {
      return null;
    }
  }

  private normalizeLanguage(language: string | null | undefined): SupportedLanguage {
    return language?.toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}
