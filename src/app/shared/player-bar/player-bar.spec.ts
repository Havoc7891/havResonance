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
});
