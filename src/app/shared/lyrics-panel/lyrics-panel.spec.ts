import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LyricsService } from '../../core/lyrics/lyrics.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { LyricsPanel } from './lyrics-panel';

describe('LyricsPanel', () => {
  let component: LyricsPanel;
  let fixture: ComponentFixture<LyricsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LyricsPanel],
      providers: [
        ...provideTranslateTesting(),
        {
          provide: LyricsService,
          useValue: {
            getLyrics: vi.fn().mockResolvedValue({
              kind: 'empty',
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LyricsPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
