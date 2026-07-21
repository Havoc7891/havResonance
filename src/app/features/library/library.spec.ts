import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OpenSubsonicClientService } from '../../core/open-subsonic/open-subsonic-client.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { Library } from './library';

describe('Library', () => {
  let component: Library;
  let fixture: ComponentFixture<Library>;
  let openSubsonic: {
    readonly createRequestUrl: ReturnType<typeof vi.fn>;
    readonly getAlbum: ReturnType<typeof vi.fn>;
    readonly getNewestAlbums: ReturnType<typeof vi.fn>;
    readonly searchAlbums: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    openSubsonic = {
      createRequestUrl: vi.fn().mockResolvedValue('cover-art-url'),
      getAlbum: vi.fn(),
      getNewestAlbums: vi.fn().mockResolvedValue([]),
      searchAlbums: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [Library],
      providers: [
        provideRouter([]),
        ...provideTranslateTesting(),
        {
          provide: OpenSubsonicClientService,
          useValue: openSubsonic,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Library);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search albums after the debounce delay', async () => {
    vi.useFakeTimers();

    openSubsonic.searchAlbums.mockResolvedValue([
      {
        id: 'album-id',
        name: 'Search Album',
        artist: 'Search Artist',
      },
    ]);

    const input = document.createElement('input');
    input.value = 'search';

    component.searchChanged({ target: input } as unknown as Event);

    expect(openSubsonic.searchAlbums).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    await fixture.whenStable();

    expect(openSubsonic.searchAlbums).toHaveBeenCalledWith('search');
    expect(component.albums()).toEqual([
      {
        album: {
          id: 'album-id',
          name: 'Search Album',
          artist: 'Search Artist',
        },
        coverArtUrl: null,
      },
    ]);
  });

  it('should sort loaded albums and restore the recently added order', async () => {
    openSubsonic.getNewestAlbums.mockResolvedValue([
      {
        id: 'beta',
        name: 'Beta',
        artist: 'B Artist',
      },
      {
        id: 'alpha',
        name: 'Alpha',
        artist: 'C Artist',
      },
      {
        id: 'gamma',
        name: 'Gamma',
        artist: 'A Artist',
      },
    ]);

    await component.reload();

    const albumIds = () => component.albums().map((item) => item.album.id);
    const changeSort = (value: string) => {
      component.sortChanged({ target: { value } } as unknown as Event);
    };

    expect(albumIds()).toEqual(['beta', 'alpha', 'gamma']);

    changeSort('titleAsc');

    expect(albumIds()).toEqual(['alpha', 'beta', 'gamma']);

    changeSort('artistDesc');

    expect(albumIds()).toEqual(['alpha', 'beta', 'gamma']);

    changeSort('recentlyAdded');

    expect(albumIds()).toEqual(['beta', 'alpha', 'gamma']);
  });
});
