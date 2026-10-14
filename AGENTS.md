# AGENTS.md

Single-package Angular 22.2.2 app (project name `app_dos`) with SSR. Fresh CLI scaffold — not a monorepo. Use **npm** (`packageManager: npm@12.0.2`); `ng` is not global, so prefix with `npx` or use the npm scripts.

## Commands (verified)

- Dev server: `npm start` (alias `ng serve`) → http://localhost:4200, hot reload
- Build: `npm run build` — **this is also the only typecheck** (AOT compiles and type-checks templates; there is no separate `typecheck` or `lint` script)
- Tests (Vitest, not Karma): `npx ng test --watch=false` — watch defaults to *on* in a TTY, so always pass `--watch=false` for one-shot runs
  - Single file: `npx ng test --include src/app/app.spec.ts --watch=false`
  - Single suite/case by name: `npx ng test --filter "^App"`
- Format: `npx prettier --write .` (check: `--check .`). No format/lint npm script exists.

There is **no linter** (no ESLint config) and **no e2e framework** installed, despite README mentioning `ng e2e` — don't run or add expectations for it.

## Gotchas

- `npx prettier --check .` fails on ~22 files out of the box: the generated scaffold is not Prettier-formatted even though `.prettierrc` exists. Pre-existing failures ≠ your regression.
- Production build enforces budgets (`angular.json`): initial bundle warn 500kB / error 1MB, **component CSS warn 4kB / error 8kB** — oversized `styleUrl` CSS fails the build.
- Prettier: printWidth 100, single quotes, `*.html` uses the Angular parser (see `.prettierrc`).
- Angular 22 API quirks (costaron errores de compilación reales):
  - `withHttpTransferCache` **no es export público** en v22; el HTTP transfer cache viene **activado por defecto con `provideClientHydration()`**. Configurarlo con `withHttpTransferCacheOptions` / `withNoHttpTransferCache` desde `@angular/platform-browser`.
  - `takeUntilDestroyed` se importa de `@angular/core/rxjs-interop`, **no** de `rxjs`.
  - `HttpTestingController.match()/expectOne()` ya **no aceptan `RegExp`**: usar string exacto o predicado `(req) => req.url.includes(...)`.

## Estructura requerida (convención obligatoria del proyecto)

- Patrón **componente – servicio**: cada componente tiene su servicio asociado; la lógica y el acceso a datos viven en el servicio, no en el componente. Componentes en `src/app/components/<nombre>/`, servicios en `src/app/services/<nombre>.service.ts`.
- **Interfaces** en su propia carpeta: `src/app/interfaces/<nombre>.interface.ts` (una por archivo).
- El HTML del componente **siempre separado del TS**: usar `templateUrl: './<nombre>.html'` (y `styleUrl`), nunca `template` inline. El componente raíz `App` ya cumple (`src/app/app.ts` + `src/app/app.html`).
- Nuevos archivos deben respetar Prettier (`.prettierrc`), aunque el scaffold aún no lo haga.

## Architecture / layout

- Browser entry: `src/main.ts` → `src/app/app.config.ts` (router + client hydration) → `src/app/app.ts`
- La pantalla real es la Pokédex: `src/app/components/pokedex/` (grid + búsqueda con debounce + filtro por tipo + paginación de 24 + modal `pokemon-detail`), con `pokemon-card/` reutilizable. Datos en `src/app/services/pokeapi.service.ts` contra `https://pokeapi.co/api/v2` (listado `/pokemon?limit=1025` cacheado en signal; detalles de tarjeta se traen bajo demanda y se cachean).
- SSR entry: `src/main.server.ts` → `src/app/app.config.server.ts`; Express server in `src/server.ts` (`outputMode: "server"`). Add REST endpoints in `src/server.ts` (commented example is there).
- Routes: `src/app/app.routes.ts` (currently empty) + `src/app/app.routes.server.ts` for server routes.
- Build output: `dist/app_dos/{browser,server}`. Run the production SSR bundle with `npm run serve:ssr:app_dos` (port `PORT` env or 4000).
- Components are standalone with `imports: [...]` in the `@Component` decorator (no `standalone: true`). File naming drops the `.component` suffix (`app.ts` / `app.html` / `app.css`); selector prefix is `app`.
- Tests use Vitest globals (`tsconfig.spec.json` → `"types": ["vitest/globals"]`) in jsdom — `describe`/`it`/`expect` need no imports. Specs live next to sources as `*.spec.ts` (excluded from `tsconfig.app.json`).
- Template conventions in use: signals for state, built-in control flow (`@for`/`@if`), not `*ngFor`.

`README.md` is the stock Angular CLI doc; trust this file and the config/scripts over it.
