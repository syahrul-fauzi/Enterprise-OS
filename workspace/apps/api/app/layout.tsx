// Root layout for API server (localhost:3000)
// Provides Tailwind CSS support and global metadata
export const metadata = {
  title: 'EOS API Server',
  description: 'Enterprise Operating System - Core API Layer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}