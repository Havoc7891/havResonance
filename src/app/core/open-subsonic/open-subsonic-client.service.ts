import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { createAuthenticationParameters } from './open-subsonic-auth';
import {
  AlbumList2Payload,
  GetAlbumPayload,
  LegacyLyrics,
  LyricsBySongIdPayload,
  LyricsPayload,
  OpenSubsonicExtension,
  OpenSubsonicExtensionsPayload,
  SearchResult2Payload,
  SearchResult3Payload,
  StructuredLyrics,
  SubsonicAlbum,
  SubsonicAlbumDetails,
  SubsonicResponse,
} from './open-subsonic.models';

@Injectable({
  providedIn: 'root',
})
export class OpenSubsonicClientService {
  private baseUrl = '';
  private username = '';
  private password = '';
  private configurationVersion = 0;

  private readonly http = inject(HttpClient);

  public configure(baseUrl: string, username: string, password: string): void {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.username = username;
    this.password = password;
    this.configurationVersion++;
  }

  public clearConfiguration(): void {
    this.baseUrl = '';
    this.username = '';
    this.password = '';
    this.configurationVersion++;
  }

  public getConfigurationVersion(): number {
    return this.configurationVersion;
  }

  public async ping(): Promise<SubsonicResponse> {
    return this.get('ping');
  }

  public async getNewestAlbums(): Promise<readonly SubsonicAlbum[]> {
    const response = await this.get<AlbumList2Payload>('getAlbumList2', {
      type: 'newest',
      size: 50,
    });

    return response.albumList2?.album ?? [];
  }

  public async getAlbum(albumId: string): Promise<SubsonicAlbumDetails> {
    const response = await this.get<GetAlbumPayload>('getAlbum', {
      id: albumId,
    });

    if (!response.album) {
      throw new Error('The server returned no album information.');
    }

    return response.album;
  }

  public async searchAlbums(query: string): Promise<readonly SubsonicAlbum[]> {
    const parameters = {
      query,
      albumCount: 100,
      artistCount: 1,
      songCount: 1,
    };

    try {
      const response = await this.get<SearchResult3Payload>('search3', parameters);

      return response.searchResult3?.album ?? [];
    } catch {
      const response = await this.get<SearchResult2Payload>('search2', parameters);

      return response.searchResult2?.album ?? [];
    }
  }

  public async getOpenSubsonicExtensions(): Promise<readonly OpenSubsonicExtension[]> {
    const response = await this.get<OpenSubsonicExtensionsPayload>('getOpenSubsonicExtensions');

    return response.openSubsonicExtensions ?? [];
  }

  public async getLyricsBySongId(songId: string): Promise<readonly StructuredLyrics[]> {
    const response = await this.get<LyricsBySongIdPayload>('getLyricsBySongId', {
      id: songId,
    });

    return response.lyricsList?.structuredLyrics ?? [];
  }

  public async getLyricsBySearch(artist: string, title: string): Promise<LegacyLyrics | null> {
    const response = await this.get<LyricsPayload>('getLyrics', {
      artist,
      title,
    });

    return response.lyrics ?? null;
  }

  public async get<T extends object>(
    endpoint: string,
    parameters: Record<string, string | number> = {},
  ): Promise<SubsonicResponse<T> & T> {
    this.ensureConfigured();

    const authentication = await createAuthenticationParameters({
      username: this.username,
      password: this.password,
    });

    let params = new HttpParams();

    for (const [key, value] of Object.entries({
      ...authentication,
      ...parameters,
    })) {
      params = params.set(key, String(value));
    }

    const response = await firstValueFrom(
      this.http.get<unknown>(`${this.baseUrl}/rest/${endpoint}.view`, { params }),
    );

    const body = this.extractSubsonicResponse<T>(response, endpoint);

    if (body.status === 'failed') {
      throw new Error(
        body.error?.message ?? `OpenSubsonic request failed with code ${body.error?.code ?? 0}.`,
      );
    }

    return body;
  }

  public async createRequestUrl(
    endpoint: string,
    parameters: Record<string, string | number> = {},
  ): Promise<string> {
    this.ensureConfigured();

    const authentication = await createAuthenticationParameters({
      username: this.username,
      password: this.password,
    });

    const search = new URLSearchParams();

    for (const [key, value] of Object.entries({
      ...authentication,
      ...parameters,
    })) {
      search.set(key, String(value));
    }

    return `${this.baseUrl}/rest/${endpoint}.view?${search.toString()}`;
  }

  private ensureConfigured(): void {
    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error('The OpenSubsonic client has not been configured.');
    }
  }

  private extractSubsonicResponse<T extends object>(
    response: unknown,
    endpoint: string,
  ): SubsonicResponse<T> & T {
    if (!this.isRecord(response)) {
      throw new Error(`The server returned an unexpected response for ${endpoint}.`);
    }

    const body = response['subsonic-response'];

    if (!this.isSubsonicResponse<T>(body)) {
      throw new Error(`The server returned an unexpected response for ${endpoint}.`);
    }

    return body;
  }

  private isSubsonicResponse<T extends object>(body: unknown): body is SubsonicResponse<T> & T {
    if (!this.isRecord(body)) {
      return false;
    }

    return body['status'] === 'ok' || body['status'] === 'failed';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
