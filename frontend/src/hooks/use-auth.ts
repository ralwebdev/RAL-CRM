import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AuthLoginResponse } from "@/lib/types";

interface LoginPayload {
  email: string;
  password: string;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<AuthLoginResponse>("/api/auth/login", payload);
      return data;
    },
  });
}

