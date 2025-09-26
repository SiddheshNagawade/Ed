import React from 'react';
import { useDrawingContext } from '../context/DrawingContext';
import { Grid, ZoomIn, ZoomOut } from 'lucide-react';

export function PropertiesPanel() {
  const { state, dispatch } = useDrawingContext();

  const handleGridSizeChange = (size: number) => {
    dispatch({ type: 'SET_GRID_SIZE', size });
  };

  const handleUnitsChange = (units: 'mm' | 'cm') => {
    dispatch({ type: 'SET_UNITS', units });
  };

  const handleZoomChange = (zoom: number) => {
    dispatch({ type: 'SET_ZOOM', zoom });
  };

  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    switch (format) {
      case 'png':
        const link = document.createElement('a');
        link.download = `drawing-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        break;
      case 'svg':
        const svgData = createSVGExport();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const svgLink = document.createElement('a');
        svgLink.download = `drawing-${Date.now()}.svg`;
        svgLink.href = svgUrl;
        svgLink.click();
        URL.revokeObjectURL(svgUrl);
        break;
      case 'pdf':
        const pdfLink = document.createElement('a');
        pdfLink.download = `drawing-${Date.now()}.png`;
        pdfLink.href = canvas.toDataURL();
        pdfLink.click();
        break;
    }
  };

  const createSVGExport = (): string => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return '';

    let svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="#2a2a2a"/>`;

    state.elements.forEach(element => {
      const layer = state.layers.find(l => l.id === element.layerId);
      if (!layer?.visible) return;

      switch (element.type) {
        case 'line':
          if (element.points.length >= 2) {
            svg += `<line x1="${element.points[0].x}" y1="${element.points[0].y}" x2="${element.points[1].x}" y2="${element.points[1].y}" stroke="${element.style.strokeColor}" stroke-width="${element.style.strokeWidth}"/>`;
          }
          break;
        case 'freehand':
          if (element.points.length > 1) {
            let path = `M ${element.points[0].x} ${element.points[0].y}`;
            for (let i = 1; i < element.points.length; i++) {
              path += ` L ${element.points[i].x} ${element.points[i].y}`;
            }
            svg += `<path d="${path}" stroke="${element.style.strokeColor}" stroke-width="${element.style.strokeWidth}" fill="none"/>`;
          }
          break;
      }
    });

    svg += '</svg>';
    return svg;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-lg">Properties</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Grid Settings */}
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Grid size={16} className="mr-2" />
            Grid Settings
          </h4>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-400">
              Grid: 1mm squares (fixed)
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Show Grid</span>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  state.gridVisible ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.gridVisible ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Snap to Grid</span>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SNAP' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  state.snapToGrid ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.snapToGrid ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Units */}
        <div>
          <h4 className="font-medium mb-3">Units</h4>
          <div className="grid grid-cols-2 gap-2">
            {(['mm', 'cm'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => handleUnitsChange(unit)}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  state.units === unit
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div>
          <h4 className="font-medium mb-3">View</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Zoom: {(state.zoom * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="10"
                max="300"
                value={Math.min(300, Math.max(10, state.zoom * 100))}
                onChange={(e) => handleZoomChange(Number(e.target.value) / 100)}
                className="w-full"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleZoomChange(state.zoom / 1.2)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <ZoomOut size={16} className="mr-1" />
                Zoom Out
              </button>
              <button
                onClick={() => handleZoomChange(state.zoom * 1.2)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <ZoomIn size={16} className="mr-1" />
                Zoom In
              </button>
            </div>

            <button
              onClick={() => handleZoomChange(1)}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Reset Zoom (100%)
            </button>
          </div>
        </div>

        {/* Drawing Statistics */}
        <div>
          <h4 className="font-medium mb-3">Statistics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Page:</span>
              <span>{state.currentPage} of {state.totalPages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Page Size:</span>
              <span>A4 (210×297mm)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Objects:</span>
              <span>{state.elements.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Selected:</span>
              <span>{state.selectedElementIds.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Layers:</span>
              <span>{state.layers.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}