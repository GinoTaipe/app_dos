import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, firstValueFrom, shareReplay } from 'rxjs';
import { PokedexFilter } from '../interfaces/pokedex-filter.interface';
import { Pokemon } from '../interfaces/pokemon.interface';
import { PokemonListItem } from '../interfaces/pokemon-list-item.interface';
import { PokemonTypeItem } from '../interfaces/pokemon-type.interface';

const API = 'https://pokeapi.co/api/v2';
const SPRITES_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const EXCLUDED_TYPES = new Set(['unknown', 'shadow']);
export const PAGE_SIZE = 24;

/** Colores oficiales por tipo de Pokémon (para insignias). */
export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

function extractId(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

@Injectable({ providedIn: 'root' })
export class PokeapiService {
  private readonly http = inject(HttpClient);
  private readonly queryInput$ = new Subject<string>();

  /** Listado completo de la PokéAPI (una sola petición, cacheada en signal). */
  readonly list = signal<PokemonListItem[]>([]);
  readonly types = signal<PokemonTypeItem[]>([]);
  readonly filter = signal<PokedexFilter>({ query: '', tipo: null, pagina: 1 });
  readonly listLoading = signal(false);
  readonly listLoaded = signal(false);
  readonly tipoLoading = signal(false);

  /** Nombres del tipo activo; null mientras no hay filtro de tipo. */
  private readonly activeTypeMembers = signal<Set<string> | null>(null);
  private readonly typeMembersCache = new Map<string, Set<string>>();
  private readonly detailCache = new Map<number, Observable<Pokemon>>();

  constructor() {
    this.queryInput$
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((query) => this.patch({ query, pagina: 1 }));
  }

  /** Resultados tras aplicar búsqueda y filtro de tipo. */
  readonly results = computed(() => {
    const { query, tipo } = this.filter();
    const q = query.trim().toLowerCase();
    let list = this.list();
    if (q) {
      list = list.filter((p) => p.name.includes(q) || String(p.id).startsWith(q));
    }
    if (tipo) {
      const members = this.activeTypeMembers();
      list = members ? list.filter((p) => members.has(p.name)) : [];
    }
    return list;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.results().length / PAGE_SIZE)));
  readonly page = computed(() => this.filter().pagina);
  readonly hasActiveFilters = computed(
    () => this.filter().query.trim() !== '' || this.filter().tipo !== null,
  );

  readonly pageItems = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.results().slice(start, start + PAGE_SIZE);
  });

  /** Carga listado de Pokémon y tipos. Idempotente. */
  async load(): Promise<void> {
    if (this.listLoaded() || this.listLoading()) {
      return;
    }
    this.listLoading.set(true);
    try {
      const [listRes, typeRes] = await Promise.all([
        firstValueFrom(
          this.http.get<{ results: { name: string; url: string }[] }>(`${API}/pokemon?limit=1025`),
        ),
        firstValueFrom(this.http.get<{ results: PokemonTypeItem[] }>(`${API}/type`)),
      ]);
      this.list.set(listRes.results.map((p) => ({ ...p, id: extractId(p.url) })));
      this.types.set(typeRes.results.filter((t) => !EXCLUDED_TYPES.has(t.name)));
      this.listLoaded.set(true);
    } finally {
      this.listLoading.set(false);
    }
  }

  /** Búsqueda con debounce de 300ms; resetea la página. */
  setQuery(query: string): void {
    this.queryInput$.next(query);
  }

  /** Filtra por tipo (carga y cachea los miembros del tipo bajo demanda). */
  async setTipo(tipo: string | null): Promise<void> {
    this.patch({ tipo, pagina: 1 });
    if (!tipo) {
      this.activeTypeMembers.set(null);
      return;
    }
    let members = this.typeMembersCache.get(tipo);
    if (!members) {
      this.tipoLoading.set(true);
      try {
        const res = await firstValueFrom(
          this.http.get<{ pokemon: { pokemon: { name: string; url: string } }[] }>(
            `${API}/type/${tipo}`,
          ),
        );
        members = new Set(res.pokemon.map((p) => p.pokemon.name));
        this.typeMembersCache.set(tipo, members);
      } finally {
        this.tipoLoading.set(false);
      }
    }
    if (this.filter().tipo === tipo) {
      this.activeTypeMembers.set(members);
    }
  }

  /** Cambia de página, limitada a [1, totalPages]. */
  setPagina(pagina: number): void {
    this.patch({ pagina: Math.min(Math.max(1, pagina), this.totalPages()) });
  }

  clearFilters(): void {
    this.queryInput$.next('');
    this.activeTypeMembers.set(null);
    this.filter.update((f) => ({ ...f, query: '', tipo: null, pagina: 1 }));
  }

  /** Detalle de un Pokémon; cacheado (compartido entre tarjeta y modal). */
  detail$(id: number): Observable<Pokemon> {
    let detail$ = this.detailCache.get(id);
    if (!detail$) {
      detail$ = this.http
        .get<Pokemon>(`${API}/pokemon/${id}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.detailCache.set(id, detail$);
    }
    return detail$;
  }

  /** URL del arte oficial; con detalle usa la de la API, sin él usa la ruta derivada. */
  spriteUrl(id: number, detail: Pokemon | null): string {
    return (
      detail?.sprites.other?.['official-artwork']?.front_default ??
      detail?.sprites.front_default ??
      `${SPRITES_BASE}/${id}.png`
    );
  }

  typeColor(name: string): string {
    return TYPE_COLORS[name] ?? '#777777';
  }

  private patch(partial: Partial<PokedexFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
  }
}
