"use client"

import { cn } from "@xkill/design-system"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  pagination?: {
    hasNext: boolean
    hasPrev: boolean
    onNext: () => void
    onPrev: () => void
    loading?: boolean
  }
  onSort?: (key: string, direction: "asc" | "desc") => void
  sortKey?: string
  sortDirection?: "asc" | "desc"
  rowKey: (item: T) => string | number
  onRowClick?: (item: T) => void
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={cn("h-4 w-3/4 animate-pulse rounded bg-muted", i === 0 && "w-1/2")} />
        </td>
      ))}
    </tr>
  )
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = "No results found.",
  pagination,
  onSort,
  sortKey,
  sortDirection,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Data table">
      <table className="w-full border-collapse text-sm" role="table">
        <thead>
          <tr role="row">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "border-b px-4 py-3 text-left font-medium text-muted-foreground",
                  col.sortable && "cursor-pointer select-none hover:text-foreground",
                  col.className,
                )}
                role="columnheader"
                aria-sort={
                  sortKey === col.key
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                onClick={() => {
                  if (col.sortable && onSort) {
                    const newDir = sortKey === col.key && sortDirection === "asc" ? "desc" : "asc"
                    onSort(col.key, newDir)
                  }
                }}
                tabIndex={col.sortable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (col.sortable && onSort && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    const newDir = sortKey === col.key && sortDirection === "asc" ? "desc" : "asc"
                    onSort(col.key, newDir)
                  }
                }}
                aria-label={col.sortable ? `Sort by ${col.label}` : col.label}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span aria-hidden="true" className="inline-flex">
                      {sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={columns.length} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground" role="status">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={rowKey(item)}
                role="row"
                className={cn("border-b transition-colors hover:bg-muted/50", onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    onRowClick(item)
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3" role="gridcell">
                    {col.render ? col.render(item) : ((item as Record<string, unknown>)[col.key] as string) ?? "\u2014"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between border-t px-4 py-3" role="navigation" aria-label="Pagination">
          <button
            onClick={pagination.onPrev}
            disabled={!pagination.hasPrev || loading || pagination.loading}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Previous page"
          >
            Previous
          </button>
          <button
            onClick={pagination.onNext}
            disabled={!pagination.hasNext || loading || pagination.loading}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
