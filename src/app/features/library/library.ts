import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AudioPlayerService, PlayerTrack } from '../../core/audio/audio-player.service';
import { ConnectionStateService } from '../../core/connection/connection-state.service';
import { OpenSubsonicClientService } from '../../core/open-subsonic/open-subsonic-client.service';
import { SubsonicAlbum } from '../../core/open-subsonic/open-subsonic.models';
import { LanguageSwitcher } from '../../shared/language-switcher/language-switcher';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

interface AlbumViewModel {
  readonly album: SubsonicAlbum;
  readonly coverArtUrl: string | null;
}

type AlbumSortMode = 'recentlyAdded' | 'titleAsc' | 'titleDesc' | 'artistAsc' | 'artistDesc';

interface AlbumSortOption {
  readonly mode: AlbumSortMode;
  readonly labelKey: string;
}

const albumSortOptions: readonly AlbumSortOption[] = [
  { mode: 'recentlyAdded', labelKey: 'library.sortRecentlyAdded' },
  { mode: 'titleAsc', labelKey: 'library.sortTitleAsc' },
  { mode: 'titleDesc', labelKey: 'library.sortTitleDesc' },
  { mode: 'artistAsc', labelKey: 'library.sortArtistAsc' },
  { mode: 'artistDesc', labelKey: 'library.sortArtistDesc' },
];

