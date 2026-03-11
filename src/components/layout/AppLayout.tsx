import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ToastContainer } from './ToastContainer';
import { CommandPalette } from '../common/CommandPalette';
import { useUIStore } from '../../stores';

export function AppLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />
      <main
        className={`transition-all duration-300 ease-in-out min-h-screen ${
          collapsed ? 'ml-[68px]' : 'ml-[240px]'
        }`}
      >
        <Outlet />
      </main>
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}
