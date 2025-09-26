import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import { useDrawingContext, Layer } from '../context/DrawingContext';

export function LayerPanel() {
  const { state, dispatch } = useDrawingContext();
  const [newLayerName, setNewLayerName] = useState('');

  const handleAddLayer = () => {
    if (newLayerName.trim()) {
      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: newLayerName.trim(),
        visible: true,
        locked: false,
        color: '#ffffff',
      };
      dispatch({ type: 'ADD_LAYER', layer: newLayer });
      setNewLayerName('');
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    if (state.layers.length <= 1) return; // prevent deleting last layer
    dispatch({ type: 'DELETE_LAYER', id: layerId });
  };

  const toggleLayerVisibility = (layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      dispatch({
        type: 'UPDATE_LAYER',
        id: layerId,
        layer: { visible: !layer.visible },
      });
    }
  };

  const toggleLayerLock = (layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      dispatch({
        type: 'UPDATE_LAYER',
        id: layerId,
        layer: { locked: !layer.locked },
      });
    }
  };

  const setCurrentLayer = (layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer && !layer.locked) {
      dispatch({ type: 'SET_CURRENT_LAYER', id: layerId });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-lg mb-3 flex items-center justify-between">
          <span>Layers</span>
          {state.layers.length > 1 && state.currentLayerId && (
            <button
              onClick={() => handleDeleteLayer(state.currentLayerId)}
              className="p-1 rounded hover:bg-gray-700"
              title="Delete current layer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </h3>
        
        {/* Add New Layer */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            placeholder="Layer name"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddLayer()}
          />
          <button
            onClick={handleAddLayer}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            title="Add Layer"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.layers.map((layer) => (
          <div
            key={layer.id}
            className={`p-3 border-b border-gray-700 cursor-pointer transition-colors ${
              state.currentLayerId === layer.id
                ? 'bg-blue-600 bg-opacity-20 border-blue-500'
                : 'hover:bg-gray-700'
            }`}
            onClick={() => setCurrentLayer(layer.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded border border-gray-500"
                  style={{ backgroundColor: layer.color }}
                ></div>
                <span className={`text-sm ${layer.locked ? 'text-gray-400' : ''}`}>
                  {layer.name}
                </span>
                {state.currentLayerId === layer.id && (
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded">Current</span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>

                {state.currentLayerId === layer.id && state.layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                    title="Delete Layer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {state.currentLayerId === layer.id && (
              <div className="mt-2 text-xs text-gray-400">
                Objects: {state.elements.filter(el => el.layerId === layer.id).length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}