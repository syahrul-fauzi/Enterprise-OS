'use client';

import React from 'react';
import type { RealityWorkItem } from '../contracts/my-reality.contracts';
import { MyRealityWorkList } from './MyRealityWorkList';

interface WorkSectionProps {
  title: string;
  works: RealityWorkItem[];
  onWorkClick: (workId: string) => void;
}

export function WorkSection({ title, works, onWorkClick }: WorkSectionProps) {
  if (works.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
      <MyRealityWorkList items={works} onWorkClick={onWorkClick} />
    </section>
  );
}