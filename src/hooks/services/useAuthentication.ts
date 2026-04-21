import { useMutation, useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

export const useCurrentUser = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => request('/system/user/', { method: 'GET' }),
    enabled,
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: (params: { username: string; password: string; rememberMe?: boolean }) =>
      request('/login', { method: 'POST', data: params }),
  });
};