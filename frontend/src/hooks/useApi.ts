import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useApiQuery<T>(key: string[], url: string, options?: { enabled?: boolean }) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const res = await api.get(url);
      return res.data;
    },
    ...options,
  });
}

export function useApiMutation<TData = any, TVariables = any>(
  url: string,
  options?: {
    method?: 'post' | 'put' | 'delete';
    invalidateKeys?: string[][];
    onSuccess?: (data: TData) => void;
    successMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const method = options?.method || 'post';

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (data) => {
      const res = await api[method](url, data as any);
      return res.data;
    },
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message || 'An error occurred';
      toast.error(message);
    },
  });
}
