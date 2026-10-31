import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Promise Keeper',
  description:
    'One place to remember what brands promised you, notice what changed, and act with the evidence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
