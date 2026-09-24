import React from "react";

// This layout ensures that pages like login and signup don't inherit the
// main application layout, which includes components like GlobalNavigation.
// This is crucial for preventing build errors when a component in the main
// layout is broken, and also provides a clean slate for auth pages.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}