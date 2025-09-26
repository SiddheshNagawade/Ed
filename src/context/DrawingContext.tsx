import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type Tool = 'select' | 'line' | 'angle' | 'freehand' | 'eraser' | 'text';
export type Units = 'mm' | 'cm' | 'in' | 'ft';

// A4 dimensions in mm
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const MM_TO_PX = 3.779527559; // 96 DPI conversion
export const PAGE_MARGIN = 20; // Margin between pages in pixels

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: 'line' | 'angle' | 'freehand' | 'text';
  points: Point[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
  };
  layerId: string;
  text?: string;
  fontSize?: number;
  measurements?: {
    length?: number;
    radius?: number;
    angle?: number;
  };
  selected?: boolean;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export interface ToolSettings {
  line: { strokeWidth: number; strokeColor: string };
  angle: { strokeWidth: number; strokeColor: string };
  freehand: { strokeWidth: number; strokeColor: string };
  text: { fontSize: number; strokeColor: string };
  eraser: { strokeWidth: number };
}

export interface DrawingState {
  currentTool: Tool;
  elements: DrawingElement[];
  selectedElementIds: string[];
  layers: Layer[];
  currentLayerId: string;
  gridSize: number;
  gridVisible: boolean;
  snapToGrid: boolean;
  units: Units;
  zoom: number;
  panOffset: Point;
  history: DrawingElement[][];
  historyIndex: number;
  toolSettings: ToolSettings;
  isDragging: boolean;
  dragStart: Point | null;
  editingElement: string | null;
  savedProjects: { id: string; name: string; data: DrawingElement[]; timestamp: number }[];
  currentProjectName: string;
  snapThreshold: number;
  currentPage: number;
  totalPages: number;
  pageWidth: number; // A4 width in pixels
  pageHeight: number; // A4 height in pixels
  minZoom: number; // dynamically computed lower bound for zoom based on viewport/content
}

type DrawingAction =
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'ADD_ELEMENT'; element: DrawingElement }
  | { type: 'UPDATE_ELEMENT'; id: string; element: Partial<DrawingElement> }
  | { type: 'DELETE_ELEMENTS'; ids: string[] }
  | { type: 'SELECT_ELEMENTS'; ids: string[] }
  | { type: 'REPLACE_ELEMENTS'; elements: DrawingElement[] }
  | { type: 'SET_GRID_SIZE'; size: number }
  | { type: 'TOGGLE_GRID'; visible?: boolean }
  | { type: 'TOGGLE_SNAP'; snap?: boolean }
  | { type: 'SET_UNITS'; units: Units }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; offset: Point }
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'UPDATE_LAYER'; id: string; layer: Partial<Layer> }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'SET_CURRENT_LAYER'; id: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_STATE' }
  | { type: 'UPDATE_TOOL_SETTINGS'; tool: keyof ToolSettings; settings: Partial<ToolSettings[keyof ToolSettings]> }
  | { type: 'SET_DRAGGING'; isDragging: boolean; dragStart?: Point | null }
  | { type: 'SET_EDITING_ELEMENT'; id: string | null }
  | { type: 'SAVE_PROJECT'; name: string }
  | { type: 'LOAD_PROJECT'; id: string }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_CURRENT_PAGE'; page: number }
  | { type: 'ADD_PAGE' }
  | { type: 'DELETE_PAGE'; page: number }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'SET_MIN_ZOOM'; minZoom: number };

const initialState: DrawingState = {
  currentTool: 'select',
  elements: [],
  selectedElementIds: [],
  layers: [
    { id: 'layer-1', name: 'Layer 1', visible: true, locked: false, color: '#ffffff' },
    { id: 'layer-2', name: 'Dimensions', visible: true, locked: false, color: '#00ff00' },
    { id: 'layer-3', name: 'Construction', visible: true, locked: false, color: '#ffff00' }
  ],
  currentLayerId: 'layer-1',
  gridSize: 10,
  gridVisible: true,
  snapToGrid: true,
  units: 'mm',
  zoom: 1.0, // Start at 100% zoom
  panOffset: { x: 0, y: 0 },
  history: [[]],
  historyIndex: 0,
  toolSettings: {
    line: { strokeWidth: 2, strokeColor: '#ffffff' },
    angle: { strokeWidth: 2, strokeColor: '#00ff00' },
    freehand: { strokeWidth: 2, strokeColor: '#ffffff' },
    text: { fontSize: 14, strokeColor: '#ffffff' },
    eraser: { strokeWidth: 10 },
  },
  isDragging: false,
  dragStart: null,
  editingElement: null,
  savedProjects: [],
  currentProjectName: 'Untitled Project',
  snapThreshold: 7,
  currentPage: 1,
  totalPages: 1,
  pageWidth: Math.round(A4_WIDTH_MM * MM_TO_PX), // 794 pixels
  pageHeight: Math.round(A4_HEIGHT_MM * MM_TO_PX), // 1123 pixels
  minZoom: 0.5,
};

