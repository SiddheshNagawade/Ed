import React, { useEffect } from 'react';
import { useDrawingContext, Point, DrawingElement } from '../../context/DrawingContext';

interface FreehandToolProps {
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

export function FreehandTool({
  canvasRef,
  getCanvasPoint,
  clipToPageBounds,
  getPageAtPoint,
  isDrawing,
  setIsDrawing,
  currentElement,
  setCurrentElement,
  render,
}: FreehandToolProps) {
  const { state, dispatch } = useDrawingContext();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const point = getCanvasPoint(e as any);
      
      // Only allow drawing within page bounds
      if (!getPageAtPoint(point)) return;
      
      const clippedPoint = clipToPageBounds(point);
      
      const newElement: DrawingElement = {
        id: `freehand-${Date.now()}`,
        type: 'freehand',
        points: [clippedPoint],
        style: {
          strokeColor: state.toolSettings.freehand.strokeColor,
          strokeWidth: state.toolSettings.freehand.strokeWidth,
        },
        layerId: state.currentLayerId,
      };

      setCurrentElement(newElement);
      setIsDrawing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing || !currentElement) return;

      const point = getCanvasPoint(e as any);
      const clippedPoint = clipToPageBounds(point);
      
      // Add smoothing by only adding points that are far enough apart
      const lastPoint = currentElement.points[currentElement.points.length - 1];
      const distance = Math.sqrt(
        Math.pow(clippedPoint.x - lastPoint.x, 2) + Math.pow(clippedPoint.y - lastPoint.y, 2)
      );
      
      if (distance > 2) { // Minimum distance for smoother lines
        const updatedElement = {
          ...currentElement,
          points: [...currentElement.points, clippedPoint],
        };

        setCurrentElement(updatedElement);
        render();
      }
    };

    const handleMouseUp = () => {
      if (isDrawing && currentElement && currentElement.points.length > 1) {
        dispatch({ type: 'ADD_ELEMENT', element: currentElement });
        setCurrentElement(null);
        setIsDrawing(false);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, getCanvasPoint, clipToPageBounds, getPageAtPoint, isDrawing, currentElement, setIsDrawing, setCurrentElement, render, state, dispatch]);

  return null;
}