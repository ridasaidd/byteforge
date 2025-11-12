import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Generic CRUD Hook for API Resources
 *
 * Provides common CRUD operations with React Query:
 * - List with pagination and search
 * - Create
 * - Update
 * - Delete
 *
 * @example
 * ```tsx
 * const tenants = useCrud<Tenant>({
 *   resource: 'tenants',
 *   apiService: api.tenants,
 * });
 *
 * // Use in component
 * const { data, isLoading } = tenants.list;
 * tenants.create.mutate({ name: 'New Tenant' });
 * tenants.update.mutate({ id: '1', data: { name: 'Updated' } });
 * tenants.delete.mutate('1');
 * ```
 */

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ApiService<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  list: (params: ListParams) => Promise<PaginatedResponse<T>>;
  get: (id: string | number) => Promise<T | { data: T }>;
  create: (data: CreateData) => Promise<{ data: T }>;
  update: (id: string | number, data: UpdateData) => Promise<{ data: T }>;
  delete: (id: string | number) => Promise<void | { message: string }>;
}

export interface UseCrudOptions<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  resource: string;
  apiService: ApiService<T, CreateData, UpdateData>;
  queryOptions?: Omit<UseQueryOptions<PaginatedResponse<T>>, 'queryKey' | 'queryFn'>;
  /**
   * Additional query keys to invalidate after mutations
   * Example: ['activity'] will invalidate activity logs after user CRUD operations
   */
  invalidateRelated?: string[];
}

export interface UseCrudReturn<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  // List query
  list: {
    data: PaginatedResponse<T> | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };

  // Pagination state
  pagination: {
    page: number;
    setPage: (page: number) => void;
    search: string;
    setSearch: (search: string) => void;
  };

  // Mutations
  create: {
    mutate: (data: CreateData) => void;
    mutateAsync: (data: CreateData) => Promise<unknown>;
    isPending: boolean;
    error: Error | null;
  };

  update: {
    mutate: (params: { id: string | number; data: UpdateData }) => void;
    mutateAsync: (params: { id: string | number; data: UpdateData }) => Promise<unknown>;
    isPending: boolean;
    error: Error | null;
  };

  delete: {
    mutate: (id: string | number) => void;
    mutateAsync: (id: string | number) => Promise<unknown>;
    isPending: boolean;
    error: Error | null;
  };
}

export function useCrud<T, CreateData = Partial<T>, UpdateData = Partial<T>>({
  resource,
  apiService,
  queryOptions,
  invalidateRelated = [],
}: UseCrudOptions<T, CreateData, UpdateData>): UseCrudReturn<T, CreateData, UpdateData> {
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // List query
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<T>>({
    queryKey: [resource, page, search],
    queryFn: () => apiService.list({ page, per_page: 10, search }),
    ...queryOptions,
  });

  // Helper to invalidate resource and related queries
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: [resource] });
    invalidateRelated.forEach((relatedResource) => {
      queryClient.invalidateQueries({ queryKey: [relatedResource] });
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateData) => apiService.create(data),
    onSuccess: invalidateQueries,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateData }) =>
      apiService.update(id, data),
    onSuccess: invalidateQueries,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => apiService.delete(id),
    onSuccess: invalidateQueries,
  });

  return {
    list: {
      data,
      isLoading,
      error: error as Error | null,
      refetch,
    },
    pagination: {
      page,
      setPage,
      search,
      setSearch,
    },
    create: {
      mutate: createMutation.mutate,
      mutateAsync: createMutation.mutateAsync,
      isPending: createMutation.isPending,
      error: createMutation.error as Error | null,
    },
    update: {
      mutate: updateMutation.mutate,
      mutateAsync: updateMutation.mutateAsync,
      isPending: updateMutation.isPending,
      error: updateMutation.error as Error | null,
    },
    delete: {
      mutate: deleteMutation.mutate,
      mutateAsync: deleteMutation.mutateAsync,
      isPending: deleteMutation.isPending,
      error: deleteMutation.error as Error | null,
    },
  };
}
