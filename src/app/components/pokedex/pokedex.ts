import { Component, inject, signal } from '@angular/core';
import { PokeapiService } from '../../services/pokeapi.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { PokemonDetail } from '../pokemon-detail/pokemon-detail';

@Component({
  selector: 'app-pokedex',
  templateUrl: './pokedex.html',
  styleUrl: './pokedex.css',
  imports: [PokemonCard, PokemonDetail],
})
export class Pokedex {
  protected readonly pokeapi = inject(PokeapiService);
  protected readonly selectedId = signal<number | null>(null);

  constructor() {
    void this.pokeapi.load();
  }

  protected onSearch(event: Event): void {
    this.pokeapi.setQuery((event.target as HTMLInputElement).value);
  }

  protected onTipoChange(event: Event): void {
    void this.pokeapi.setTipo((event.target as HTMLSelectElement).value || null);
  }

  protected clear(): void {
    this.pokeapi.clearFilters();
  }

  protected openDetail(id: number): void {
    this.selectedId.set(id);
  }
}
