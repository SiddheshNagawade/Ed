import React, { useRef, useEffect } from 'react';
import { useDrawingContext } from '../context/DrawingContext';
import { serializeDrawing, deserializeDrawing, downloadBlob, exportCanvasToPNG, exportCanvasToSVG } from '../utils/serialization';
import { Save, Upload, Download } from 'lucide-react'; // Changed FolderOpen to Upload

interface NavFileControlsProps {
  activeKey: 'layers' | 'properties' | 'export' | null;
  onToggle: (key: 'layers' | 'properties' | 'export') => void;
  onCloseAll: () => void;
  showNotice: (type: 'success' | 'error', text: string) => void;
}

export function NavFileControls({ activeKey, onToggle, onCloseAll, showNotice }: NavFileControlsProps) {
  const { state, dispatch } = useDrawingContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isExportOpen = activeKey === 'export';

  const handleSaveJson = () => {
    try {
      const json = serializeDrawing(state.elements);
      downloadBlob(json, 'drawing-project.json');
      showNotice('success', 'Drawing downloaded');
      onCloseAll();
    } catch (e: any) {
      showNotice('error', e?.message || 'Download failed');
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = deserializeDrawing(text);
      const validLayerIds = new Set(state.layers.map(l => l.id));
      const fallback = state.currentLayerId;
      const normalized = parsed.map(el => ({ ...el, layerId: validLayerIds.has(el.layerId) ? el.layerId : fallback }));
      dispatch({ type: 'REPLACE_ELEMENTS', elements: normalized });
      showNotice('success', 'Drawing loaded');
      onCloseAll();
    } catch (err: any) {
      showNotice('error', err?.message || 'Invalid drawing file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPng = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return showNotice('error', 'Canvas not found');
    exportCanvasToPNG(canvas, `drawing-${Date.now()}.png`);
    showNotice('success', 'Exported PNG');
    onCloseAll();
  };

  const handleExportSvg = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return showNotice('error', 'Canvas not found');
    const svg = exportCanvasToSVG(canvas.width, canvas.height);
    downloadBlob(svg, `drawing-${Date.now()}.svg`, 'image/svg+xml');
    showNotice('success', 'Exported SVG');
    onCloseAll();
  };

  return (
    <div className="relative flex items-center space-x-2"> {/* Added space-x-2 for spacing between buttons */}
      <button
        onClick={handleSaveJson}
        className="p-2 rounded hover:bg-gray-700 transition-colors border border-white flex items-center" // Added border, flex, and items-center
        title="Download Drawing"
        aria-label="Download Drawing"
      >
        <span className="mr-2 text-sm font-medium">Download file to edit later</span> {/* Added text */}
        <Save size={18} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={handleUploadClick}
        className="p-2 rounded hover:bg-gray-700 transition-colors"
        title="Upload Drawing"
        aria-label="Upload Drawing"
      >
        <Upload size={18} /> {/* Replaced FolderOpen with Upload icon */}
      </button>

      <div className="relative">
        <button
          onClick={() => onToggle('export')}
          className="p-2 rounded hover:bg-gray-700 transition-colors"
          title="Export Drawing"
          aria-expanded={isExportOpen}
        >
          <Download size={18} />
        </button>
        {isExportOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
            <div className="p-2">
              <button onClick={handleExportPng} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm">Export as PNG</button>
              <button onClick={handleExportSvg} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm">Export as SVG</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

