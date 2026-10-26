export type GoogleLoginRpcClient = {
  rpc: (
    functionName: string,
    params?: Record<string, string>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
