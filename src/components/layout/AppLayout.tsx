// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

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
