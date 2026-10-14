import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PAGE_SIZE, PokeapiService } from './pokeapi.service';

const API = 'https://pokeapi.co/api/v2';

const LIST_RESULTS = [
  { name: 'pikachu', url: `${API}/pokemon/25/` },
  { name: 'charizard', url: `${API}/pokemon/6/` },
  { name: 'charmander', url: `${API}/pokemon/4/` },
  { name: 'bulbasaur', url: `${API}/pokemon/1/` },
];

const TYPES_RESULTS = [
  { name: 'normal', url: `${API}/type/1/` },
  { name: 'fire', url: `${API}/type/10/` },
  { name: 'unknown', url: `${API}/type/10001/` },
  { name: 'shadow', url: `${API}/type/10002/` },
];

const FIRE_MEMBERS = {
  pokemon: [
    { pokemon: { name: 'charizard', url: `${API}/pokemon/6/` } },
    { pokemon: { name: 'charmander', url: `${API}/pokemon/4/` } },
    { pokemon: { name: 'ninetales', url: `${API}/pokemon/38/` } },
  ],
};

/** Espera a que pase el debounce de 300ms de setQuery(). */
const flushDebounce = () => new Promise((resolve) => setTimeout(resolve, 350));

describe('PokeapiService', () => {
  let service: PokeapiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PokeapiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function loadWith(results: { name: string; url: string }[]): Promise<void> {
    const pending = service.load();
    httpMock.expectOne(`${API}/pokemon?limit=1025`).flush({ results });
    httpMock.expectOne(`${API}/type`).flush({ results: TYPES_RESULTS });
    await pending;
  }

  it('loads the list, derives ids and excludes unknown/shadow types', async () => {
    await loadWith(LIST_RESULTS);
    expect(service.list().map((p) => p.id)).toEqual([25, 6, 4, 1]);
    expect(service.types().map((t) => t.name)).toEqual(['normal', 'fire']);
    expect(service.listLoaded()).toBe(true);
  });

  it('searches by name and by number', async () => {
    await loadWith(LIST_RESULTS);

    service.setQuery('char');
    await flushDebounce();
    expect(service.results().map((p) => p.name)).toEqual(['charizard', 'charmander']);

    service.setQuery('25');
    await flushDebounce();
    expect(service.results().map((p) => p.name)).toEqual(['pikachu']);
    expect(service.page()).toBe(1);
  });

  it('intersects the type filter with the search', async () => {
    await loadWith(LIST_RESULTS);

    const pending = service.setTipo('fire');
    httpMock.expectOne(`${API}/type/fire`).flush(FIRE_MEMBERS);
    await pending;
    expect(service.results().map((p) => p.name)).toEqual(['charizard', 'charmander']);

    service.setQuery('bulba');
    await flushDebounce();
    expect(service.results()).toEqual([]);

    await service.setTipo(null);
    expect(service.results().map((p) => p.name)).toEqual(['bulbasaur']);
  });

  it('paginates results and clamps the page', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      name: `pokemon${i + 1}`,
      url: `${API}/pokemon/${i + 1}/`,
    }));
    await loadWith(many);

    expect(service.totalPages()).toBe(2);
    expect(service.pageItems()).toHaveLength(PAGE_SIZE);

    service.setPagina(2);
    expect(service.pageItems()).toHaveLength(6);

    service.setPagina(99);
    expect(service.page()).toBe(2);
  });
});
