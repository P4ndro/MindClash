import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ConvexClerkProvider from "@/components/ui/providers/ConvexClerkProvider";
import { UserSync } from "@/components/UserSync";

export const metadata: Metadata = {
  title: "Auth Starter",
  description: "Minimal Clerk + Convex auth starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <html lang="en">
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
