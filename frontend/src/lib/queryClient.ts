import { QueryClient } from "@tanstack/react-query";
import { isLiveQuery, LIVE_REFRESH_MS } from "./liveData";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Tables and lists load new data by themselves; this pauses while the tab is in the background.
      refetchInterval: (query) => (isLiveQuery(query.queryKey) ? LIVE_REFRESH_MS : false),
    },
  },
});
