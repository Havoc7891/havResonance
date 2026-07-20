import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerBar } from './shared/player-bar/player-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PlayerBar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
