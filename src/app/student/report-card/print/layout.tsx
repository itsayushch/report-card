import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Report Card - St. Helen\'s School',
}

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
