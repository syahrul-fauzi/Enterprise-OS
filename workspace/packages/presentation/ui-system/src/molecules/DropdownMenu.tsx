"use client";

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Transition } from '@headlessui/react';

const DropdownContext = createContext<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) {
  const { setIsOpen } = useContext(DropdownContext);
  const child = React.Children.only(children) as React.ReactElement;

  if (asChild) {
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        // Call existing onClick if present
        if (child.props.onClick) {
          child.props.onClick(e);
        }
        setIsOpen(prev => !prev);
      },
      "aria-haspopup": "menu",
      "aria-expanded": "true",
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      type="button"
      onClick={() => setIsOpen(prev => !prev)}
      aria-haspopup="menu"
      aria-expanded="true"
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, align = 'start', className = '' }: { children: React.ReactNode, align?: 'start' | 'end', className?: string }) {
  const { isOpen, setIsOpen } = useContext(DropdownContext);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  const alignmentClasses = align === 'end' ? 'right-0' : 'left-0';

  return (
    <Transition
      show={isOpen}
      as="div"
      ref={menuRef}
      className={`absolute z-10 mt-2 w-56 origin-top-right rounded-lg bg-surface-elevated shadow-xl ring-1 ring-surface-border focus:outline-none ${alignmentClasses} ${className}`}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
    >
      <div className="py-1" role="none">
        {children}
      </div>
    </Transition>
  );
}

export function DropdownMenuItem({ children, onSelect }: { children: React.ReactNode, onSelect?: () => void }) {
    const { setIsOpen } = useContext(DropdownContext);
    return (
      <a
        href="#"
        className="text-text-primary block px-4 py-2 text-sm hover:bg-surface-background cursor-pointer"
        role="menuitem"
        onClick={(e) => {
          e.preventDefault();
          onSelect?.();
          setIsOpen(false);
        }}
      >
        {children}
      </a>
    );
}

export function DropdownMenuSeparator() {
  return <div className="border-t border-gray-200 my-1" />;
}