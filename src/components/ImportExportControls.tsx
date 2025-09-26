import React, { useRef, useState } from 'react';
import { useDrawingContext, DrawingElement } from '../context/DrawingContext';
import { serializeDrawing, deserializeDrawing, downloadBlob, exportCanvasToPNG, exportCanvasToSVG } from '../utils/serialization';

export function ImportExportControls() {
  const { state, dispatch } = useDrawingContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadJSON = () => {
    try {
      const json = serializeDrawing(state.elements);
      downloadBlob(json, 'drawing-project.json');
      setMessage('Drawing downloaded successfully.');
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to download drawing.');
      setMessage(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const elements = deserializeDrawing(text);
      // Optionally remap layerId if missing in current layers
      const validLayerIds = new Set(state.layers.map(l => l.id));
      const fallbackLayerId = state.currentLayerId;
      const normalized: DrawingElement[] = elements.map(el => ({
        ...el,
        layerId: validLayerIds.has(el.layerId) ? el.layerId : fallbackLayerId,
      }));
      dispatch({ type: 'REPLACE_ELEMENTS', elements: normalized });
      setMessage('Drawing loaded successfully.');
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Invalid file. Please select a valid drawing JSON.');
      setMessage(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      setError('Canvas not found.');
      return;
    }
    exportCanvasToPNG(canvas, `drawing-${Date.now()}.png`);
    setMessage('PNG exported.');
    setError(null);
  };

  const handleExportSVG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      setError('Canvas not found.');
      return;
    }
    const svg = exportCanvasToSVG(canvas.width, canvas.height);
    downloadBlob(svg, `drawing-${Date.now()}.svg`, 'image/svg+xml');
    setMessage('SVG exported.');
    setError(null);
  };

  return (
    <div className="flex items-center gap-2 p-2">
      <button onClick={handleDownloadJSON} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded">Download Drawing</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
      <button onClick={handleUploadClick} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded">Upload Drawing</button>
      <button onClick={handleExportPNG} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded">Export PNG</button>
      <button onClick={handleExportSVG} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded">Export SVG</button>
      {message && <div role="status" className="ml-2 text-green-400 text-sm">{message}</div>}
      {error && <div role="alert" className="ml-2 text-red-400 text-sm">{error}</div>}
    </div>
  );
}


