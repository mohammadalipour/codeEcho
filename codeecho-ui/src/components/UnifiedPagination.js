import React from 'react';

/**
 * UnifiedPagination - consistent pagination UI for tables across the app
 * Props:
 * - currentPage: number (1-based)
 * - pageSize: number
 * - totalItems: number
 * - onPageChange: (page:number) => void
 * - onPageSizeChange: (size:number) => void
 * - pageSizeOptions?: number[] (default [10,25,50,100])
 * - compact?: boolean (smaller paddings)
 */
const UnifiedPagination = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  compact = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage || 1, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  const buttonBase = `border rounded-md ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} transition-colors`;

  const pageNumbers = React.useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 4) pages.push('…');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 3) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${compact ? 'px-3 py-2' : 'px-4 py-3' } bg-gray-50 border-t border-gray-200`}>
      <div className="text-gray-700 text-sm">
        Showing {start}–{end} of {totalItems.toLocaleString()} items
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`${buttonBase} ${safePage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          aria-label="First page"
        >First</button>
        <button
          className={`${buttonBase} ${safePage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          aria-label="Previous page"
        >Prev</button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => (
            p === '…' ? (
              <span key={`e-${idx}`} className="px-1 text-gray-400">…</span>
            ) : (
              <button
                key={p}
                className={`${buttonBase} ${p === safePage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                onClick={() => onPageChange(p)}
                aria-current={p === safePage ? 'page' : undefined}
              >{p}</button>
            )
          ))}
        </div>

        <button
          className={`${buttonBase} ${safePage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          aria-label="Next page"
        >Next</button>
        <button
          className={`${buttonBase} ${safePage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          aria-label="Last page"
        >Last</button>

        <select
          className={`${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-sm'} border border-gray-300 rounded-md bg-white`}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map(opt => (
            <option key={opt} value={opt}>{opt} / page</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default UnifiedPagination;
