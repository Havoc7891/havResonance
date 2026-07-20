import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConnectionStateService } from '../../core/connection/connection-state.service';
import { OpenSubsonicClientService } from '../../core/open-subsonic/open-subsonic-client.service';
import { LanguageSwitcher } from '../../shared/language-switcher/language-switcher';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

type ConnectionMode = 'direct' | 'proxy';

@Component({
  selector: 'app-connection',
  imports: [FormsModule, RouterLink, TranslatePipe, LanguageSwitcher, ThemeToggle],
  templateUrl: './connection.html',
  styleUrl: './connection.css',
})
export class Connection {
  private static readonly defaultProxyUrl = '/api/opensubsonic';
  private static readonly defaultServerUrlExample = 'https://music.example.com';

  private readonly connectionState = inject(ConnectionStateService);
  private readonly openSubsonic = inject(OpenSubsonicClientService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  private readonly connectionFailedMessage = toSignal(
    this.translate.stream('errors.connectionFailed'),
    {
      initialValue: 'The connection failed.',
    },
  );

  private readonly browserRequestBlockedMessage = toSignal(
    this.translate.stream('errors.browserRequestBlocked'),
    {
      initialValue:
        'The browser could not reach this server. If the URL is correct, the server may be blocking browser requests with CORS.',
    },
  );

  public mode: ConnectionMode = 'direct';
  public serverUrl: string = '';
  public username: string = '';
  public password: string = '';

  public readonly connecting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  public selectMode(mode: ConnectionMode): void {
    this.mode = mode;

    this.errorMessage.set(null);

    if (mode === 'proxy' && this.shouldUseDefaultProxy()) {
      this.serverUrl = Connection.defaultProxyUrl;
    }

    if (mode === 'direct' && this.serverUrl.trim() === Connection.defaultProxyUrl) {
      this.serverUrl = '';
    }
  }

  public serverUrlLabelKey(): string {
    return this.mode === 'proxy' ? 'connection.proxyUrl' : 'connection.serverUrl';
  }

  public serverUrlPlaceholder(): string {
    return this.mode === 'proxy' ? Connection.defaultProxyUrl : Connection.defaultServerUrlExample;
  }

  public async connect(): Promise<void> {
    if (!this.connectionReady()) {
      return;
    }

    const serverUrl = this.serverUrl.trim();

    this.connecting.set(true);

    this.errorMessage.set(null);

    try {
      const username = this.username.trim();

      this.openSubsonic.configure(serverUrl, username, this.password);

      const server = await this.openSubsonic.ping();

      this.connectionState.save({
        serverUrl,
        username,
        password: this.password,
        serverName: server.type,
        serverVersion: server.serverVersion,
        openSubsonic: server.openSubsonic,
      });

      await this.router.navigate(['/library']);
    } catch (error: unknown) {
      this.openSubsonic.clearConfiguration();

      this.errorMessage.set(this.getConnectionErrorMessage(error));
    } finally {
      this.connecting.set(false);
    }
  }

  public connectionReady(): boolean {
    return Boolean(this.serverUrl.trim() && this.username.trim() && this.password);
  }

  private getConnectionErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.browserRequestBlockedMessage();
    }

    return error instanceof Error ? error.message : this.connectionFailedMessage();
  }

  private shouldUseDefaultProxy(): boolean {
    const serverUrl = this.serverUrl.trim();

    return !serverUrl;
  }
}
