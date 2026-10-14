import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, distinctUntilChanged, switchMap } from 'rxjs';
import { Pokemon } from '../../interfaces/pokemon.interface';
import { PokemonListItem } from '../../interfaces/pokemon-list-item.interface';
import { PokeapiService } from '../../services/pokeapi.service';

@Component({
  selector: 'app-pokemon-card',
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.css',
})
export class PokemonCard {
  readonly item = input.required<PokemonListItem>();

  private readonly pokeapi = inject(PokeapiService);

  private readonly detail$: Observable<Pokemon | null> = toObservable(this.item).pipe(
    distinctUntilChanged((prev, curr) => prev.id === curr.id),
    switchMap((item) => this.pokeapi.detail$(item.id)),
  );

  readonly detail = toSignal(this.detail$, { initialValue: null as Pokemon | null });

  readonly displayName = computed(() => this.item().name.replace(/-/g, ' '));
  readonly displayNumber = computed(() => `#${String(this.item().id).padStart(3, '0')}`);
  readonly spriteUrl = computed(() => this.pokeapi.spriteUrl(this.item().id, this.detail()));

  protected typeColor(name: string): string {
    return this.pokeapi.typeColor(name);
  }
}
