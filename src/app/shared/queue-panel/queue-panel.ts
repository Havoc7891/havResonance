import { Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AudioPlayerService } from '../../core/audio/audio-player.service';

@Component({
  selector: 'app-queue-panel',
  imports: [TranslatePipe],
  templateUrl: './queue-panel.html',
  styleUrl: './queue-panel.css',
})
export class QueuePanel {
  public readonly open = input.required<boolean>();
  public readonly closed = output<void>();

  public readonly player = inject(AudioPlayerService);

  public close(): void {
    this.closed.emit();
  }

  public async selectTrack(index: number): Promise<void> {
    try {
      await this.player.selectQueueItem(index);
    } catch {
      // Note: The service exposes the playback error through errorMessage
    }
  }

  public removeTrack(event: MouseEvent, index: number): void {
    event.stopPropagation();

    this.player.removeQueueItem(index);
  }

  public moveUp(event: MouseEvent, index: number): void {
    event.stopPropagation();

    this.player.moveQueueItem(index, index - 1);
  }

  public moveDown(event: MouseEvent, index: number): void {
    event.stopPropagation();

    this.player.moveQueueItem(index, index + 1);
  }

  public clearQueue(): void {
    this.player.clearQueue();

    this.close();
  }

  public formatDuration(seconds?: number): string {
    if (seconds === undefined || !Number.isFinite(seconds)) {
      return '-:--';
    }

    const totalSeconds = Math.max(0, Math.floor(seconds));

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
