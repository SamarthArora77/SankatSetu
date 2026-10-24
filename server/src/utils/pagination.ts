export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta extends Pagination {
  total: number;
  totalPages: number;
}

export function getPagination(query: Record<string, unknown>, defaultLimit = 20, maxLimit = 100): Pagination {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? defaultLimit);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(maxLimit, Math.max(1, Math.floor(rawLimit))) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(total: number, { page, limit, skip }: Pagination): PaginationMeta {
  return {
    page,
    limit,
    skip,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
