import { ApplicationConfig, Injectable, provideZoneChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, provideRouter, RouteReuseStrategy } from '@angular/router';

import { routes } from './app.routes';

// pages read their :code/:id once from the snapshot; recreate the page when params change
// (e.g. /probation/view/012 → /probation/view/0009) instead of reusing a stale instance
@Injectable()
class ParamAwareReuse extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot) {
    return future.routeConfig === curr.routeConfig && JSON.stringify(future.params) === JSON.stringify(curr.params);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: ParamAwareReuse },
  ]
};
