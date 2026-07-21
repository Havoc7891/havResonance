import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { PlayerBar } from './player-bar';

describe('PlayerBar', () => {
  let component: PlayerBar;
  let fixture: ComponentFixture<PlayerBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerBar],
      providers: [...provideTranslateTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between elapsed and remaining playback time', () => {
    component.player.currentTime.set(65);
    component.player.duration.set(245);

    expect(component.durationToggleLabelKey()).toBe('player.showRemainingTime');
    expect(component.playbackTimeDisplay()).toBe('1:05');

    component.toggleDurationMode();

    expect(component.durationToggleLabelKey()).toBe('player.showElapsedTime');
    expect(component.playbackTimeDisplay()).toBe('-3:00');
  });
});
