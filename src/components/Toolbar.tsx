import React from 'react';
import { MousePointer, Minus, PenTool, Eraser, RotateCcw, RotateCw, Ruler, Type } from 'lucide-react';
import { useDrawingContext, Tool, ToolSettings } from '../context/DrawingContext';

const tools: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer size={18} />, label: 'Select', shortcut: 'V' },
  { id: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
  { id: 'angle', icon: <Ruler size={18} />, label: 'Angle', shortcut: 'A' },
  { id: 'freehand', icon: <PenTool size={18} />, label: 'Freehand', shortcut: 'P' },
  { id: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser', shortcut: 'E' },
];

const thicknessPresets = [1, 2, 3];
export function Toolbar() {
  const { state, dispatch } = useDrawingContext();

  const handleToolSelect = (tool: Tool) => {
    dispatch({ type: 'SET_TOOL', tool });
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
  };

  const handleStrokeWidthChange = (tool: Tool, width: number) => {
    const adjustableTool = tool === 'select' ? 'line' : tool; // no settings for select
    dispatch({ type: 'UPDATE_TOOL_SETTINGS', tool: adjustableTool as keyof ToolSettings, settings: { strokeWidth: width } as any });
  };

  const handleColorChange = (tool: Tool, color: string) => {
    if (tool === 'eraser') return;
    const adjustableTool = tool === 'select' ? 'line' : tool;
    dispatch({ type: 'UPDATE_TOOL_SETTINGS', tool: adjustableTool as keyof ToolSettings, settings: { strokeColor: color } as any });
  };

  const getCurrentStrokeWidth = (): number => {
    switch (state.currentTool) {
      case 'line':
        return state.toolSettings.line.strokeWidth;
      case 'angle':
        return state.toolSettings.angle.strokeWidth;
      case 'freehand':
        return state.toolSettings.freehand.strokeWidth;
      case 'eraser':
        return state.toolSettings.eraser.strokeWidth;
      default:
        return 2;
    }
  };

  const getCurrentColor = (): string => {
    switch (state.currentTool) {
      case 'line':
        return state.toolSettings.line.strokeColor;
      case 'angle':
        return state.toolSettings.angle.strokeColor;
      case 'freehand':
        return state.toolSettings.freehand.strokeColor;
      case 'text':
        return state.toolSettings.text.strokeColor;
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="w-20 h-full p-2 flex flex-col space-y-2 bg-gray-800 overflow-y-auto overflow-x-hidden">
      {/* Quick Actions */}
      <div className="flex flex-col space-y-2">
        <button
          onClick={handleUndo}
          disabled={state.historyIndex <= 0}
          className="w-14 h-9 rounded-lg transition-all duration-200 group relative flex items-center justify-center bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          title="Undo (Ctrl/Cmd+Z)"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={handleRedo}
          disabled={state.historyIndex >= state.history.length - 1}
          className="w-14 h-9 rounded-lg transition-all duration-200 group relative flex items-center justify-center bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-600 my-2"></div>

      {/* Drawing Tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleToolSelect(tool.id)}
          className={`w-14 h-12 rounded-lg transition-all duration-200 group relative flex items-center justify-center ${
            state.currentTool === tool.id
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white hover:shadow-md'
          }`}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-gray-600">
            {tool.label} ({tool.shortcut})
          </div>
        </button>
      ))}

      {/* Separator */}
      <div className="h-px bg-gray-600 my-2"></div>

      {/* Tool Settings */}
      {state.currentTool !== 'select' && (
        <div className="space-y-2">
          {/* Thickness Presets */}
          {(state.currentTool === 'line' || state.currentTool === 'angle' || state.currentTool === 'freehand') && (
            <div className="px-1">
              <label className="block text-xs text-gray-400 mb-2 text-center">Thickness</label>
              <div className="flex flex-col space-y-1">
                {thicknessPresets.map((thickness) => (
                  <button
                    key={thickness}
                    onClick={() => handleStrokeWidthChange(state.currentTool, thickness)}
                    className={`w-12 h-8 rounded flex items-center justify-center transition-colors ${
                      getCurrentStrokeWidth() === thickness
                        ? 'bg-blue-500'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    <div
                      className="bg-white rounded-full"
                      style={{
                        width: `${thickness * 3 + 2}px`,
                        height: `${thickness * 3 + 2}px`,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Eraser Size */}
          {state.currentTool === 'eraser' && (
            <div className="px-2">
              <label className="block text-xs text-gray-400 mb-1 text-center">Size</label>
              <input
                type="range"
                min="5"
                max="50"
                value={getCurrentStrokeWidth() || 10}
                onChange={(e) => handleStrokeWidthChange(state.currentTool, Number(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-400 text-center mt-1">
                {getCurrentStrokeWidth() || 10}px
              </div>
            </div>
          )}

          {/* Font Size for Text Tool */}
          {state.currentTool === 'text' && (
            <div className="px-1">
              <label className="block text-xs text-gray-400 mb-1 text-center">Font Size</label>
              <input
                type="range"
                min="8"
                max="48"
                value={state.toolSettings.text.fontSize || 14}
                onChange={(e) => dispatch({ 
                  type: 'UPDATE_TOOL_SETTINGS', 
                  tool: 'text', 
                  settings: { fontSize: Number(e.target.value) } 
                })}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-400 text-center mt-1">
                {state.toolSettings.text.fontSize || 14}px
              </div>
            </div>
          )}

          {/* Legacy Stroke Width for other tools */}
          {!['line', 'angle', 'freehand', 'eraser', 'text'].includes(state.currentTool) && (
            <div className="px-2">
            <label className="block text-xs text-gray-400 mb-1">
              {state.currentTool === 'eraser' ? 'Size' : 'Width'}
            </label>
            <input
              type="range"
              min="1"
              max={state.currentTool === 'eraser' ? "50" : "20"}
              value={getCurrentStrokeWidth() || 2}
              onChange={(e) => handleStrokeWidthChange(state.currentTool, Number(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs text-gray-400 text-center mt-1">
              {getCurrentStrokeWidth() || 2}px
            </div>
          </div>
          )}

          {/* Color Picker (not for eraser) */}
          {!['eraser'].includes(state.currentTool) && (
            <div className="px-2">
              <label className="block text-xs text-gray-400 mb-1 text-center">Color</label>
              <input
                type="color"
                value={getCurrentColor()}
                onChange={(e) => handleColorChange(state.currentTool, e.target.value)}
                className="w-full h-8 rounded cursor-pointer border border-gray-600"
              />
            </div>
          )}
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-gray-600 my-2"></div>
    </div>
  );
}