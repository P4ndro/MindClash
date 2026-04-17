import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ConvexClerkProvider from "@/components/ui/providers/ConvexClerkProvider";
import { UserSync } from "@/components/UserSync";

export const metadata: Metadata = {
  title: "MindClash Dashboard",
  description: "The Intellectual Arena",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body>
        <div className="page-shell">
          <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
            <ConvexClerkProvider>
              {hasConvexUrl ? <UserSync /> : null}
              {children}
            </ConvexClerkProvider>
          </ClerkProvider>
        </div>
      </body>
    </html>
  );
}
