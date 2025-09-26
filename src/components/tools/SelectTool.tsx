import React, { useEffect, useState } from 'react';
import { useDrawingContext, Point, DrawingElement } from '../../context/DrawingContext';

interface SelectToolProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  getCanvasPoint: (e: React.MouseEvent | MouseEvent) => Point;
  clipToPageBounds: (point: Point) => Point;
  getPageAtPoint: (point: Point) => number | null;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  currentElement: DrawingElement | null;
  setCurrentElement: (element: DrawingElement | null) => void;
  render: () => void;
}

export function SelectTool({
  canvasRef,
  getCanvasPoint,
  clipToPageBounds,
  getPageAtPoint,
  isDrawing,
  setIsDrawing,
  currentElement,
  setCurrentElement,
  render,
}: SelectToolProps) {
  const { state, dispatch } = useDrawingContext();
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isPointNearLine = (point: Point, lineStart: Point, lineEnd: Point, threshold = 5): boolean => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B) <= threshold;

    const param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  };

  const findElementAtPoint = (point: Point): DrawingElement | null => {
    // Search in reverse order to find topmost element
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const element = state.elements[i];
      const layer = state.layers.find(l => l.id === element.layerId);
      if (!layer?.visible || layer.locked) continue;

      switch (element.type) {
        case 'line':
          if (element.points.length >= 2) {
            if (isPointNearLine(point, element.points[0], element.points[1], state.snapThreshold)) {
              return element;
            }
          }
          break;
        case 'angle':
          if (element.points.length >= 3) {
            const baseline = element.points[0];
            const center = element.points[1];
            const endpoint = element.points[2];
            
            if (isPointNearLine(point, baseline, center, state.snapThreshold) || 
                isPointNearLine(point, center, endpoint, state.snapThreshold)) {
              return element;
            }
          }
          break;
        case 'freehand':
          for (let j = 0; j < element.points.length - 1; j++) {
            if (isPointNearLine(point, element.points[j], element.points[j + 1], state.snapThreshold)) {
              return element;
            }
          }
          break;
        case 'text':
          if (element.points.length > 0 && element.text) {
            const textPoint = element.points[0];
            const fontSize = element.fontSize || 14;
            const textWidth = element.text.length * fontSize * 0.6; // Approximate text width
            
            if (point.x >= textPoint.x && point.x <= textPoint.x + textWidth &&
                point.y >= textPoint.y && point.y <= textPoint.y + fontSize) {
              return element;
            }
          }
          break;
      }
    }
    return null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.shiftKey) return; // Skip if panning

      const point = getCanvasPoint(e as any);
      const clickedElement = findElementAtPoint(point);

      if (clickedElement) {
        // Select the element
        dispatch({ type: 'SELECT_ELEMENTS', ids: [clickedElement.id] });
        setDragStart(point);
        setIsDragging(true);
      } else {
        // Clear selection
        dispatch({ type: 'SELECT_ELEMENTS', ids: [] });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart || state.selectedElementIds.length === 0) return;

      const currentPoint = getCanvasPoint(e as any);
      const deltaX = currentPoint.x - dragStart.x;
      const deltaY = currentPoint.y - dragStart.y;

      // Move selected elements
      state.selectedElementIds.forEach(id => {
        const element = state.elements.find(el => el.id === id);
        if (element) {
          const newPoints = element.points.map(p => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }));
          
          dispatch({
            type: 'UPDATE_ELEMENT',
            id,
            element: { points: newPoints },
          });
        }
      });

      setDragStart(currentPoint);
      render();
    };

    const handleMouseUp = () => {
      if (isDragging && state.selectedElementIds.length > 0) {
        dispatch({ type: 'SAVE_STATE' });
      }
      setIsDragging(false);
      setDragStart(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementIds.length > 0) {
          dispatch({ type: 'DELETE_ELEMENTS', ids: state.selectedElementIds });
        }
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasRef, getCanvasPoint, clipToPageBounds, getPageAtPoint, state, dispatch, isDragging, dragStart, render]);

  return null;
}