@Component({
  selector: 'app-library',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher, ThemeToggle],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit, OnDestroy {
  private readonly openSubsonic = inject(OpenSubsonicClientService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  public readonly player = inject(AudioPlayerService);
  public readonly connectionState = inject(ConnectionStateService);

  private readonly unknownAlbumLabel = toSignal(this.translate.stream('album.unknownAlbum'), {
    initialValue: 'Unknown album',
  });

  private readonly unknownArtistLabel = toSignal(this.translate.stream('album.unknownArtist'), {
    initialValue: 'Unknown artist',
  });

  private readonly unknownTrackLabel = toSignal(this.translate.stream('album.unknownTrack'), {
    initialValue: 'Unknown track',
  });

  private readonly playAlbumFailedMessage = toSignal(
    this.translate.stream('errors.playAlbumFailed'),
    {
      initialValue: 'The selected album could not be played.',
    },
  );

  private readonly collectionLoadFailedMessage = toSignal(
    this.translate.stream('library.collectionLoadFailed'),
    {
      initialValue: 'The album collection could not be loaded.',
    },
  );

  public readonly albums = signal<readonly AlbumViewModel[]>([]);
  public readonly loading = signal<boolean>(true);
  public readonly searching = signal<boolean>(false);
  public readonly searchQuery = signal<string>('');
  public readonly sortMode = signal<AlbumSortMode>('recentlyAdded');
  public readonly errorMessage = signal<string | null>(null);
  public readonly startingAlbumId = signal<string | null>(null);

  public readonly sortOptions = albumSortOptions;

  public readonly searchActive = computed(() => this.searchQuery().trim().length > 0);

  private libraryRequestId = 0;
  private searchDebounceId?: number;
  private albumResults: readonly AlbumViewModel[] = [];
  private newestAlbums: readonly AlbumViewModel[] = [];

  ngOnInit(): void {
    this.loadAlbums();
  }

  ngOnDestroy(): void {
    this.clearSearchDebounce();

    ++this.libraryRequestId;
  }

  public async reload(): Promise<void> {
    const query = this.normalizedSearchQuery();

    if (query) {
      await this.searchAlbums(query);

      return;
    }

    await this.loadAlbums();
  }

  public searchChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;

    this.searchQuery.set(query);

    this.errorMessage.set(null);

    this.clearSearchDebounce();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      this.loadAlbums();

      return;
    }

    this.searchDebounceId = window.setTimeout(() => {
      this.searchAlbums(normalizedQuery);
    }, 300);
  }

  public clearSearch(): void {
    this.searchQuery.set('');

    this.clearSearchDebounce();

    this.loadAlbums();
  }

  public sortChanged(event: Event): void {
    const select = event.target as HTMLSelectElement;

    if (!this.isAlbumSortMode(select.value)) {
      return;
    }

    this.sortMode.set(select.value);

    this.applyAlbumSort();
  }

  public libraryHeadingKey(): string {
    return this.searchActive() ? 'library.searchResults' : 'library.albums';
  }

  public librarySummaryKey(): string {
    if (this.loading()) {
      return 'library.loadingAlbums';
    }

    if (this.searching()) {
      return 'library.searchingAlbums';
    }

    const count = this.albums().length;

    if (this.searchActive()) {
      return count === 1 ? 'library.matchingAlbum' : 'library.matchingAlbums';
    }

    return count === 1 ? 'library.singleAlbum' : 'library.totalAlbums';
  }

  public emptyTitleKey(): string {
    return this.searchActive() ? 'library.noSearchResultsTitle' : 'library.emptyTitle';
  }

  public emptyDescriptionKey(): string {
    return this.searchActive() ? 'library.noSearchResultsDescription' : 'library.emptyDescription';
  }

  public albumTitle(album: SubsonicAlbum): string {
    return album.name ?? album.album ?? this.unknownAlbumLabel();
  }

  public albumArtist(album: SubsonicAlbum): string {
    return album.artist ?? this.unknownArtistLabel();
  }

  public trackAlbum(_index: number, item: AlbumViewModel): string {
    return item.album.id;
  }

  public async openAlbum(albumId: string): Promise<void> {
    await this.router.navigate(['/album', albumId]);
  }

  public isActiveAlbum(item: AlbumViewModel): boolean {
    return this.player.currentTrack()?.albumId === item.album.id;
  }

  public async playAlbum(item: AlbumViewModel): Promise<void> {
    if (this.isActiveAlbum(item)) {
      await this.togglePlayback();

      return;
    }

    this.startingAlbumId.set(item.album.id);

    this.errorMessage.set(null);

    try {
      const album = await this.openSubsonic.getAlbum(item.album.id);
      const songs = album.song ?? [];

      if (songs.length === 0) {
        return;
      }

      const albumTitle = album.name ?? album.album ?? this.unknownAlbumLabel();
      const albumArtist = album.artist ?? this.albumArtist(item.album);

      const tracks = await Promise.all(
        songs.map(async (song) => {
          const streamUrl = await this.openSubsonic.createRequestUrl('stream', {
            id: song.id,
          });

          const track: PlayerTrack = {
            id: song.id,
            title: song.title ?? this.unknownTrackLabel(),
            artist: song.artist ?? albumArtist,
            album: song.album ?? albumTitle,
            albumId: album.id,
            coverArtUrl: item.coverArtUrl,
            streamUrl,
            duration: song.duration,
          };

          return track;
        }),
      );

      await this.player.setQueue(tracks, 0);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : this.playAlbumFailedMessage());
    } finally {
      this.startingAlbumId.set(null);
    }
  }

  public albumPlaybackKey(item: AlbumViewModel): string {
    if (this.isActiveAlbum(item) && this.player.playing()) {
      return 'common.pauseAlbum';
    }

    return 'common.playAlbum';
  }

  public async disconnect(): Promise<void> {
    this.player.clearQueue();

    this.connectionState.clear();

    await this.router.navigate(['/']);
  }

  private async loadAlbums(): Promise<void> {
    const requestId = ++this.libraryRequestId;

    this.loading.set(true);

    this.searching.set(false);

    this.errorMessage.set(null);

    try {
      const albums = await this.openSubsonic.getNewestAlbums();
      const viewModels = await this.createAlbumViewModels(albums);

      if (requestId !== this.libraryRequestId) {
        return;
      }

      this.newestAlbums = viewModels;

      this.setAlbumResults(viewModels);
    } catch (error: unknown) {
      if (requestId !== this.libraryRequestId) {
        return;
      }

      this.errorMessage.set(
        error instanceof Error ? error.message : this.collectionLoadFailedMessage(),
      );
    } finally {
      if (requestId === this.libraryRequestId) {
        this.loading.set(false);
      }
    }
  }

  private async searchAlbums(query: string): Promise<void> {
    const requestId = ++this.libraryRequestId;

    this.loading.set(false);

    this.searching.set(true);

    this.errorMessage.set(null);

    try {
      const albums = await this.openSubsonic.searchAlbums(query);
      const viewModels = await this.createAlbumViewModels(albums);

      if (requestId !== this.libraryRequestId) {
        return;
      }

      this.setAlbumResults(viewModels);
    } catch {
      if (requestId !== this.libraryRequestId) {
        return;
      }

      const fallbackAlbums = this.newestAlbums.length > 0 ? this.newestAlbums : this.albumResults;

      this.setAlbumResults(this.filterAlbumViewModels(query, fallbackAlbums));
    } finally {
      if (requestId === this.libraryRequestId) {
        this.searching.set(false);
      }
    }
  }

  private async createAlbumViewModels(
    albums: readonly SubsonicAlbum[],
  ): Promise<readonly AlbumViewModel[]> {
    return Promise.all(
      albums.map(async (album) => ({
        album,
        coverArtUrl: await this.createCoverArtUrl(album),
      })),
    );
  }

  private normalizedSearchQuery(): string {
    return this.searchQuery().trim();
  }

  private setAlbumResults(albums: readonly AlbumViewModel[]): void {
    this.albumResults = albums;

    this.applyAlbumSort();
  }

  private applyAlbumSort(): void {
    this.albums.set(this.sortAlbumViewModels(this.albumResults));
  }

  private sortAlbumViewModels(albums: readonly AlbumViewModel[]): readonly AlbumViewModel[] {
    if (this.sortMode() === 'recentlyAdded') {
      return albums;
    }

    return albums
      .map((item, index) => ({ item, index }))
      .sort(
        (left, right) =>
          this.compareAlbumViewModels(left.item, right.item) || left.index - right.index,
      )
      .map(({ item }) => item);
  }

  private compareAlbumViewModels(left: AlbumViewModel, right: AlbumViewModel): number {
    switch (this.sortMode()) {
      case 'titleAsc':
        return this.compareText(this.albumTitle(left.album), this.albumTitle(right.album), 'asc');

      case 'titleDesc':
        return this.compareText(this.albumTitle(left.album), this.albumTitle(right.album), 'desc');

      case 'artistAsc':
        return this.compareText(this.albumArtist(left.album), this.albumArtist(right.album), 'asc');

      case 'artistDesc':
        return this.compareText(
          this.albumArtist(left.album),
          this.albumArtist(right.album),
          'desc',
        );

      default:
        return 0;
    }
  }

  private compareText(left: string, right: string, direction: 'asc' | 'desc'): number {
    const comparison = left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    return direction === 'asc' ? comparison : -comparison;
  }

  private isAlbumSortMode(value: string): value is AlbumSortMode {
    return albumSortOptions.some((option) => option.mode === value);
  }

  private filterAlbumViewModels(
    query: string,
    albums: readonly AlbumViewModel[],
  ): readonly AlbumViewModel[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return albums;
    }

    return albums.filter((item) => {
      const album = item.album;

      const searchableText = [
        this.albumTitle(album),
        this.albumArtist(album),
        album.genre,
        album.year,
      ]
        .filter((value) => value !== undefined)
        .join(' ')
        .toLocaleLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }

  private clearSearchDebounce(): void {
    if (this.searchDebounceId === undefined) {
      return;
    }

    window.clearTimeout(this.searchDebounceId);

    this.searchDebounceId = undefined;
  }

  private async createCoverArtUrl(album: SubsonicAlbum): Promise<string | null> {
    if (!album.coverArt) {
      return null;
    }

    return this.openSubsonic.createRequestUrl('getCoverArt', {
      id: album.coverArt,
      size: 500,
    });
  }

  private async togglePlayback(): Promise<void> {
    try {
      await this.player.togglePlayback();
    } catch {
      // Note: The service exposes the playback error through errorMessage
    }
  }
}
