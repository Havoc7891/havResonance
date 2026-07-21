import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { AudioPlayerService } from './core/audio/audio-player.service';
import { PlayerBar } from './shared/player-bar/player-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PlayerBar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly title = inject(Title);
  private readonly player = inject(AudioPlayerService);

  constructor() {
    effect(() => {
      const track = this.player.currentTrack();

      if (!track) {
        this.title.setTitle('havResonance');

        return;
      }

      const artist = track.artist.trim();
      const trackTitle = artist ? `${artist} - ${track.title}` : track.title;

      this.title.setTitle(`havResonance | ${trackTitle}`);
    });
  }
}
