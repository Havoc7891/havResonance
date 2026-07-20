import { Component, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PlayerTrack } from '../../core/audio/audio-player.service';
import { LyricsResult, LyricsService } from '../../core/lyrics/lyrics.service';

@Component({
  selector: 'app-lyrics-panel',
  imports: [TranslatePipe],
  templateUrl: './lyrics-panel.html',
  styleUrl: './lyrics-panel.css',
})
export class LyricsPanel {
  public readonly open = input<boolean>(false);
  public readonly track = input<PlayerTrack | null>(null);
  public readonly closed = output<void>();

  public readonly loading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly lyrics = signal<LyricsResult | null>(null);

  private readonly lyricsService = inject(LyricsService);
  private readonly translate = inject(TranslateService);

  private readonly lyricsLoadFailedMessage = toSignal(
    this.translate.stream('lyrics.couldNotLoad'),
    {
      initialValue: 'Could not load lyrics',
    },
  );

  private requestId = 0;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const track = this.track();

      if (!isOpen || !track) {
        ++this.requestId;

        this.loading.set(false);

        this.errorMessage.set(null);

        this.lyrics.set(null);

        return;
      }

      this.loadLyrics(track);
    });
  }

  public close(): void {
    this.closed.emit();
  }

  private async loadLyrics(track: PlayerTrack): Promise<void> {
    const requestId = ++this.requestId;

    this.loading.set(true);

    this.errorMessage.set(null);

    this.lyrics.set(null);

    try {
      const lyrics = await this.lyricsService.getLyrics(track);

      if (requestId === this.requestId) {
        this.lyrics.set(lyrics);
      }
    } catch (error: unknown) {
      if (requestId === this.requestId) {
        this.errorMessage.set(
          error instanceof Error ? error.message : this.lyricsLoadFailedMessage(),
        );
      }
    } finally {
      if (requestId === this.requestId) {
        this.loading.set(false);
      }
    }
  }
}
