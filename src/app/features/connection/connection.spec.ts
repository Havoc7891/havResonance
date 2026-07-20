import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ConnectionStateService } from '../../core/connection/connection-state.service';
import { OpenSubsonicClientService } from '../../core/open-subsonic/open-subsonic-client.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { Connection } from './connection';

describe('Connection', () => {
  let component: Connection;
  let fixture: ComponentFixture<Connection>;
  let openSubsonic: {
    readonly clearConfiguration: ReturnType<typeof vi.fn>;
    readonly configure: ReturnType<typeof vi.fn>;
    readonly ping: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    openSubsonic = {
      clearConfiguration: vi.fn(),
      configure: vi.fn(),
      ping: vi.fn().mockResolvedValue({
        status: 'ok',
        version: '1.16.1',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Connection],
      providers: [
        provideRouter([]),
        ...provideTranslateTesting(),
        {
          provide: ConnectionStateService,
          useValue: {
            save: vi.fn(),
          },
        },
        {
          provide: OpenSubsonicClientService,
          useValue: openSubsonic,
        },
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      connection: {
        proxyUrl: 'Proxy URL',
        serverUrl: 'Server URL',
      },
      errors: {
        browserRequestBlocked:
          'The browser could not reach this server. If the URL is correct, the server may be blocking browser requests with CORS.',
      },
    });

    fixture = TestBed.createComponent(Connection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use the local proxy URL when proxy mode is selected', () => {
    component.selectMode('proxy');

    expect(component.serverUrl).toBe('/api/opensubsonic');
    expect(component.serverUrlLabelKey()).toBe('connection.proxyUrl');
  });

  it('should clear the default proxy URL when direct mode is selected again', () => {
    component.selectMode('proxy');
    component.selectMode('direct');

    expect(component.serverUrl).toBe('');
    expect(component.serverUrlLabelKey()).toBe('connection.serverUrl');
  });

  it('should show a browser request message for network-level connection failures', async () => {
    openSubsonic.ping.mockRejectedValue(
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: 'https://music.example.com/rest/ping.view',
      }),
    );

    component.serverUrl = 'https://music.example.com';
    component.username = 'user';
    component.password = 'password';

    await component.connect();

    expect(component.errorMessage()).toBe(
      'The browser could not reach this server. If the URL is correct, the server may be blocking browser requests with CORS.',
    );
    expect(openSubsonic.clearConfiguration).toHaveBeenCalled();
  });
});