function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, currentTool: action.tool, selectedElementIds: [], editingElement: null };
    
    case 'ADD_ELEMENT':
      const newElements = [...state.elements, action.element];
      return {
        ...state,
        elements: newElements,
        history: [...state.history.slice(0, state.historyIndex + 1), newElements],
        historyIndex: state.historyIndex + 1,
      };
    
    case 'UPDATE_ELEMENT':
      const updatedElements = state.elements.map(el =>
        el.id === action.id ? { ...el, ...action.element } : el
      );
      return { ...state, elements: updatedElements };
    
    case 'DELETE_ELEMENTS':
      const filteredElements = state.elements.filter(el => !action.ids.includes(el.id));
      return {
        ...state,
        elements: filteredElements,
        selectedElementIds: [],
        history: [...state.history.slice(0, state.historyIndex + 1), filteredElements],
        historyIndex: state.historyIndex + 1,
      };
    
    case 'REPLACE_ELEMENTS': {
      const next = action.elements;
      return {
        ...state,
        elements: next,
        selectedElementIds: [],
        history: [...state.history.slice(0, state.historyIndex + 1), next],
        historyIndex: state.historyIndex + 1,
      };
    }
    
    case 'SELECT_ELEMENTS':
      return { ...state, selectedElementIds: action.ids };
    
    case 'SET_GRID_SIZE':
      return { ...state, gridSize: Math.max(1, action.size) };
    
    case 'TOGGLE_GRID':
      return { ...state, gridVisible: action.visible ?? !state.gridVisible };
    
    case 'TOGGLE_SNAP':
      return { ...state, snapToGrid: action.snap ?? !state.snapToGrid };
    
    case 'SET_UNITS':
      return { ...state, units: action.units };
    
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(state.minZoom, Math.min(3, action.zoom)) };
    
    case 'SET_PAN':
      return { ...state, panOffset: action.offset };
    
    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.layer] };
    
    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.id ? { ...layer, ...action.layer } : layer
        ),
      };
    
    case 'DELETE_LAYER': {
      if (state.layers.length <= 1) return state;
      const layers = state.layers.filter(l => l.id !== action.id);
      const currentLayerId = state.currentLayerId === action.id ? layers[0].id : state.currentLayerId;
      // Remove any selected elements on deleted layer
      const elements = state.elements.filter(el => el.layerId !== action.id);
      return { ...state, layers, currentLayerId, elements };
    }
    
    case 'SET_CURRENT_LAYER':
      return { ...state, currentLayerId: action.id };
    
    case 'UNDO':
      if (state.historyIndex > 0) {
        return {
          ...state,
          elements: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
          selectedElementIds: [],
        };
      }
      return state;
    
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          elements: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
          selectedElementIds: [],
        };
      }
      return state;
    
    case 'SAVE_STATE':
      return {
        ...state,
        history: [...state.history.slice(0, state.historyIndex + 1), state.elements],
        historyIndex: state.historyIndex + 1,
      };

    case 'UPDATE_TOOL_SETTINGS':
      return {
        ...state,
        toolSettings: {
          ...state.toolSettings,
          [action.tool]: {
            ...state.toolSettings[action.tool],
            ...action.settings,
          },
        },
      };

    case 'SET_DRAGGING':
      return { 
        ...state, 
        isDragging: action.isDragging,
        dragStart: action.dragStart !== undefined ? action.dragStart : state.dragStart
      };

    case 'SET_EDITING_ELEMENT':
      return { ...state, editingElement: action.id };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: Math.max(1, Math.min(action.page, state.totalPages)) };
    
    case 'ADD_PAGE':
      return { 
        ...state, 
        totalPages: state.totalPages + 1,
        currentPage: state.totalPages + 1 // Navigate to the new page
      };
    
    case 'DELETE_PAGE':
      if (state.totalPages <= 1) return state;
      const newTotalPages = state.totalPages - 1;
      const newCurrentPage = action.page <= state.currentPage && state.currentPage > 1 
        ? state.currentPage - 1 
        : state.currentPage > newTotalPages 
        ? newTotalPages 
        : state.currentPage;
      return { 
        ...state, 
        totalPages: newTotalPages,
        currentPage: newCurrentPage
      };

    case 'SET_MIN_ZOOM':
      return { ...state, minZoom: Math.min(1, Math.max(0.1, action.minZoom)) };
    
    default:
      return state;
  }
}

const DrawingContext = createContext<{
  state: DrawingState;
  dispatch: React.Dispatch<DrawingAction>;
} | null>(null);

export function DrawingContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(drawingReducer, initialState);

  return (
    <DrawingContext.Provider value={{ state, dispatch }}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawingContext() {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawingContext must be used within a DrawingContextProvider');
  }
  return context;
}