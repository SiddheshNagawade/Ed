import React from 'react';
import { useDrawingContext } from '../context/DrawingContext';
import { Plus, Trash2 } from 'lucide-react';

export function PagesPanel() {
  const { state, dispatch } = useDrawingContext();

  const handleSelect = (page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', page });
  };

  const handleDelete = (page: number) => {
    if (state.totalPages <= 1) return;
    dispatch({ type: 'DELETE_PAGE', page });
  };

  const handleAdd = () => {
    dispatch({ type: 'ADD_PAGE' });
  };

  // Approximate thumbnail aspect ratio for A4 portrait
  const thumbWidth = 64;
  const thumbHeight = Math.round(thumbWidth * (297 / 210));

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Pages</h3>
        <button
          onClick={handleAdd}
          className="p-1 rounded hover:bg-gray-700"
          title="Add Page"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Array.from({ length: state.totalPages }).map((_, idx) => {
          const page = idx + 1;
          const isCurrent = state.currentPage === page;
          return (
            <div
              key={page}
              className={`flex items-center justify-between px-2 py-2 border border-gray-700 rounded cursor-pointer ${
                isCurrent ? 'bg-blue-600 bg-opacity-20 border-blue-500' : 'hover:bg-gray-700'
              }`}
              onClick={() => handleSelect(page)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="bg-white border border-gray-500 shadow-sm"
                  style={{ width: thumbWidth, height: thumbHeight }}
                />
                <div className="text-sm">Page {page}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(page);
                }}
                className="p-1 rounded hover:bg-gray-600"
                title="Delete Page"
                disabled={state.totalPages <= 1}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 