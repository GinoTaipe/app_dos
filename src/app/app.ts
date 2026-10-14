import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Pokedex } from './components/pokedex/pokedex';

@Component({
  imports: [RouterOutlet, Pokedex],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
