export interface SubsonicError {
  readonly code: number;
  readonly message?: string;
}

export interface SubsonicResponse<T extends object = object> {
  readonly status: 'ok' | 'failed';
  readonly version: string;
  readonly type?: string;
  readonly serverVersion?: string;
  readonly openSubsonic?: boolean;
  readonly error?: SubsonicError;
}

export interface SubsonicEnvelope<T extends object = object> {
  readonly 'subsonic-response': SubsonicResponse<T> & T;
}

export interface SubsonicAlbum {
  readonly id: string;
  readonly name?: string;
  readonly album?: string;
  readonly artist?: string;
  readonly artistId?: string;
  readonly coverArt?: string;
  readonly songCount?: number;
  readonly duration?: number;
  readonly year?: number;
  readonly genre?: string;
  readonly created?: string;
  readonly starred?: string;
  readonly played?: string;
}

export interface SubsonicSong {
  readonly id: string;
  readonly parent?: string;
  readonly title?: string;
  readonly album?: string;
  readonly albumId?: string;
  readonly artist?: string;
  readonly artistId?: string;
  readonly track?: number;
  readonly discNumber?: number;
  readonly duration?: number;
  readonly coverArt?: string;
  readonly contentType?: string;
  readonly suffix?: string;
  readonly size?: number;
  readonly year?: number;
  readonly genre?: string;
  readonly starred?: string;
}

export interface SubsonicAlbumDetails extends SubsonicAlbum {
  readonly song?: readonly SubsonicSong[];
}

export interface AlbumList2Payload {
  readonly albumList2?: {
    readonly album?: readonly SubsonicAlbum[];
  };
}

export interface GetAlbumPayload {
  readonly album?: SubsonicAlbumDetails;
}

export interface SearchResult2Payload {
  readonly searchResult2?: {
    readonly album?: readonly SubsonicAlbum[];
  };
}

export interface SearchResult3Payload {
  readonly searchResult3?: {
    readonly album?: readonly SubsonicAlbum[];
  };
}

export interface OpenSubsonicExtension {
  readonly name: string;
  readonly versions?: readonly number[];
}

export interface OpenSubsonicExtensionsPayload {
  readonly openSubsonicExtensions?: readonly OpenSubsonicExtension[];
}

export interface StructuredLyricsLine {
  readonly value?: string;
  readonly start?: number;
}

export interface StructuredLyrics {
  readonly lang?: string;
  readonly synced?: boolean;
  readonly line?: readonly StructuredLyricsLine[];
}

export interface LyricsBySongIdPayload {
  readonly lyricsList?: {
    readonly structuredLyrics?: readonly StructuredLyrics[];
  };
}

export interface LegacyLyrics {
  readonly artist?: string;
  readonly title?: string;
  readonly value?: string;
}

export interface LyricsPayload {
  readonly lyrics?: LegacyLyrics;
}
