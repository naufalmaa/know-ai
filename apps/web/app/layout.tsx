import './globals.css' // <<— WAJIB supaya Tailwind aktif

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b">
          <div className="max-w-5xl mx-auto p-4 flex gap-4">
            <a href="/" className="font-bold">know-ai</a>
            <a href="/drive">Drive</a>
            <a href="/sections">Dashboard</a>
            <a href="/assistant">Assistant</a>
          </div>
        </header>
        <main className="max-w-5xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}
