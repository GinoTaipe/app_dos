import { Component, HostListener, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, distinctUntilChanged, switchMap } from 'rxjs';
import { Pokemon } from '../../interfaces/pokemon.interface';
import { PokeapiService } from '../../services/pokeapi.service';

const STAT_LABELS: Record<string, string> = {
  hp: 'Salud',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Especial',
  'special-defense': 'Def. Especial',
  speed: 'Velocidad',
};

@Component({
  selector: 'app-pokemon-detail',
  templateUrl: './pokemon-detail.html',
  styleUrl: './pokemon-detail.css',
})
export class PokemonDetail {
  readonly pokemonId = input.required<number>();
  readonly close = output<void>();

  private readonly pokeapi = inject(PokeapiService);

  private readonly detail$: Observable<Pokemon | null> = toObservable(this.pokemonId).pipe(
    distinctUntilChanged(),
    switchMap((id) => this.pokeapi.detail$(id)),
  );

  readonly detail = toSignal(this.detail$, { initialValue: null as Pokemon | null });

  readonly displayName = computed(() => (this.detail()?.name ?? '').replace(/-/g, ' '));
  readonly displayNumber = computed(
    () => `#${String(this.detail()?.id ?? this.pokemonId()).padStart(3, '0')}`,
  );
  readonly spriteUrl = computed(() => this.pokeapi.spriteUrl(this.pokemonId(), this.detail()));
  readonly statBars = computed(() =>
    (this.detail()?.stats ?? []).map((s) => ({
      label: STAT_LABELS[s.stat.name] ?? s.stat.name,
      value: s.base_stat,
      percent: Math.min(100, (s.base_stat / 255) * 100),
    })),
  );
  readonly heightLabel = computed(() => {
    const h = this.detail()?.height;
    return h != null ? `${(h / 10).toFixed(1)} m` : '';
  });
  readonly weightLabel = computed(() => {
    const w = this.detail()?.weight;
    return w != null ? `${(w / 10).toFixed(1)} kg` : '';
  });

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  protected typeColor(name: string): string {
    return this.pokeapi.typeColor(name);
  }
}
