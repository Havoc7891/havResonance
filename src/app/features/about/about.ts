import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { appVersion } from '../../app-version';
import { AudioPlayerService } from '../../core/audio/audio-player.service';
import { ConnectionStateService } from '../../core/connection/connection-state.service';
import { LanguageSwitcher } from '../../shared/language-switcher/language-switcher';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-about',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher, ThemeToggle],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private readonly player = inject(AudioPlayerService);
  private readonly router = inject(Router);

  public readonly connectionState = inject(ConnectionStateService);

  public readonly appVersion = appVersion;

  public readonly returnRoute = computed(() =>
    this.connectionState.connected() ? '/library' : '/',
  );

  public readonly returnLabelKey = computed(() =>
    this.connectionState.connected() ? 'common.library' : 'common.connect',
  );

  public readonly returnIcon = computed(() =>
    this.connectionState.connected() ? 'bi-music-note-list' : 'bi-box-arrow-in-right',
  );

  public async disconnect(): Promise<void> {
    this.player.clearQueue();

    this.connectionState.clear();

    await this.router.navigate(['/']);
  }
}
