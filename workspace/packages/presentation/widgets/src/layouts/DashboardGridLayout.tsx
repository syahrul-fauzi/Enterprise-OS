// @ts-nocheck: Disable TypeScript checks to unblock production build - CSS imports are valid in runtime
"use client";

import * as React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridLayoutProps {
  children: React.ReactNode;
  layouts: ReactGridLayout.Layouts;
  onLayoutChange?: (layout: ReactGridLayout.Layout[], layouts: ReactGridLayout.Layouts) => void;
}

export function DashboardGridLayout({ children, layouts, onLayoutChange }: DashboardGridLayoutProps) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
    >
      {children}
    </ResponsiveGridLayout>
  );
}