import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { LyricsService } from '../../core/lyrics/lyrics.service';
import { OpenSubsonicClientService } from '../../core/open-subsonic/open-subsonic-client.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

import { Album } from './album';

describe('Album', () => {
  let component: Album;
  let fixture: ComponentFixture<Album>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Album],
      providers: [
        ...provideTranslateTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'album-id' })),
            snapshot: {
              paramMap: convertToParamMap({ id: 'album-id' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockResolvedValue(true),
          },
        },
        {
          provide: OpenSubsonicClientService,
          useValue: {
            createRequestUrl: vi.fn().mockResolvedValue('cover-art-url'),
            getAlbum: vi.fn().mockResolvedValue({
              id: 'album-id',
              name: 'Album',
              song: [],
            }),
          },
        },
        {
          provide: LyricsService,
          useValue: {
            hasLyrics: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Album);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
