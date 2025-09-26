import React, { useEffect } from 'react';
import { useDrawingContext, Point, DrawingElement } from '../../context/DrawingContext';

interface LineToolProps {
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

export function LineTool({
  canvasRef,
  getCanvasPoint,
  clipToPageBounds,
  getPageAtPoint,
  isDrawing,
  setIsDrawing,
  currentElement,
  setCurrentElement,
  render,
}: LineToolProps) {
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
        id: `line-${Date.now()}`,
        type: 'line',
        points: [clippedPoint, clippedPoint],
        style: {
          strokeColor: state.toolSettings.line.strokeColor,
          strokeWidth: state.toolSettings.line.strokeWidth,
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
      
      const updatedElement = {
        ...currentElement,
        points: [currentElement.points[0], clippedPoint],
        measurements: {
          length: Math.sqrt(
            Math.pow(clippedPoint.x - currentElement.points[0].x, 2) +
            Math.pow(clippedPoint.y - currentElement.points[0].y, 2)
          ),
        },
      };

      setCurrentElement(updatedElement);
      render();
    };

    const handleMouseUp = () => {
      if (isDrawing && currentElement) {
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