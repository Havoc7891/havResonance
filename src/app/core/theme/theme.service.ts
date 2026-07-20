import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

type FaviconKind = 'ico' | 'png16' | 'png32' | 'png96' | 'svg';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private static readonly storageKey = 'havResonance.theme';

  private static readonly faviconByTheme: Record<ColorTheme, Record<FaviconKind, string>> = {
    dark: {
      ico: 'favicon-dark.ico?theme=dark',
      png16: 'favicon-dark-16x16.png?theme=dark',
      png32: 'favicon-dark-32x32.png?theme=dark',
      png96: 'favicon-dark.png?theme=dark',
      svg: 'havResonance-mark-dark.svg?theme=dark',
    },
    light: {
      ico: 'favicon-light.ico?theme=light',
      png16: 'favicon-light-16x16.png?theme=light',
      png32: 'favicon-light-32x32.png?theme=light',
      png96: 'favicon-light.png?theme=light',
      svg: 'havResonance-mark-light.svg?theme=light',
    },
  };

  private readonly document = inject(DOCUMENT);

  public readonly theme = signal<ColorTheme>(this.readInitialTheme());

  public readonly dark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  public toggle(): void {
    this.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  private applyTheme(theme: ColorTheme): void {
    const root = this.document.documentElement;

    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    this.applyFavicons(theme);

    try {
      this.document.defaultView?.localStorage.setItem(ThemeService.storageKey, theme);
    } catch {
      // Note: Browsers can deny storage access - theme switching still works for the current page
    }
  }

  private applyFavicons(theme: ColorTheme): void {
    const favicons = this.getOrCreateFaviconLinks();

    const assets = ThemeService.faviconByTheme[theme];

    favicons.forEach((favicon) => {
      const kind = this.readFaviconKind(favicon);

      if (!kind) {
        return;
      }

      const nextFavicon = favicon.cloneNode() as HTMLLinkElement;
      nextFavicon.setAttribute('href', assets[kind]);

      favicon.replaceWith(nextFavicon);
    });
  }

  private getOrCreateFaviconLinks(): HTMLLinkElement[] {
    const existingFavicons = Array.from(
      this.document.querySelectorAll<HTMLLinkElement>('link[data-app-favicon]'),
    );

    if (existingFavicons.length > 0) {
      return existingFavicons;
    }

    const favicon = this.document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    favicon.setAttribute('type', 'image/svg+xml');
    favicon.setAttribute('sizes', 'any');
    favicon.setAttribute('data-app-favicon', 'svg');

    this.document.head.appendChild(favicon);

    return [favicon];
  }

  private readFaviconKind(favicon: HTMLLinkElement): FaviconKind | null {
    const kind = favicon.getAttribute('data-app-favicon');

    return kind === 'ico' ||
      kind === 'png16' ||
      kind === 'png32' ||
      kind === 'png96' ||
      kind === 'svg'
      ? kind
      : null;
  }

  private readInitialTheme(): ColorTheme {
    const storedTheme = this.readStoredTheme();

    if (storedTheme) {
      return storedTheme;
    }

    const window = this.document.defaultView;

    if (
      typeof window?.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }

  private readStoredTheme(): ColorTheme | null {
    try {
      const storedTheme = this.document.defaultView?.localStorage.getItem(ThemeService.storageKey);

      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    } catch {
      return null;
    }
  }
}
