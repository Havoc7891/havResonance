import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AudioPlayerService, PlayerTrack } from '../../core/audio/audio-player.service';
import { ConnectionStateService } from '../../core/connection/connection-state.service';
import { LyricsService } from '../../core/lyrics/lyrics.service';
import { OpenSubsonicClientService } from '../../core/open-subsonic/open-subsonic-client.service';
import { SubsonicAlbumDetails, SubsonicSong } from '../../core/open-subsonic/open-subsonic.models';
import { LanguageSwitcher } from '../../shared/language-switcher/language-switcher';
import { LyricsPanel } from '../../shared/lyrics-panel/lyrics-panel';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-album',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher, ThemeToggle, LyricsPanel],
  templateUrl: './album.html',
  styleUrl: './album.css',
})
export class Album implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly connectionState = inject(ConnectionStateService);
  private readonly openSubsonic = inject(OpenSubsonicClientService);
  private readonly translate = inject(TranslateService);
  private readonly lyrics = inject(LyricsService);

  public readonly player = inject(AudioPlayerService);

  private readonly unknownAlbumLabel = toSignal(this.translate.stream('album.unknownAlbum'), {
    initialValue: 'Unknown album',
  });

  private readonly unknownArtistLabel = toSignal(this.translate.stream('album.unknownArtist'), {
    initialValue: 'Unknown artist',
  });

  private readonly unknownTrackLabel = toSignal(this.translate.stream('album.unknownTrack'), {
    initialValue: 'Unknown track',
  });

  private readonly playTrackFailedMessage = toSignal(
    this.translate.stream('errors.playTrackFailed'),
    {
      initialValue: 'The selected track could not be played.',
    },
  );

  private readonly albumLoadFailedMessage = toSignal(this.translate.stream('album.couldNotLoad'), {
    initialValue: 'Could not load the album',
  });

  private routeSubscription?: Subscription;
  private lyricsAvailabilityRequestId = 0;

  public readonly album = signal<SubsonicAlbumDetails | null>(null);
  public readonly coverArtUrl = signal<string | null>(null);
  public readonly loading = signal<boolean>(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly startingTrackId = signal<string | null>(null);
  public readonly lyricsOpen = signal<boolean>(false);
  public readonly lyricsTrack = signal<PlayerTrack | null>(null);
  public readonly songsWithLyrics = signal<ReadonlySet<string>>(new Set());

  public readonly songs = computed(() => this.album()?.song ?? []);

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((parameters) => {
      const albumId = parameters.get('id');

      if (!albumId) {
        this.router.navigate(['/library']);

        return;
      }

      this.loadAlbum(albumId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  public async reload(): Promise<void> {
    const albumId = this.route.snapshot.paramMap.get('id');

    if (albumId) {
      await this.loadAlbum(albumId);
    }
  }

  public async disconnect(): Promise<void> {
    this.player.clearQueue();

    this.connectionState.clear();

    await this.router.navigate(['/']);
  }

  public async playAlbumFrom(startIndex: number): Promise<void> {
    const album = this.album();
    const songs = this.songs();

    if (!album || songs.length === 0) {
      return;
    }

    const selectedSong = songs[startIndex];

    if (!selectedSong) {
      return;
    }

    this.startingTrackId.set(selectedSong.id);
    this.errorMessage.set(null);

    try {
      const tracks = await Promise.all(
        songs.map(async (song) => {
          const streamUrl = await this.openSubsonic.createRequestUrl('stream', {
            id: song.id,
          });

          const track: PlayerTrack = {
            id: song.id,
            title: song.title ?? this.unknownTrackLabel(),
            artist: song.artist ?? album.artist ?? this.unknownArtistLabel(),
            album: song.album ?? album.name ?? album.album ?? this.unknownAlbumLabel(),
            albumId: album.id,
            coverArtUrl: this.coverArtUrl(),
            streamUrl,
            duration: song.duration,
          };

          return track;
        }),
      );

      await this.player.setQueue(tracks, startIndex);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : this.playTrackFailedMessage());
    } finally {
      this.startingTrackId.set(null);
    }
  }

  public async toggleAlbumPlayback(): Promise<void> {
    const album = this.album();

    if (!album) {
      return;
    }

    if (this.isActiveAlbum(album)) {
      await this.togglePlayback();

      return;
    }

    await this.playAlbumFrom(0);
  }

  public async playSong(song: SubsonicSong): Promise<void> {
    const songIndex = this.songs().findIndex((currentSong) => currentSong.id === song.id);

    if (songIndex < 0) {
      return;
    }

    await this.playAlbumFrom(songIndex);
  }

  public openLyrics(event: MouseEvent, song: SubsonicSong): void {
    event.stopPropagation();

    const album = this.album();

    if (!album || !this.hasLyrics(song)) {
      return;
    }

    this.lyricsTrack.set(this.createLyricsTrack(song, album));

    this.lyricsOpen.set(true);
  }

  public closeLyrics(): void {
    this.lyricsOpen.set(false);
  }

  public hasLyrics(song: SubsonicSong): boolean {
    return this.songsWithLyrics().has(song.id);
  }

  public isActiveAlbum(album: SubsonicAlbumDetails): boolean {
    return this.player.currentTrack()?.albumId === album.id;
  }

  public albumPlaybackKey(album: SubsonicAlbumDetails): string {
    if (this.isActiveAlbum(album) && this.player.playing()) {
      return 'album.pauseAlbum';
    }

    if (this.isActiveAlbum(album)) {
      return 'album.resumeAlbum';
    }

    return 'album.playAlbum';
  }

  public isCurrentSong(song: SubsonicSong): boolean {
    return this.player.currentTrack()?.id === song.id;
  }

  public songNumber(song: SubsonicSong, index: number): string {
    return String(song.track ?? index + 1);
  }

  public formatDuration(seconds?: number): string {
    if (seconds === undefined || !Number.isFinite(seconds)) {
      return '-:--';
    }

    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  public formatAlbumDuration(seconds?: number): string {
    if (seconds === undefined || !Number.isFinite(seconds)) {
      return '';
    }

    const totalMinutes = Math.round(seconds / 60);

    if (totalMinutes === 0) {
      return '0 min';
    } else if (totalMinutes < 60) {
      return `${totalMinutes.toString().padStart(2, '0')} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes > 0 ? `${hours} hr ${minutes.toString().padStart(2, '0')} min` : `${hours} hr`;
  }

  private async loadAlbum(albumId: string): Promise<void> {
    const lyricsAvailabilityRequestId = ++this.lyricsAvailabilityRequestId;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.album.set(null);
    this.coverArtUrl.set(null);
    this.songsWithLyrics.set(new Set());

    try {
      const album = await this.openSubsonic.getAlbum(albumId);

      this.album.set(album);

      if (album.coverArt) {
        this.coverArtUrl.set(
          await this.openSubsonic.createRequestUrl('getCoverArt', {
            id: album.coverArt,
            size: 800,
          }),
        );
      }

      this.loadLyricsAvailability(album, lyricsAvailabilityRequestId);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : this.albumLoadFailedMessage());
    } finally {
      this.loading.set(false);
    }
  }

  private async loadLyricsAvailability(
    album: SubsonicAlbumDetails,
    requestId: number,
  ): Promise<void> {
    const availableSongs = await Promise.all(
      (album.song ?? []).map(async (song) => {
        const hasLyrics = await this.lyrics.hasLyrics(this.createLyricsTrack(song, album));

        return hasLyrics ? song.id : null;
      }),
    );

    if (requestId !== this.lyricsAvailabilityRequestId) {
      return;
    }

    this.songsWithLyrics.set(
      new Set(availableSongs.filter((songId): songId is string => songId !== null)),
    );
  }

  private async togglePlayback(): Promise<void> {
    try {
      await this.player.togglePlayback();
    } catch {
      // Note: The service exposes the playback error through errorMessage
    }
  }

  private createLyricsTrack(song: SubsonicSong, album: SubsonicAlbumDetails): PlayerTrack {
    return {
      id: song.id,
      title: song.title ?? this.unknownTrackLabel(),
      artist: song.artist ?? album.artist ?? this.unknownArtistLabel(),
      album: song.album ?? album.name ?? album.album ?? this.unknownAlbumLabel(),
      albumId: album.id,
      coverArtUrl: this.coverArtUrl(),
      streamUrl: '',
      duration: song.duration,
    };
  }
}
