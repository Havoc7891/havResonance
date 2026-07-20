import { computed, inject, Injectable, signal } from '@angular/core';
import { OpenSubsonicClientService } from '../open-subsonic/open-subsonic-client.service';

export interface SavedConnection {
  readonly serverUrl: string;
  readonly username: string;
  readonly password: string;
  readonly serverName?: string;
  readonly serverVersion?: string;
  readonly openSubsonic?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ConnectionStateService {
  private static readonly storageKey = 'havResonance.connection';

  public readonly connected = signal<boolean>(false);
  public readonly connection = signal<SavedConnection | null>(null);

  public readonly connectionDisplayName = computed(() => {
    const connection = this.connection();

    if (!connection) {
      return '';
    }

    return connection.serverName || connection.serverUrl;
  });

  private readonly openSubsonic = inject(OpenSubsonicClientService);

  constructor() {
    this.restore();
  }

  public save(connection: SavedConnection): void {
    const normalizedConnection: SavedConnection = {
      serverUrl: connection.serverUrl.trim().replace(/\/+$/, ''),
      username: connection.username.trim(),
      password: connection.password,
      serverName: connection.serverName?.trim() || undefined,
      serverVersion: connection.serverVersion?.trim() || undefined,
      openSubsonic: connection.openSubsonic,
    };

    sessionStorage.setItem(ConnectionStateService.storageKey, JSON.stringify(normalizedConnection));

    this.configureClient(normalizedConnection);

    this.connection.set(normalizedConnection);

    this.connected.set(true);
  }

  public clear(): void {
    sessionStorage.removeItem(ConnectionStateService.storageKey);

    this.openSubsonic.clearConfiguration();

    this.connection.set(null);

    this.connected.set(false);
  }

  private restore(): void {
    const storedValue = sessionStorage.getItem(ConnectionStateService.storageKey);

    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as Partial<SavedConnection>;

      if (
        typeof parsed.serverUrl !== 'string' ||
        typeof parsed.username !== 'string' ||
        typeof parsed.password !== 'string' ||
        !parsed.serverUrl ||
        !parsed.username ||
        !parsed.password
      ) {
        this.clear();

        return;
      }

      const connection: SavedConnection = {
        serverUrl: parsed.serverUrl,
        username: parsed.username,
        password: parsed.password,
        serverName: typeof parsed.serverName === 'string' ? parsed.serverName : undefined,
        serverVersion: typeof parsed.serverVersion === 'string' ? parsed.serverVersion : undefined,
        openSubsonic: typeof parsed.openSubsonic === 'boolean' ? parsed.openSubsonic : undefined,
      };

      this.configureClient(connection);

      this.connection.set(connection);

      this.connected.set(true);
    } catch {
      this.clear();
    }
  }

  private configureClient(connection: SavedConnection): void {
    this.openSubsonic.configure(connection.serverUrl, connection.username, connection.password);
  }
}
