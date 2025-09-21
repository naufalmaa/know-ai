import './globals.css' // <<— WAJIB supaya Tailwind aktif

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b bg-white shadow-sm">
          <div className="max-w-7xl mx-auto p-4 flex gap-6">
            <a href="/" className="font-bold text-lg text-blue-600">know-ai</a>
            <div className="flex gap-4">
              <a href="/drive" className="hover:text-blue-600 transition-colors">Drive</a>
              <a href="/sections" className="hover:text-blue-600 transition-colors">Dashboard</a>
              <a href="/chat" className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">🤖 Zara AI</a>
            </div>
          </div>
        </header>
        <main className="max-w-full">{children}</main>
      </body>
    </html>
  )
}
