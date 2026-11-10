import type { Metadata } from 'next';
import './globals.css';
import './journey.css';

export const metadata: Metadata = {
  title: 'The Vivid View - Ideas Without Edges.',
  description: 'An independent, full-service creative agency in Hyderabad. Branding, digital marketing, media production, design, web development and SEO.',

};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
