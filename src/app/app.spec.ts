import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AudioPlayerService, PlayerTrack } from './core/audio/audio-player.service';
import { provideTranslateTesting } from './testing/translate-testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), ...provideTranslateTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-player-bar')).not.toBeNull();
  });

  it('should show the current song title in the document title', async () => {
    const fixture = TestBed.createComponent(App);
    const player = TestBed.inject(AudioPlayerService);
    const title = TestBed.inject(Title);
    const track: PlayerTrack = {
      id: 'track-1',
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      coverArtUrl: null,
      streamUrl: 'https://example.com/track.mp3',
    };

    player.queue.set([track]);
    player.queueIndex.set(0);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(title.getTitle()).toBe('havResonance | Test Artist - Test Song');

    player.queue.set([{ ...track, artist: '   ' }]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(title.getTitle()).toBe('havResonance | Test Song');

    player.queue.set([]);
    player.queueIndex.set(-1);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(title.getTitle()).toBe('havResonance');
  });
});
