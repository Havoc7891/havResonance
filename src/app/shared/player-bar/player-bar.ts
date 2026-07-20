import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AudioPlayerService, PlayerTrack } from '../../core/audio/audio-player.service';
import { LyricsService } from '../../core/lyrics/lyrics.service';
import { LyricsPanel } from '../lyrics-panel/lyrics-panel';
import { QueuePanel } from '../queue-panel/queue-panel';

@Component({
  selector: 'app-player-bar',
  imports: [RouterLink, TranslatePipe, QueuePanel, LyricsPanel],
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.css',
})
export class PlayerBar {
  public readonly player = inject(AudioPlayerService);

  private readonly lyrics = inject(LyricsService);

  public readonly queueOpen = signal<boolean>(false);
  public readonly lyricsOpen = signal<boolean>(false);
  public readonly lyricsAvailable = signal<boolean>(false);

  private lyricsAvailabilityRequestId = 0;

  constructor() {
    effect(() => {
      const track = this.player.currentTrack();

      if (!track) {
        ++this.lyricsAvailabilityRequestId;

        this.lyricsOpen.set(false);

        this.lyricsAvailable.set(false);

        return;
      }

      this.loadLyricsAvailability(track);
    });
  }

  public async togglePlayback(): Promise<void> {
    try {
      await this.player.togglePlayback();
    } catch {
      // Note: The service exposes the playback error through errorMessage
    }
  }

  public async previous(): Promise<void> {
    try {
      await this.player.previous();
    } catch {
      // Note: The service exposes the playback error through errorMessage
    }
  }

  public async next(): Promise<void> {
    try {
      await this.player.next();
    } catch {
      // Note: The service exposes the playback error through errorMessage
    }
  }

  public async toggleShuffle(): Promise<void> {
    await this.player.toggleShuffle();
  }

  public openQueue(): void {
    this.queueOpen.set(true);
  }

  public closeQueue(): void {
    this.queueOpen.set(false);
  }

  public openLyrics(): void {
    if (!this.lyricsAvailable()) {
      return;
    }

    this.lyricsOpen.set(true);
  }

  public closeLyrics(): void {
    this.lyricsOpen.set(false);
  }

  public cycleRepeatMode(): void {
    this.player.cycleRepeatMode();
  }

  public repeatLabel(): string {
    switch (this.player.repeatMode()) {
      case 'all':
        return 'player.repeatAll';

      case 'one':
        return 'player.repeatCurrentTrack';

      default:
        return 'player.repeatOff';
    }
  }

  public seek(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.player.seekByPercentage(Number(input.value));
  }

  public changeVolume(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.player.setVolume(Number(input.value));
  }

  public toggleMute(): void {
    this.player.toggleMute();
  }

  public formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) {
      return '0:00';
    }

    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private async loadLyricsAvailability(track: PlayerTrack): Promise<void> {
    const requestId = ++this.lyricsAvailabilityRequestId;

    this.lyricsAvailable.set(false);

    const lyricsAvailable = await this.lyrics.hasLyrics(track);

    if (requestId !== this.lyricsAvailabilityRequestId) {
      return;
    }

    this.lyricsAvailable.set(lyricsAvailable);

    if (!lyricsAvailable) {
      this.lyricsOpen.set(false);
    }
  }
}
