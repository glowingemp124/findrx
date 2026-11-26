import type { KeyboardEvent, ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { DataTableColumn, SortState, TableController } from "@/components/data-table/types";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

const HIDE_BELOW = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const;
const PAGE_SIZES = [10, 25, 50].map((value) => ({ value, label: `${value} per page` }));

type DataTableProps<T> = {
  table: TableController<T> & { searchable?: boolean };
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Accessible name for the table. */
  label: string;
  searchPlaceholder?: string;
  /** Right side of the toolbar, e.g. an export or create button. */
  actions?: ReactNode;
  onRowClick?: (row: T) => void;
  selectedRowId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Hide pagination for short, fixed lists. */
  paginate?: boolean;
  className?: string;
};

function nextSort(sort: SortState, columnId: string): SortState {
  if (sort?.columnId !== columnId) return { columnId, direction: "asc" };
  return sort.direction === "asc" ? { columnId, direction: "desc" } : null;
}

/** Page numbers with gaps: 1 … 4 5 6 … 12 */
function pageItems(page: number, pageCount: number): Array<number | "gap"> {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((item) => item >= 1 && item <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((item, index) => (index > 0 && item - sorted[index - 1] > 1 ? ["gap" as const, item] : [item]));
}

/**
 * Card-style table with search, filters, sortable headers, row selection, pagination,
 * loading and empty states. Feed it a `TableController` (see `useClientTable`).
 */
export function DataTable<T>({
  table,
  columns,
  getRowId,
  label,
  searchPlaceholder = "Search",
  actions,
  onRowClick,
  selectedRowId,
  emptyTitle = "Nothing to show",
  emptyDescription,
  paginate = true,
  className,
}: DataTableProps<T>) {
  const { rows, total, page, pageSize, sort, filters, loading = false } = table;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const hasToolbar = table.searchable || filters.length > 0 || actions;

  const onRowKey = (event: KeyboardEvent, row: T) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <section aria-label={label} className={cn("card rise-in", className)}>
      {hasToolbar ? (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3 sm:p-4">
          {table.searchable ? (
            <label className="relative flex w-full min-w-0 items-center sm:w-auto sm:min-w-[220px] sm:flex-1">
              <span className="sr-only">{searchPlaceholder}</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 size-4 text-muted" />
              <input
                type="search"
                value={table.query}
                onChange={(event) => table.setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-full bg-canvas pr-4 pl-10 text-md text-ink ring-1 ring-line-strong outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
              />
            </label>
          ) : null}
          {filters.map((filter) => (
            <Select
              key={filter.id}
              hideLabel
              label={filter.label}
              value={filter.value}
              options={filter.options}
              onChange={filter.onChange}
              className="w-full sm:w-[190px]"
            />
          ))}
          {actions ? <div className="flex flex-wrap gap-2 sm:ml-auto">{actions}</div> : null}
        </div>
      ) : null}

      {/* Only the table scrolls and clips, so toolbar and pagination dropdowns can overflow the card. */}
      <div className={cn("overflow-x-auto", !hasToolbar && "rounded-t-[20px]", !(paginate && total > 0) && "rounded-b-[20px]")}>
        <table className="w-full text-left text-md" aria-busy={loading || undefined}>
          <caption className="sr-only">{label}</caption>
          <thead className="bg-side-well text-xs font-semibold tracking-wide text-muted uppercase">
            <tr>
              {columns.map((column) => {
                const sorted = sort?.columnId === column.id ? sort.direction : null;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={cn(
                      "px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5",
                      (column.headerAlign ?? column.align) === "right" && "text-right",
                      column.headerAlign === "center" && "text-center",
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => table.setSort(nextSort(sort, column.id))}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-ink",
                          sorted && "text-ink",
                        )}
                      >
                        {column.header}
                        <Icon name={sorted === "asc" ? "sortUp" : sorted === "desc" ? "sortDown" : "sort"} className="size-3.5" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading
              ? Array.from({ length: Math.min(pageSize, 6) }, (_, index) => (
                  <tr key={`loading-${index}`}>
                    {columns.map((column) => (
                      <td key={column.id} className={cn("px-4 py-4 first:pl-5 last:pr-5", column.hideBelow && HIDE_BELOW[column.hideBelow])}>
                        <span className="block h-3.5 w-3/4 animate-pulse rounded-full bg-side-well" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, index) => {
                  const id = getRowId(row);
                  const selected = selectedRowId === id;
                  return (
                    <tr
                      key={id}
                      tabIndex={onRowClick ? 0 : undefined}
                      aria-selected={onRowClick ? selected : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? (event) => onRowKey(event, row) : undefined}
                      className={cn(
                        "row-in transition-colors",
                        onRowClick && "cursor-pointer outline-none hover:bg-side-hover focus-visible:bg-side-hover",
                        selected && "bg-accent-soft hover:bg-accent-soft",
                      )}
                      style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "px-4 py-3.5 align-middle first:pl-5 last:pr-5",
                            column.align === "right" && "text-right",
                            column.hideBelow && HIDE_BELOW[column.hideBelow],
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <div className="grid place-items-center gap-1.5 px-6 py-14 text-center">
            <span className="mb-1 grid size-11 place-items-center rounded-full bg-side-well text-muted">
              <Icon name="search" />
            </span>
            <p className="text-lg font-semibold">{emptyTitle}</p>
            {emptyDescription ? <p className="max-w-[420px] text-md text-muted">{emptyDescription}</p> : null}
          </div>
        ) : null}
      </div>

      {paginate && total > 0 ? (
        <footer className="flex flex-col items-stretch gap-3 border-t border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-muted tabular-nums">
            Showing {from}–{to} of {total}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select
              hideLabel
              label="Rows per page"
              value={pageSize}
              options={PAGE_SIZES}
              onChange={table.setPageSize}
              className="w-[150px]"
            />
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <PageButton label="Previous page" disabled={page === 1} onClick={() => table.setPage(page - 1)}>
                <Icon name="chevronLeft" className="size-4" />
              </PageButton>
              {pageItems(page, pageCount).map((item, index) =>
                item === "gap" ? (
                  <span key={`gap-${index}`} className="px-1 text-muted">
                    …
                  </span>
                ) : (
                  <PageButton key={item} label={`Page ${item}`} current={item === page} onClick={() => table.setPage(item)}>
                    {item}
                  </PageButton>
                ),
              )}
              <PageButton label="Next page" disabled={page === pageCount} onClick={() => table.setPage(page + 1)}>
                <Icon name="chevronRight" className="size-4" />
              </PageButton>
            </nav>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

function PageButton({
  label,
  current = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-9 min-w-9 cursor-pointer place-items-center rounded-full px-2 text-md font-semibold tabular-nums transition-colors disabled:cursor-default disabled:opacity-40",
        current ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-side-hover",
      )}
    >
      {children}
    </button>
  );
}
