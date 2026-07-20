import { inject, Injectable } from '@angular/core';
import { PlayerTrack } from '../audio/audio-player.service';
import { OpenSubsonicClientService } from '../open-subsonic/open-subsonic-client.service';
import { StructuredLyrics } from '../open-subsonic/open-subsonic.models';

export interface StructuredLyricsEntry {
  readonly language?: string;
  readonly synced?: boolean;
  readonly lines: readonly string[];
}

export interface EmptyLyricsResult {
  readonly kind: 'empty';
}

export interface PlainLyricsResult {
  readonly kind: 'plain';
  readonly text: string;
}

export interface StructuredLyricsResult {
  readonly kind: 'structured';
  readonly entries: readonly StructuredLyricsEntry[];
}

export type LyricsResult = EmptyLyricsResult | PlainLyricsResult | StructuredLyricsResult;

type LyricsTrack = Pick<PlayerTrack, 'id' | 'artist' | 'title'>;

const emptyLyricsResult: EmptyLyricsResult = {
  kind: 'empty',
};

@Injectable({
  providedIn: 'root',
})
export class LyricsService {
  private readonly openSubsonic = inject(OpenSubsonicClientService);

  private readonly lyricsCache = new Map<string, Promise<LyricsResult>>();
  private extensions?: Promise<ReadonlySet<string>>;
  private configurationVersion = -1;

  public getLyrics(track: LyricsTrack): Promise<LyricsResult> {
    this.resetCacheWhenConnectionChanges();

    const cachedLyrics = this.lyricsCache.get(track.id);

    if (cachedLyrics) {
      return cachedLyrics;
    }

    const lyrics = this.loadLyrics(track).catch((error: unknown) => {
      this.lyricsCache.delete(track.id);

      throw error;
    });

    this.lyricsCache.set(track.id, lyrics);

    return lyrics;
  }

  public async hasLyrics(track: LyricsTrack): Promise<boolean> {
    const lyrics = await this.getLyrics(track);

    return lyrics.kind !== 'empty';
  }

  private resetCacheWhenConnectionChanges(): void {
    const configurationVersion = this.openSubsonic.getConfigurationVersion();

    if (configurationVersion === this.configurationVersion) {
      return;
    }

    this.lyricsCache.clear();
    this.extensions = undefined;
    this.configurationVersion = configurationVersion;
  }

  private async loadLyrics(track: LyricsTrack): Promise<LyricsResult> {
    if (await this.supportsStructuredLyrics()) {
      const structuredLyrics = await this.tryLoadStructuredLyrics(track.id);

      if (structuredLyrics.kind !== 'empty') {
        return structuredLyrics;
      }
    }

    return this.tryLoadLegacyLyrics(track);
  }

  private async supportsStructuredLyrics(): Promise<boolean> {
    if (!this.extensions) {
      this.extensions = this.loadExtensions();
    }

    return (await this.extensions).has('songLyrics');
  }

  private async loadExtensions(): Promise<ReadonlySet<string>> {
    try {
      const extensions = await this.openSubsonic.getOpenSubsonicExtensions();

      return new Set(extensions.map((extension) => extension.name));
    } catch {
      return new Set();
    }
  }

  private async tryLoadStructuredLyrics(songId: string): Promise<LyricsResult> {
    try {
      const structuredLyrics = await this.openSubsonic.getLyricsBySongId(songId);

      return this.normalizeStructuredLyrics(structuredLyrics);
    } catch {
      return emptyLyricsResult;
    }
  }

  private async tryLoadLegacyLyrics(
    track: Pick<LyricsTrack, 'artist' | 'title'>,
  ): Promise<LyricsResult> {
    try {
      const lyrics = await this.openSubsonic.getLyricsBySearch(track.artist, track.title);
      const text = lyrics?.value?.trim();

      if (!text) {
        return emptyLyricsResult;
      }

      return {
        kind: 'plain',
        text,
      };
    } catch {
      return emptyLyricsResult;
    }
  }

  private normalizeStructuredLyrics(lyrics: readonly StructuredLyrics[]): LyricsResult {
    const entries = lyrics
      .map((entry) => ({
        language: entry.lang,
        synced: entry.synced,
        lines: (entry.line ?? [])
          .map((line) => line.value?.trim() ?? '')
          .filter((line) => line.length > 0),
      }))
      .filter((entry) => entry.lines.length > 0);

    if (entries.length === 0) {
      return emptyLyricsResult;
    }

    return {
      kind: 'structured',
      entries,
    };
  }
}
