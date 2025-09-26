import React, { useEffect, useState } from 'react';
import { useDrawingContext, Point, DrawingElement } from '../../context/DrawingContext';

interface EraserToolProps {
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

export function EraserTool({
  canvasRef,
  getCanvasPoint,
  clipToPageBounds,
  getPageAtPoint,
  isDrawing,
  setIsDrawing,
  currentElement,
  setCurrentElement,
  render,
}: EraserToolProps) {
  const { state, dispatch } = useDrawingContext();

  const isPointNearLine = (point: Point, lineStart: Point, lineEnd: Point, threshold: number): boolean => {
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

  const findElementsToErase = (point: Point): string[] => {
    const eraserSize = state.toolSettings.eraser.strokeWidth / 2;
    const elementsToErase: string[] = [];

    state.elements.forEach(element => {
      const layer = state.layers.find(l => l.id === element.layerId);
      if (!layer?.visible || layer.locked) return;

      let shouldErase = false;

      switch (element.type) {
        case 'line':
          if (element.points.length >= 2) {
            shouldErase = isPointNearLine(point, element.points[0], element.points[1], eraserSize);
          }
          break;
        case 'angle':
          if (element.points.length >= 3) {
            const baseline = element.points[0];
            const center = element.points[1];
            const endpoint = element.points[2];
            
            shouldErase = isPointNearLine(point, baseline, center, eraserSize) || 
                         isPointNearLine(point, center, endpoint, eraserSize);
          }
          break;
        case 'freehand':
          for (let j = 0; j < element.points.length - 1; j++) {
            if (isPointNearLine(point, element.points[j], element.points[j + 1], eraserSize)) {
              shouldErase = true;
              break;
            }
          }
          break;
        case 'text':
          if (element.points.length > 0 && element.text) {
            const textPoint = element.points[0];
            const fontSize = element.fontSize || 14;
            const textWidth = element.text.length * fontSize * 0.6;
            
            if (point.x >= textPoint.x - eraserSize && point.x <= textPoint.x + textWidth + eraserSize &&
                point.y >= textPoint.y - eraserSize && point.y <= textPoint.y + fontSize + eraserSize) {
              shouldErase = true;
            }
          }
          break;
      }

      if (shouldErase) {
        elementsToErase.push(element.id);
      }
    });

    return elementsToErase;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const point = getCanvasPoint(e as any);
      
      // Only allow erasing within page bounds
      if (!getPageAtPoint(point)) return;
      
      const elementsToErase = findElementsToErase(point);
      
      if (elementsToErase.length > 0) {
        dispatch({ type: 'DELETE_ELEMENTS', ids: elementsToErase });
      }
      
      setIsDrawing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;

      const point = getCanvasPoint(e as any);
      
      // Only erase within page bounds
      if (!getPageAtPoint(point)) return;
      
      const elementsToErase = findElementsToErase(point);
      
      if (elementsToErase.length > 0) {
        dispatch({ type: 'DELETE_ELEMENTS', ids: elementsToErase });
      }
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        dispatch({ type: 'SAVE_STATE' });
      }
      setIsDrawing(false);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, getCanvasPoint, clipToPageBounds, getPageAtPoint, isDrawing, setIsDrawing, state, dispatch]);

  return null;
}