import React, { useEffect, useState } from 'react';
import { useDrawingContext, Point, DrawingElement } from '../../context/DrawingContext';

interface ArcToolProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  getCanvasPoint: (e: React.MouseEvent) => Point;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  currentElement: DrawingElement | null;
  setCurrentElement: (element: DrawingElement | null) => void;
  render: () => void;
}

export function ArcTool({
  canvasRef,
  getCanvasPoint,
  isDrawing,
  setIsDrawing,
  currentElement,
  setCurrentElement,
  render,
}: ArcToolProps) {
  const { state, dispatch } = useDrawingContext();
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const point = getCanvasPoint(e as any);

      if (clickCount === 0) {
        // First click: set center
        const newElement: DrawingElement = {
          id: `arc-${Date.now()}`,
          type: 'arc',
          points: [point],
          style: {
            strokeColor: state.layers.find(l => l.id === state.currentLayerId)?.color || '#ffffff',
            strokeWidth: 2,
          },
          layerId: state.currentLayerId,
        };

        setCurrentElement(newElement);
        setClickCount(1);
      } else if (clickCount === 1) {
        // Second click: set radius
        if (currentElement) {
          const updatedElement = {
            ...currentElement,
            points: [...currentElement.points, point],
          };
          setCurrentElement(updatedElement);
          setClickCount(2);
          setIsDrawing(true);
        }
      } else if (clickCount === 2) {
        // Third click: complete arc
        if (currentElement) {
          const finalElement = {
            ...currentElement,
            points: [...currentElement.points, point],
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

      if (clickCount === 1) {
        // Show radius preview
        const updatedElement = {
          ...currentElement,
          points: [currentElement.points[0], point],
          measurements: {
            radius: Math.sqrt(
              Math.pow(point.x - currentElement.points[0].x, 2) +
              Math.pow(point.y - currentElement.points[0].y, 2)
            ),
          },
        };
        setCurrentElement(updatedElement);
        render();
      } else if (clickCount === 2 && isDrawing) {
        // Show arc preview
        const center = currentElement.points[0];
        const radiusPoint = currentElement.points[1];
        const radius = Math.sqrt(
          Math.pow(radiusPoint.x - center.x, 2) +
          Math.pow(radiusPoint.y - center.y, 2)
        );
        
        const startAngle = Math.atan2(radiusPoint.y - center.y, radiusPoint.x - center.x);
        const endAngle = Math.atan2(point.y - center.y, point.x - center.x);
        let angleDiff = endAngle - startAngle;
        
        if (angleDiff < 0) {
          angleDiff += 2 * Math.PI;
        }

        const updatedElement = {
          ...currentElement,
          points: [center, radiusPoint, point],
          measurements: {
            radius,
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
  }, [canvasRef, getCanvasPoint, isDrawing, currentElement, setIsDrawing, setCurrentElement, render, state, dispatch, clickCount]);

  // Reset click count when tool changes
  useEffect(() => {
    if (state.currentTool !== 'arc') {
      setClickCount(0);
      setCurrentElement(null);
      setIsDrawing(false);
    }
  }, [state.currentTool, setCurrentElement, setIsDrawing]);

  return null;
}