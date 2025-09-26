import { useEffect, useState } from 'react';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { LayerPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { PagesPanel } from './components/PagesPanel';
import { DrawingContextProvider } from './context/DrawingContext';
import { NavFileControls } from './components/NavFileControls';
import { Layers, Settings } from 'lucide-react';

function App() {
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [activeNav, setActiveNav] = useState<'layers' | 'properties' | 'export' | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(t);
  }, [notice]);

  const showNotice = (type: 'success' | 'error', text: string) => setNotice({ type, text });

  const closeAllNav = () => setActiveNav(null);

  return (
    <DrawingContextProvider>
      <div className="h-screen bg-app text-white flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-panel border-b border-app px-4 py-3 flex items-center justify-between shadow-lg relative">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold" style={{ color: '#3ED3C9' }}>LineAccurate</h1>
            <div className="flex items-center space-x-2 text-sm text-muted">
              <span>v1.0</span>
              <span>•</span>
              <span>Projection Drawing Tool</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <NavFileControls
              activeKey={activeNav}
              onToggle={(key) => {
                if (key === 'export') {
                  setActiveNav(prev => (prev === 'export' ? null : 'export'));
                }
              }}
              onCloseAll={closeAllNav}
              showNotice={showNotice}
            />
            <button
              onClick={() => {
                setActiveNav(prev => (prev === 'layers' ? null : 'layers'));
                setShowLayersPanel(v => !v);
                if (showPropertiesPanel) setShowPropertiesPanel(false);
              }}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                showLayersPanel ? 'bg-blue-600' : ''
              }`}
              title="Toggle Layers Panel"
            >
              <Layers size={18} />
            </button>
            <button
              onClick={() => {
                setActiveNav(prev => (prev === 'properties' ? null : 'properties'));
                setShowPropertiesPanel(v => !v);
                if (showLayersPanel) setShowLayersPanel(false);
              }}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                showPropertiesPanel ? 'bg-blue-600' : ''
              }`}
              title="Toggle Properties Panel"
            >
              <Settings size={18} />
            </button>
          </div>

          {notice && (
            <div
              role={notice.type === 'error' ? 'alert' : 'status'}
              className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 rounded text-sm shadow-lg border z-50 
                ${notice.type === 'success' ? 'bg-green-600/90 border-green-500 text-white' : 'bg-red-600/90 border-red-500 text-white'}
                transition-all duration-300 ease-out`}
            >
              {notice.text}
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="h-full bg-panel border-r border-app shadow-lg">
            <Toolbar />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#0E1117' }}>
            <DrawingCanvas onCursorMove={setCursorPosition} />
          </div>

          {/* Right Panels */}
          <div className="relative z-10 flex flex-col" style={{ width: '269px' }}>
            <div className="shrink-0 h-full overflow-y-auto overflow-x-hidden bg-panel border-l border-app shadow-lg">
              <div className="w-64 shrink-0">
                <PagesPanel />
              </div>
              {showLayersPanel && (
                <div className="w-64 shrink-0">
                  <LayerPanel />
                </div>
              )}
              {showPropertiesPanel && (
                <div className="w-64 shrink-0">
                  <PropertiesPanel />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <StatusBar cursorPosition={cursorPosition} />
      </div>
    </DrawingContextProvider>
  );
}

export default App;