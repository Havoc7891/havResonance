import { computed, Injectable, signal } from '@angular/core';

export interface PlayerTrack {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly albumId?: string;
  readonly coverArtUrl: string | null;
  readonly streamUrl: string;
  readonly duration?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private readonly audio = new Audio();

  public readonly queue = signal<readonly PlayerTrack[]>([]);
  public readonly queueIndex = signal<number>(-1);

  public readonly currentTrack = computed(() => {
    const queueIndex = this.queueIndex();
    const queue = this.queue();

    return queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex] : null;
  });

  private originalQueue: readonly PlayerTrack[] = [];
  private lastAudibleVolume = 1;

  public readonly playing = signal<boolean>(false);
  public readonly currentTime = signal<number>(0);
  public readonly duration = signal<number>(0);
  public readonly volume = signal<number>(1);
  public readonly muted = signal<boolean>(false);
  public readonly repeatMode = signal<RepeatMode>('off');
  public readonly shuffleEnabled = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  public readonly hasPrevious = computed(() => this.queueIndex() > 0);
  public readonly hasNext = computed(() => {
    const queue = this.queue();

    if (queue.length === 0) {
      return false;
    }

    return this.queueIndex() < queue.length - 1 || this.repeatMode() === 'all';
  });

  public readonly upcomingCount = computed(() => {
    const remaining = this.queue().length - this.queueIndex() - 1;

    return Math.max(0, remaining);
  });

  public readonly queueEmpty = computed(() => this.queue().length === 0);

  public readonly effectivelyMuted = computed(() => this.muted() || this.volume() === 0);

  public readonly progress = computed(() => {
    const duration = this.duration();

    if (duration <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.currentTime() / duration) * 100));
  });

  constructor() {
    this.audio.preload = 'metadata';

    this.audio.addEventListener('play', () => {
      this.playing.set(true);

      this.errorMessage.set(null);
    });

    this.audio.addEventListener('pause', () => {
      this.playing.set(false);
    });

    this.audio.addEventListener('ended', () => {
      this.playNextAutomatically();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime);
    });

    this.audio.addEventListener('durationchange', () => {
      this.updateDuration();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.updateDuration();
    });

    this.audio.addEventListener('volumechange', () => {
      this.updateVolumeState();
    });

    this.audio.addEventListener('error', () => {
      this.playing.set(false);

      this.errorMessage.set('The selected track could not be played.');
    });
  }

  public async setQueue(tracks: readonly PlayerTrack[], startIndex = 0): Promise<void> {
    if (tracks.length === 0) {
      this.clearQueue();

      return;
    }

    const normalizedIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

    this.originalQueue = [...tracks];
    this.shuffleEnabled.set(false);
    this.queue.set([...tracks]);

    await this.playQueueIndex(normalizedIndex);
  }

  public async playTrack(track: PlayerTrack): Promise<void> {
    const existingTrack = this.queue().findIndex((queuedTrack) => queuedTrack.id === track.id);

    if (existingTrack >= 0) {
      await this.playQueueIndex(existingTrack);

      return;
    }

    await this.setQueue([track]);
  }

  public async playQueueIndex(index: number): Promise<void> {
    const queue = this.queue();

    if (index < 0 || index >= queue.length) {
      return;
    }

    const track = queue[index];

    const changingTrack = this.queueIndex() !== index;

    this.queueIndex.set(index);

    if (changingTrack || this.audio.src !== track.streamUrl) {
      this.audio.src = track.streamUrl;

      this.currentTime.set(0);

      this.duration.set(track.duration ?? 0);
    }

    this.errorMessage.set(null);

    try {
      await this.audio.play();
    } catch (error: unknown) {
      this.playing.set(false);

      this.errorMessage.set(
        error instanceof Error ? error.message : 'Playback could not be started.',
      );

      throw error;
    }
  }

  public async togglePlayback(): Promise<void> {
    if (!this.currentTrack()) {
      return;
    }

    if (this.audio.paused) {
      await this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  public async previous(): Promise<void> {
    // Restart the current track whe more than three seconds have already played.
    // Otherwise, move to the previous queue item.
    if (this.audio.currentTime > 3 || !this.hasPrevious()) {
      this.seek(0);

      return;
    }

    await this.playQueueIndex(this.queueIndex() - 1);
  }

  public async next(): Promise<void> {
    const queue = this.queue();
    const nextIndex = this.queueIndex() + 1;

    if (nextIndex < queue.length) {
      await this.playQueueIndex(nextIndex);

      return;
    }

    if (this.repeatMode() === 'all' && this.queue().length > 0) {
      await this.playQueueIndex(0);
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public seek(seconds: number): void {
    const maximum = Number.isFinite(this.audio.duration) ? this.audio.duration : this.duration();

    this.audio.currentTime = Math.max(0, Math.min(seconds, maximum || seconds));
  }

  public seekByPercentage(percentage: number): void {
    const duration = this.duration();

    if (duration <= 0) {
      return;
    }

    const normalizedPercentage = Math.max(0, Math.min(100, percentage));

    this.seek((duration * normalizedPercentage) / 100);
  }

  public setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    if (normalizedVolume > 0) {
      this.lastAudibleVolume = normalizedVolume;

      this.audio.muted = false;
    }

    this.audio.volume = normalizedVolume;

    this.updateVolumeState();
  }

  public toggleMute(): void {
    if (this.audio.muted || this.audio.volume === 0) {
      if (this.audio.volume === 0) {
        this.audio.volume = this.lastAudibleVolume;
      }

      this.audio.muted = false;
    } else {
      this.audio.muted = true;
    }

    this.updateVolumeState();
  }

  public async selectQueueItem(index: number): Promise<void> {
    await this.playQueueIndex(index);
  }

  public removeQueueItem(index: number): void {
    const queue = [...this.queue()];
    const currentIndex = this.queueIndex();

    if (index < 0 || index >= queue.length) {
      return;
    }

    const removedTrack = queue[index];

    const removingCurrentTrack = index === currentIndex;

    queue.splice(index, 1);

    this.originalQueue = this.originalQueue.filter((track) => track.id !== removedTrack.id);

    if (queue.length === 0) {
      this.clearQueue();

      return;
    }

    this.queue.set(queue);

    this.originalQueue = this.originalQueue.filter((track) => track.id !== queue[index]?.id);

    if (index < currentIndex) {
      this.queueIndex.set(currentIndex - 1);

      return;
    }

    if (removingCurrentTrack) {
      const replacementIndex = Math.min(index, queue.length - 1);

      this.queueIndex.set(replacementIndex);

      const replacementTrack = queue[replacementIndex];

      this.audio.src = replacementTrack.streamUrl;
      this.currentTime.set(0);
      this.duration.set(replacementTrack.duration ?? 0);

      this.audio.play().catch((error: unknown) => {
        this.playing.set(false);

        this.errorMessage.set(
          error instanceof Error ? error.message : 'Playback could not be started.',
        );
      });
    }
  }

  public moveQueueItem(fromIndex: number, toIndex: number): void {
    const queue = [...this.queue()];

    if (
      fromIndex < 0 ||
      fromIndex >= queue.length ||
      toIndex < 0 ||
      toIndex >= queue.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const currentIndex = this.queueIndex();

    const [movedTrack] = queue.splice(fromIndex, 1);

    queue.splice(toIndex, 0, movedTrack);

    let newCurrentIndex = currentIndex;

    if (currentIndex === fromIndex) {
      newCurrentIndex = toIndex;
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      newCurrentIndex = currentIndex - 1;
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      newCurrentIndex = currentIndex + 1;
    }

    this.queue.set(queue);

    this.queueIndex.set(newCurrentIndex);

    this.originalQueue = [...queue];
  }

  public cycleRepeatMode(): void {
    const nextMode: Record<RepeatMode, RepeatMode> = {
      off: 'all',
      all: 'one',
      one: 'off',
    };

    this.repeatMode.set(nextMode[this.repeatMode()]);
  }

  public async toggleShuffle(): Promise<void> {
    const currentTrack = this.currentTrack();

    if (!currentTrack || this.queue().length < 2) {
      return;
    }

    if (this.shuffleEnabled()) {
      this.restoreOriginalQueue(currentTrack.id);

      this.shuffleEnabled.set(false);

      return;
    }

    this.shuffleQueue(currentTrack);

    this.shuffleEnabled.set(true);
  }

  public clearQueue(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();

    this.originalQueue = [];
    this.queue.set([]);
    this.queueIndex.set(-1);
    this.currentTime.set(0);
    this.duration.set(0);
    this.playing.set(false);
    this.shuffleEnabled.set(false);
    this.repeatMode.set('off');
    this.errorMessage.set(null);
  }

  private async playNextAutomatically(): Promise<void> {
    if (this.repeatMode() === 'one') {
      this.seek(0);

      try {
        await this.audio.play();
      } catch {
        this.playing.set(false);
      }

      return;
    }

    const canContinue =
      this.queueIndex() < this.queue().length - 1 ||
      (this.repeatMode() === 'all' && this.queue().length > 0);

    if (canContinue) {
      try {
        await this.next();
      } catch {
        // Note: Playback errors are exposed through errorMessage
      }

      return;
    }

    this.playing.set(false);

    this.currentTime.set(this.duration());
  }

  private updateDuration(): void {
    this.duration.set(
      Number.isFinite(this.audio.duration)
        ? this.audio.duration
        : (this.currentTrack()?.duration ?? 0),
    );
  }

  private updateVolumeState(): void {
    this.volume.set(this.audio.volume);

    this.muted.set(this.audio.muted);

    if (this.audio.volume > 0) {
      this.lastAudibleVolume = this.audio.volume;
    }
  }

  private shuffleQueue(currentTrack: PlayerTrack): void {
    const currentQueue = this.queue();

    const remainingTracks = currentQueue.filter((track) => track.id !== currentTrack.id);

    for (let index = remainingTracks.length - 1; index > 0; --index) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [remainingTracks[index], remainingTracks[randomIndex]] = [
        remainingTracks[randomIndex],
        remainingTracks[index],
      ];
    }

    this.queue.set([currentTrack, ...remainingTracks]);

    this.queueIndex.set(0);
  }

  private restoreOriginalQueue(currentTrackId: string): void {
    const restoredQueue = [...this.originalQueue];

    const restoredIndex = restoredQueue.findIndex((track) => track.id === currentTrackId);

    if (restoredIndex < 0) {
      return;
    }

    this.queue.set(restoredQueue);

    this.queueIndex.set(restoredIndex);
  }
}
