import { useMemo, useState } from "react";
import type { DataTableColumn, FilterOption, SortState, TableController } from "@/components/data-table/types";

export type ClientFilter<T> = {
  id: string;
  label: string;
  options: FilterOption[];
  /** Whether a row passes when this value is chosen. Never called for the empty "all" value. */
  matches: (row: T, value: string) => boolean;
};

type Options<T> = {
  columns: DataTableColumn<T>[];
  /** Text a row is searched by. Omit to hide the search box. */
  searchText?: (row: T) => string;
  filters?: ClientFilter<T>[];
  initialSort?: SortState;
  initialPageSize?: number;
};

/** In-memory search, filters, sorting and pagination for `DataTable`. */
export function useClientTable<T>(data: T[], options: Options<T>): TableController<T> & { searchable: boolean } {
  const { columns, searchText, filters = [], initialSort = null, initialPageSize = 10 } = options;
  const [query, setQueryState] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSortState] = useState<SortState>(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let rows = data;
    if (needle && searchText) rows = rows.filter((row) => searchText(row).toLowerCase().includes(needle));
    for (const filter of filters) {
      const value = filterValues[filter.id];
      if (value) rows = rows.filter((row) => filter.matches(row, value));
    }
    const column = sort && columns.find((item) => item.id === sort.columnId);
    if (sort && column?.sortValue) {
      const read = column.sortValue;
      const factor = sort.direction === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const left = read(a);
        const right = read(b);
        return (typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right))) * factor;
      });
    }
    return rows;
    // `filters` and `columns` are rebuilt every render by callers; their behaviour is keyed by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, filterValues, sort, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);

  return {
    rows: filtered.slice((current - 1) * pageSize, current * pageSize),
    total: filtered.length,
    page: current,
    pageSize,
    setPage,
    setPageSize: (size) => {
      setPageSizeState(size);
      setPage(1);
    },
    sort,
    setSort: (next) => {
      setSortState(next);
      setPage(1);
    },
    query,
    setQuery: (next) => {
      setQueryState(next);
      setPage(1);
    },
    searchable: Boolean(searchText),
    filters: filters.map((filter) => ({
      id: filter.id,
      label: filter.label,
      options: filter.options,
      value: filterValues[filter.id] ?? "",
      onChange: (value) => {
        setFilterValues((values) => ({ ...values, [filter.id]: value }));
        setPage(1);
      },
    })),
  };
}
