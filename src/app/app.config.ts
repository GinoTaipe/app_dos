import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // desde Angular 22 provideClientHydration() incluye el HTTP transfer cache
    // (evita repetir peticiones entre SSR y cliente); withFetch = backend fetch
    provideClientHydration(),
    provideHttpClient(withFetch()),
  ],
};
