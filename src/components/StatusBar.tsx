import React from 'react';
import { useDrawingContext, Point } from '../context/DrawingContext';

interface StatusBarProps {
  cursorPosition: Point;
}

export function StatusBar({ cursorPosition }: StatusBarProps) {
  const { state } = useDrawingContext();

  const formatCoordinate = (value: number) => {
    return value.toFixed(2);
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Tool:</span>
          <span className="font-medium capitalize">{state.currentTool}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Layer:</span>
          <span className="font-medium">
            {state.layers.find(l => l.id === state.currentLayerId)?.name || 'Unknown'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Grid:</span>
          <span className="font-medium">{state.gridSize} {state.units}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Snap:</span>
          <span className={`font-medium ${state.snapToGrid ? 'text-green-400' : 'text-red-400'}`}>
            {state.snapToGrid ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Zoom:</span>
          <span className="font-medium">{(state.zoom * 100).toFixed(0)}%</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Objects:</span>
          <span className="font-medium">{state.elements.length}</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">X:</span>
            <span className="font-mono font-medium w-16 text-right">
              {formatCoordinate(cursorPosition.x)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Y:</span>
            <span className="font-mono font-medium w-16 text-right">
              {formatCoordinate(cursorPosition.y)}
            </span>
          </div>
          <span className="text-gray-400">{state.units}</span>
        </div>
      </div>
    </div>
  );
}