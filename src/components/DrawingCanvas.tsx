import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDrawingContext, Point, DrawingElement, MM_TO_PX } from '../context/DrawingContext';
import { drawGrid, snapToGrid } from '../utils/grid';
import { LineTool } from './tools/LineTool';
import { AngleTool } from './tools/AngleTool';
import { FreehandTool } from './tools/FreehandTool';
import { SelectTool } from './tools/SelectTool';
import { EraserTool } from './tools/EraserTool';
import { TextTool } from './tools/TextTool';
import { Plus, FileText } from 'lucide-react';

interface DrawingCanvasProps {
  onCursorMove: (position: Point) => void;
}

export function DrawingCanvas({ onCursorMove }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useDrawingContext();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const containerActiveRef = useRef<boolean>(false);

  const PAGE_MARGIN = 20; // Margin between pages
  const CANVAS_PADDING = 50; // Padding around all pages
  
  // Calculate page position for a given page number
  const getPageBounds = useCallback((pageNumber: number) => {
    return {
      x: CANVAS_PADDING,
      y: CANVAS_PADDING + (pageNumber - 1) * (state.pageHeight + PAGE_MARGIN),
      width: state.pageWidth,
      height: state.pageHeight
    };
  }, [state.pageWidth, state.pageHeight]);

  // Compute content dimensions (all pages area incl. padding)
  const getContentSize = useCallback(() => {
    const totalHeight = CANVAS_PADDING * 2 + state.totalPages * state.pageHeight + (state.totalPages - 1) * PAGE_MARGIN;
    const totalWidth = CANVAS_PADDING * 2 + state.pageWidth;
    return { totalWidth, totalHeight };
  }, [state.totalPages, state.pageHeight, state.pageWidth]);

  // Clamp pan so no empty space beyond content edges; center when content is smaller than viewport
  const clampPan = useCallback((pan: Point): Point => {
    const container = containerRef.current;
    if (!container) return pan;

    const { totalWidth, totalHeight } = getContentSize();
    const rect = container.getBoundingClientRect();

    const viewW = rect.width / state.zoom;
    const viewH = rect.height / state.zoom;

    let clampedX = pan.x;
    let clampedY = pan.y;

    if (totalWidth <= viewW) {
      // Always horizontally center when content fits
      clampedX = (viewW - totalWidth) / 2;
    } else {
      // Clamp between [-(content - view), 0]
      const minX = -(totalWidth - viewW);
      const maxX = 0;
      clampedX = Math.max(minX, Math.min(maxX, pan.x));
    }

    if (totalHeight <= viewH) {
      // Center vertically if content fits
      clampedY = (viewH - totalHeight) / 2;
    } else {
      const minY = -(totalHeight - viewH);
      const maxY = 0;
      clampedY = Math.max(minY, Math.min(maxY, pan.y));
    }

    return { x: clampedX, y: clampedY };
  }, [getContentSize, state.zoom]);

  // Determine if panning is allowed (only when content larger than viewport)
  const canPan = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    const { totalWidth, totalHeight } = getContentSize();
    const rect = container.getBoundingClientRect();
    const viewW = rect.width / state.zoom;
    const viewH = rect.height / state.zoom;
    return totalWidth > viewW || totalHeight > viewH;
  }, [getContentSize, state.zoom]);

  // Dynamically compute minimum zoom so page never becomes tiny and stays nicely viewable
  const computeAndApplyMinZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { totalWidth } = getContentSize();
    const rect = container.getBoundingClientRect();
    const widthBasedMin = rect.width / totalWidth; // fully fit width
    const comfortableMin = 0.6; // don't allow zoom-out smaller than 60%
    const newMinZoom = Math.min(1, Math.max(comfortableMin, widthBasedMin));
    dispatch({ type: 'SET_MIN_ZOOM', minZoom: newMinZoom });
    if (state.zoom < newMinZoom) {
      dispatch({ type: 'SET_ZOOM', zoom: newMinZoom });
    }
  }, [dispatch, getContentSize, state.zoom]);

  // Check if a point is within any page bounds
  const getPageAtPoint = useCallback((point: Point): number | null => {
    for (let page = 1; page <= state.totalPages; page++) {
      const bounds = getPageBounds(page);
      if (point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
        return page;
      }
    }
    return null;
  }, [state.totalPages, getPageBounds]);

  // Clip point to page boundaries
  const clipToPageBounds = useCallback((point: Point): Point => {
    const pageNumber = getPageAtPoint(point);
    if (!pageNumber) return point;
    
    const bounds = getPageBounds(pageNumber);
    return {
      x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
      y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y))
    };
  }, [getPageAtPoint, getPageBounds]);

  // Draw all pages with boundaries and backgrounds
  const drawPages = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    for (let page = 1; page <= state.totalPages; page++) {
      const bounds = getPageBounds(page);
      
      // Draw page background (white)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Draw page border (light grey)
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Draw drop shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(bounds.x + 3, bounds.y + 3, bounds.width, bounds.height);
      ctx.restore();
      
      // Redraw page background over shadow
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Redraw border
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Draw page number
      ctx.fillStyle = '#666666';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Page ${page}`,
        bounds.x + bounds.width / 2,
        bounds.y - 10
      );
    }
    
    ctx.restore();
  }, [state.totalPages, getPageBounds]);

  // Draw grid within each page
  const drawPageGrids = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!state.gridVisible) return;
    
    for (let page = 1; page <= state.totalPages; page++) {
      const bounds = getPageBounds(page);
      
      ctx.save();
      // Clip to page bounds
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.clip();
      
      // Translate to page origin
      ctx.translate(bounds.x, bounds.y);
      drawGrid(ctx, bounds.width, bounds.height, state.gridSize);
      ctx.restore();
    }
  }, [state.gridVisible, state.totalPages, state.gridSize, getPageBounds]);

  // Draw element with page clipping
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    const layer = state.layers.find(l => l.id === element.layerId);
    if (!layer?.visible) return;

    // Find which page this element belongs to
    if (element.points.length === 0) return;
    const pageNumber = getPageAtPoint(element.points[0]);
    if (!pageNumber) return;
    
    const bounds = getPageBounds(pageNumber);

    ctx.save();
    
    // Clip to page bounds
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();
    
    ctx.strokeStyle = element.style.strokeColor;
    ctx.lineWidth = element.style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (element.style.fillColor) {
      ctx.fillStyle = element.style.fillColor;
    }

    // Highlight selected elements
    if (element.selected || state.selectedElementIds.includes(element.id)) {
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#3b82f6';
    }

    switch (element.type) {
      case 'line':
        if (element.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          ctx.lineTo(element.points[1].x, element.points[1].y);
          ctx.stroke();

          // Draw measurement parallel to line
          if (element.measurements?.length) {
            const angle = Math.atan2(element.points[1].y - element.points[0].y, element.points[1].x - element.points[0].x);
            const length = element.measurements.length;
            const midX = (element.points[0].x + element.points[1].x) / 2;
            const midY = (element.points[0].y + element.points[1].y) / 2;
            
            // Calculate offset distance based on line thickness
            const offsetDistance = element.style.strokeWidth * 3 + 8;
            const offsetX = Math.cos(angle + Math.PI / 2) * offsetDistance;
            const offsetY = Math.sin(angle + Math.PI / 2) * offsetDistance;
            
            ctx.save();
            ctx.translate(midX + offsetX, midY + offsetY);
            ctx.rotate(angle);
            
            // High contrast text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Background for better readability
            const lengthMm = length / MM_TO_PX;
            const text = state.units === 'cm'
              ? `${(lengthMm / 10).toFixed(1)} cm`
              : `${lengthMm.toFixed(1)} mm`;
            const textMetrics = ctx.measureText(text);
            const padding = 4;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(-textMetrics.width/2 - padding, -6, textMetrics.width + padding*2, 12);
            
            ctx.fillStyle = '#000000';
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }

          // Draw connection dots at endpoints
          if (state.zoom > 0.5) {
            const radius = Math.max(0.5, 3 / state.zoom);
            ctx.fillStyle = element.style.strokeColor;
            ctx.beginPath();
            ctx.arc(element.points[0].x, element.points[0].y, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(element.points[1].x, element.points[1].y, radius, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        break;
      
      case 'angle':
        if (element.points.length >= 3) {
          const baseline = element.points[0];
          const center = element.points[1];
          const endpoint = element.points[2];
          
          // Draw baseline
          ctx.beginPath();
          ctx.moveTo(baseline.x, baseline.y);
          ctx.lineTo(center.x, center.y);
          ctx.stroke();
          
          // Draw angle line
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(endpoint.x, endpoint.y);
          ctx.stroke();
          
          // Draw angle arc
          const baselineAngle = Math.atan2(baseline.y - center.y, baseline.x - center.x);
          const endpointAngle = Math.atan2(endpoint.y - center.y, endpoint.x - center.x);
          const arcRadius = 30;
          
          ctx.beginPath();
          ctx.arc(center.x, center.y, arcRadius, baselineAngle, endpointAngle);
          ctx.stroke();
          
          // Draw angle measurement at center of arc (both sides)
          if (element.measurements?.angle) {
            const angleDeg = (element.measurements.angle * 180 / Math.PI);
            const primary = ((angleDeg % 360) + 360) % 360;
            const secondary = (360 - primary) % 360;

            const midAngle = (baselineAngle + endpointAngle) / 2;
            const textRadius = arcRadius + 20;
            const textX = center.x + Math.cos(midAngle) * textRadius;
            const textY = center.y + Math.sin(midAngle) * textRadius;
            // Opposite side for complementary label
            const oppAngle = midAngle + Math.PI;
            const oppX = center.x + Math.cos(oppAngle) * textRadius;
            const oppY = center.y + Math.sin(oppAngle) * textRadius;

            const placeLabel = (label: string, x: number, y: number) => {
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textMetrics = ctx.measureText(label);
              const padding = 4;
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.fillRect(x - textMetrics.width/2 - padding, y - 6, textMetrics.width + padding*2, 12);
              ctx.fillStyle = '#000000';
              ctx.fillText(label, x, y);
              ctx.restore();
            };

            placeLabel(`${primary.toFixed(1)}°`, textX, textY);
            placeLabel(`${secondary.toFixed(1)}°`, oppX, oppY);
          }
        }
        break;
      
      case 'freehand':
        if (element.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            const prevPoint = element.points[i - 1];
            const currentPoint = element.points[i];
            const midX = (prevPoint.x + currentPoint.x) / 2;
            const midY = (prevPoint.y + currentPoint.y) / 2;
            ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
          }
          ctx.stroke();
        }
        break;
      
      case 'text':
        if (element.points.length > 0 && element.text) {
          ctx.fillStyle = element.style.strokeColor;
          ctx.font = `${element.fontSize || 14}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(element.text, element.points[0].x, element.points[0].y);
        }
        break;
    }
    
    ctx.restore();
  }, [state.layers, state.selectedElementIds, state.units, getPageAtPoint, getPageBounds]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with light grey background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.scale(state.zoom, state.zoom);
    ctx.translate(state.panOffset.x, state.panOffset.y);

    // Draw pages with backgrounds and borders
    drawPages(ctx);
    
    // Draw grids within pages
    drawPageGrids(ctx);

    // Draw all elements
    state.elements.forEach(element => {
      drawElement(ctx, element);
    });

    // Draw current element being created
    if (currentElement) {
      if (currentElement.type === 'angle') {
        ctx.save();
        ctx.globalAlpha = 0.3; // 30% opacity while drawing angle
        drawElement(ctx, currentElement);
        ctx.restore();
      } else {
        drawElement(ctx, currentElement);
      }
    }

    ctx.restore();
  }, [state, currentElement, drawElement, drawPages, drawPageGrids]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement as HTMLElement | null;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      // Calculate canvas dimensions to fit all pages with padding
      const { totalWidth, totalHeight } = getContentSize();
      
      // Set canvas size with device pixel ratio for crisp rendering
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(containerRect.width, totalWidth) * pixelRatio;
      canvas.height = Math.max(containerRect.height, totalHeight) * pixelRatio;
      
      // Scale canvas for device pixel ratio
      canvas.style.width = `${Math.max(containerRect.width, totalWidth)}px`;
      canvas.style.height = `${Math.max(containerRect.height, totalHeight)}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
      }

      // Recompute min zoom and clamp pan to keep content centered and within bounds
      computeAndApplyMinZoom();
      const clamped = clampPan(state.panOffset);
      if (clamped.x !== state.panOffset.x || clamped.y !== state.panOffset.y) {
        dispatch({ type: 'SET_PAN', offset: clamped });
      }

      render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [render, state.totalPages, state.pageWidth, state.pageHeight, clampPan, computeAndApplyMinZoom, getContentSize, dispatch, state.panOffset]);

  // Convert mouse event to canvas coordinates (use CSS pixels; devicePixelRatio handled by context scaling)
  const getCanvasPoint = (e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    let x = ((e.clientX - rect.left) / state.zoom) - state.panOffset.x;
    let y = ((e.clientY - rect.top) / state.zoom) - state.panOffset.y;

    // Apply snapping if enabled and within page bounds
    if (state.snapToGrid && state.currentTool !== 'freehand') {
      const pageNumber = getPageAtPoint({ x, y });
      if (pageNumber) {
        const snapped = snapToGrid({ x, y }, state.gridSize);
        x = snapped.x;
        y = snapped.y;
      }
    }

    return { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    onCursorMove(point);

    // Handle panning
    if (isPanning && lastPanPoint) {
      const deltaX = (e.clientX - lastPanPoint.x) / state.zoom;
      const deltaY = (e.clientY - lastPanPoint.y) / state.zoom;
      
      const nextPan = { x: state.panOffset.x + deltaX, y: state.panOffset.y + deltaY };
      const clamped = clampPan(nextPan);
      dispatch({ type: 'SET_PAN', offset: clamped });
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  // Center canvas appropriately when state changes (keep horizontally centered when content fits)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const { totalWidth, totalHeight } = getContentSize();
    const viewW = rect.width / state.zoom;
    const viewH = rect.height / state.zoom;

    let desired = state.panOffset;

    if (totalWidth <= viewW) {
      desired = { ...desired, x: (viewW - totalWidth) / 2 };
    }
    if (totalHeight <= viewH) {
      desired = { ...desired, y: (viewH - totalHeight) / 2 };
    }

    const clamped = clampPan(desired);
    if (clamped.x !== state.panOffset.x || clamped.y !== state.panOffset.y) {
      dispatch({ type: 'SET_PAN', offset: clamped });
    }
  }, [state.zoom, state.pageWidth, state.pageHeight, state.totalPages, clampPan, getContentSize, dispatch, state.panOffset]);

  // Handle zoom and pan with wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Zoom with Ctrl/Cmd + wheel
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = state.zoom * zoomFactor;
      dispatch({ type: 'SET_ZOOM', zoom: newZoom });
      // After zooming, clamp pan so content stays within bounds
      const clamped = clampPan(state.panOffset);
      if (clamped.x !== state.panOffset.x || clamped.y !== state.panOffset.y) {
        dispatch({ type: 'SET_PAN', offset: clamped });
      }
    } else {
      // Pan with wheel (vertical scrolling only) — only when content larger than viewport
      if (!canPan()) return;
      const deltaY = e.deltaY / state.zoom;
      const nextPan = { x: state.panOffset.x, y: state.panOffset.y - deltaY };
      const clamped = clampPan(nextPan);
      dispatch({ type: 'SET_PAN', offset: clamped });
    }
  };

  // Handle mouse down for panning (only when content larger than viewport)
  const handleMouseDown = (e: React.MouseEvent) => {
    containerActiveRef.current = true;
    // Middle mouse button or Shift+click for panning
    if ((e.button === 1 || (e.button === 0 && e.shiftKey)) && canPan()) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsPanning(false);
    setLastPanPoint(null);
  };

  // Keyboard shortcuts: Undo / Redo with proper platform modifiers
  useEffect(() => {
    const isTextInput = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      const editable = (el as HTMLElement).isContentEditable;
      return tag === 'input' || tag === 'textarea' || editable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (isTextInput(active)) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;

      // Undo
      if (mod && !shift && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }
      // Redo (Cmd+Shift+Z on Mac; Ctrl+Y or Ctrl+Shift+Z on Win/Linux)
      if (
        (mod && shift && (e.key === 'z' || e.key === 'Z')) ||
        (!isMac && mod && (e.key === 'y' || e.key === 'Y'))
      ) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);

  // iPad two/three-finger tap: basic detection without heavy libs
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastTouchTime = 0;
    let lastTouchCount = 0;

    const onTouchStart = (e: TouchEvent) => {
      // Only if canvas region is active
      if (!containerActiveRef.current) return;
      lastTouchTime = Date.now();
      lastTouchCount = e.touches.length;
    };
    const onTouchEnd = () => {
      const dt = Date.now() - lastTouchTime;
      if (dt < 300) {
        if (lastTouchCount === 2) {
          // Two-finger tap → Undo
          dispatch({ type: 'UNDO' });
        } else if (lastTouchCount === 3) {
          // Three-finger tap → Redo
          dispatch({ type: 'REDO' });
        }
      }
      lastTouchCount = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchend', onTouchEnd as any);
    };
  }, [dispatch]);

  // Add new page
  const handleAddPage = () => {
    dispatch({ type: 'ADD_PAGE' });
  };

  // Tool-specific handlers
  const toolHandlers = {
    line: LineTool,
    angle: AngleTool,
    freehand: FreehandTool,
    select: SelectTool,
    eraser: EraserTool,
    text: TextTool,
  } as const;

  const ToolComponent = toolHandlers[state.currentTool as keyof typeof toolHandlers];

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-y-auto overflow-x-hidden bg-gray-100">
      <style>{`
        .cursor-triangle {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="4,20 20,20 12,6" fill="%23000" transform="rotate(-20 12 12)"/></svg>') 12 12, default;
        }
        .cursor-plus { cursor: crosshair; }
        .cursor-ibeam { cursor: text; }
        .cursor-eraser { cursor: crosshair; }
        .cursor-default { cursor: default; }
        .cursor-grab { cursor: grabbing; }
      `}</style>
      <canvas
        ref={canvasRef}
        className={`block ${
          isPanning ? 'cursor-grab' : 
          state.currentTool === 'select' ? 'cursor-default' :
          state.currentTool === 'eraser' ? 'cursor-eraser' :
          state.currentTool === 'text' ? 'cursor-ibeam' :
          state.currentTool === 'angle' ? 'cursor-plus' :
          state.currentTool === 'line' ? 'cursor-plus' :
          'cursor-crosshair'
        }`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Single plus button below the last page (tracks pan/zoom closely) */}
      {(() => {
        const bounds = getPageBounds(state.totalPages);
        const screenX = (bounds.x + bounds.width / 2 + state.panOffset.x) * state.zoom;
        const screenY = (bounds.y + bounds.height + 30 + state.panOffset.y) * state.zoom;
        return (
          <button
            onClick={handleAddPage}
            className="absolute w-9 h-9 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 z-0"
            style={{ left: `${screenX - 18}px`, top: `${screenY - 18}px` }}
            title="Add New Page"
          >
            <Plus size={18} />
          </button>
        );
      })()}

      {/* Tool component for handling interactions */}
      {ToolComponent && (
        <ToolComponent
          canvasRef={canvasRef}
          getCanvasPoint={getCanvasPoint}
          clipToPageBounds={clipToPageBounds}
          getPageAtPoint={getPageAtPoint}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          currentElement={currentElement}
          setCurrentElement={setCurrentElement}
          render={render}
        />
      )}

      {/* Live measurement display */}
      {currentElement && currentElement.measurements && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white px-3 py-2 rounded text-sm font-mono">
          {currentElement.measurements.length && (
            <div>
              {state.units === 'cm'
                ? `Length: ${(currentElement.measurements.length / MM_TO_PX / 10).toFixed(2)} cm`
                : `Length: ${(currentElement.measurements.length / MM_TO_PX).toFixed(2)} mm`}
            </div>
          )}
          {currentElement.measurements.radius && (
            <div>
              {state.units === 'cm'
                ? `Radius: ${(currentElement.measurements.radius / MM_TO_PX / 10).toFixed(2)} cm`
                : `Radius: ${(currentElement.measurements.radius / MM_TO_PX).toFixed(2)} mm`}
            </div>
          )}
          {currentElement.measurements.angle && (
            <div>Angle: {(currentElement.measurements.angle * 180 / Math.PI).toFixed(1)}°</div>
          )}
        </div>
      )}

      {/* Tool instructions fixed to viewport, aligned within center canvas space */}
      <div className="fixed bg-black bg-opacity-80 text-white px-3 py-2 rounded text-sm"
           style={{ left: 'calc(5rem + 16px)', bottom: '46px' }}>
        {state.currentTool === 'select' && 'Click to select • Drag to move • Shift+Click to pan'}
        {state.currentTool === 'line' && 'Click and drag to draw lines'}
        {state.currentTool === 'angle' && 'Click: baseline start → center → angle end'}
        {state.currentTool === 'freehand' && 'Click and drag to draw freehand'}
        {state.currentTool === 'eraser' && 'Click and drag to erase'}
        {state.currentTool === 'text' && 'Click to place text'}
      </div>

      {/* Page info fixed to viewport, aligned within center canvas space */}
      <div className="fixed bg-black bg-opacity-80 text-white px-3 py-2 rounded text-sm flex items-center space-x-2"
           style={{ right: 'calc(269px + 16px)', bottom: '46px' }}>
        <FileText size={16} />
        <span>{state.totalPages} page{state.totalPages !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}