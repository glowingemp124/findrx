import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";
export type SortState = { columnId: string; direction: SortDirection } | null;

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. Client tables sort by this; server tables send `columnId`. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  /** Header alignment when it differs from the cells, e.g. centered over a checkbox column. */
  headerAlign?: "left" | "center" | "right";
  /** Hide on narrow screens to keep the table readable. */
  hideBelow?: "sm" | "md" | "lg";
  className?: string;
};

export type FilterOption = { value: string; label: string };

export type DataTableFilter = {
  id: string;
  label: string;
  /** The first option is the "all" option, e.g. { value: "", label: "All methods" }. */
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
};

/**
 * Everything the table needs, whatever does the work. `useClientTable` builds it from an array
 * in memory; a server-backed hook can build the same shape from an API response.
 */
export type TableController<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  sort: SortState;
  setSort: (sort: SortState) => void;
  query: string;
  setQuery: (query: string) => void;
  filters: DataTableFilter[];
  loading?: boolean;
};
