import { useQuery } from '@tanstack/react-query';

export function useCreditsBalance(enabled: boolean) {
  return useQuery({
    queryKey: ['creditsBalance'],
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/credits', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (data?.success && data?.data && typeof data.data.balance === 'number') {
        return data.data.balance as number;
      }
      return null;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

