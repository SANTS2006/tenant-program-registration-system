import * as React from "react";
import { Outlet, type OutletProps } from "react-router-dom";

/** Shown while a page's code downloads. */
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

/** A layout's page slot: the layout stays on screen while the next page loads. */
export function LazyOutlet(props: OutletProps) {
  return (
    <React.Suspense fallback={<PageLoading />}>
      <Outlet {...props} />
    </React.Suspense>
  );
}
