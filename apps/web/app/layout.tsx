import './globals.css' // <<— WAJIB supaya Tailwind aktif
import ConditionalLayout from '@/components/layout/ConditionalLayout'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  )
}
