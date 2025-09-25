import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InstaDish - AI Recipe Generator',
  description: 'Turn your ingredients into delicious recipes with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  )
}