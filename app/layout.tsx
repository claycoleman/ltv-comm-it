import React from 'react';
import { Inter } from 'next/font/google';
import '../src/index.css';

// Initialize the Inter font
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'Community Exchange - Boston',
  description: 'Connect with your Boston community through offers and requests',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        {children}
      </body>
    </html>
  );
} 