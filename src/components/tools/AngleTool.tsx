import React, { useEffect, useState } from 'react';
import { useDrawingContext, Point, DrawingElement } from '../../context/DrawingContext';

interface AngleToolProps {
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

export function AngleTool({
  canvasRef,
  getCanvasPoint,
  clipToPageBounds,
  getPageAtPoint,
  isDrawing,
  setIsDrawing,
  currentElement,
  setCurrentElement,
  render,
}: AngleToolProps) {
  const { state, dispatch } = useDrawingContext();
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const point = getCanvasPoint(e as any);

      // Only allow drawing within page bounds
      if (!getPageAtPoint(point)) return;
      
      const clippedPoint = clipToPageBounds(point);

      if (clickCount === 0) {
        // First click: set baseline starting point
        const newElement: DrawingElement = {
          id: `angle-${Date.now()}`,
          type: 'angle',
          points: [clippedPoint],
          style: {
            strokeColor: state.toolSettings.angle.strokeColor,
            strokeWidth: state.toolSettings.angle.strokeWidth,
          },
          layerId: state.currentLayerId,
        };

        setCurrentElement(newElement);
        setClickCount(1);
      } else if (clickCount === 1) {
        // Second click: set center point
        if (currentElement) {
          const updatedElement = {
            ...currentElement,
            points: [...currentElement.points, clippedPoint],
          };
          setCurrentElement(updatedElement);
          setClickCount(2);
          setIsDrawing(true);
        }
      } else if (clickCount === 2) {
        // Third click: complete angle
        if (currentElement) {
          const baseline = currentElement.points[0];
          const center = currentElement.points[1];
          
          const baselineAngle = Math.atan2(baseline.y - center.y, baseline.x - center.x);
          const endpointAngle = Math.atan2(point.y - center.y, point.x - center.x);
          
          let angleDiff = endpointAngle - baselineAngle;
          if (angleDiff < 0) {
            angleDiff += 2 * Math.PI;
          }
          
          const finalElement = {
            ...currentElement,
            points: [...currentElement.points, clippedPoint],
            measurements: {
              angle: angleDiff,
            },
          };
          
          dispatch({ type: 'ADD_ELEMENT', element: finalElement });
          setCurrentElement(null);
          setIsDrawing(false);
          setClickCount(0);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!currentElement) return;

      const point = getCanvasPoint(e as any);
      const clippedPoint = clipToPageBounds(point);

      if (clickCount === 1) {
        // Show baseline preview
        const updatedElement = {
          ...currentElement,
          points: [currentElement.points[0], clippedPoint],
        };
        setCurrentElement(updatedElement);
        render();
      } else if (clickCount === 2 && isDrawing) {
        // Show angle preview
        const baseline = currentElement.points[0];
        const center = currentElement.points[1];
        
        const baselineAngle = Math.atan2(baseline.y - center.y, baseline.x - center.x);
        const endpointAngle = Math.atan2(clippedPoint.y - center.y, clippedPoint.x - center.x);
        
        let angleDiff = endpointAngle - baselineAngle;
        if (angleDiff < 0) {
          angleDiff += 2 * Math.PI;
        }

        const updatedElement = {
          ...currentElement,
          points: [baseline, center, clippedPoint],
          measurements: {
            angle: angleDiff,
          },
        };
        
        setCurrentElement(updatedElement);
        render();
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [canvasRef, getCanvasPoint, clipToPageBounds, getPageAtPoint, isDrawing, currentElement, setIsDrawing, setCurrentElement, render, state, dispatch, clickCount]);

  // Reset click count when tool changes
  useEffect(() => {
    if (state.currentTool !== 'angle') {
      setClickCount(0);
      setCurrentElement(null);
      setIsDrawing(false);
    }
  }, [state.currentTool, setCurrentElement, setIsDrawing]);

  return null;
}