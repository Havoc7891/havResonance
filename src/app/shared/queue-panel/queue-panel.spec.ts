import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { QueuePanel } from './queue-panel';

describe('QueuePanel', () => {
  let component: QueuePanel;
  let fixture: ComponentFixture<QueuePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueuePanel],
      providers: [...provideTranslateTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(QueuePanel);
    fixture.componentRef.setInput('open', false);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
