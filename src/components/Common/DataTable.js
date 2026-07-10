import React, { useState } from 'react';

const DataTable = ({ 
  columns, 
  data, 
  emptyMessage = "No data available",
  onRowClick,
  sortable = false,
  initialSortColumn,
  initialSortDirection = 'asc',
  itemsPerPage = 10,
  showPagination = false
}) => {
  const [sortColumn, setSortColumn] = useState(initialSortColumn);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (columnKey) => {
    if (!sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!sortable || !sortColumn) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      // Handle nested values from render
      if (typeof aVal === 'object' && aVal !== null) {
        aVal = String(aVal);
        bVal = String(bVal);
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getPaginatedData = () => {
    if (!showPagination) return getSortedData();
    
    const sortedData = getSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = getPaginatedData();

  const getSortIcon = (columnKey) => {
    if (!sortable || sortColumn !== columnKey) {
      return (
        <svg className="sort-icon invisible" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M7 10l5-5 5 5M7 14l5 5 5-5"/>
        </svg>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <svg className="sort-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M7 14l5-5 5 5"/>
        </svg>
      );
    }
    
    return (
      <svg className="sort-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M7 10l5 5 5-5"/>
      </svg>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4"/>
        </svg>
        <p className="empty-message">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`table-header ${sortable && col.sortable !== false ? 'sortable' : ''}`}
                  onClick={() => sortable && col.sortable !== false && handleSort(col.key)}
                >
                  <div className="header-content">
                    {col.label}
                    {sortable && col.sortable !== false && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className={`table-row ${onRowClick ? 'clickable' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="table-cell">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showPagination && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
            </svg>
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        .data-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        /* Header Styles */
        .table-header {
          text-align: left;
          padding: 14px 16px;
          background: #fafbfc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }

        .table-header.sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .table-header.sortable:hover {
          background: #f7fafc;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sort-icon {
          color: #cbd5e0;
          transition: color 0.2s;
        }

        .table-header.sortable:hover .sort-icon {
          color: #ff6b00;
        }

        /* Cell Styles */
        .table-cell {
          padding: 14px 16px;
          color: #1a202c;
          border-bottom: 1px solid #edf2f7;
        }

        /* Row Styles */
        .table-row {
          transition: background 0.2s;
        }

        .table-row:hover {
          background: #fafbfc;
        }

        .table-row.clickable {
          cursor: pointer;
        }

        .table-row.clickable:hover {
          background: #fff7ed;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }

        .empty-icon {
          color: #cbd5e0;
          margin-bottom: 16px;
        }

        .empty-message {
          color: #718096;
          font-size: 14px;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 20px;
          padding: 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 13px;
          color: #4a5568;
          margin: 0 8px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .table-header,
          .table-cell {
            padding: 10px 12px;
          }
          
          .table-header {
            font-size: 10px;
          }
          
          .table-cell {
            font-size: 13px;
          }
          
          .pagination {
            gap: 4px;
          }
          
          .pagination-info {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default DataTable;
