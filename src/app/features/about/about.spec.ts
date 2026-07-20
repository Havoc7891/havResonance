import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConnectionStateService } from '../../core/connection/connection-state.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { About } from './about';

describe('About', () => {
  let component: About;
  let fixture: ComponentFixture<About>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        provideRouter([]),
        ...provideTranslateTesting(),
        {
          provide: ConnectionStateService,
          useValue: {
            connected: vi.fn().mockReturnValue(false),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
