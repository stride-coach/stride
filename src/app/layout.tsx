import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToaster } from "@/features/theme/components/theme-toaster";
import { themeScript } from "@/features/theme/model";
import { cn } from "@/lib/utils";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Stride", template: "%s · Stride" },
  description: "Ton coach running personnel, sur route et en trail.",
  appleWebApp: {
    capable: true,
    title: "Stride",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efefec" },
    { media: "(prefers-color-scheme: dark)", color: "#070809" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(fontVariables, "h-full antialiased")}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full">
        <div
          aria-hidden="true"
          data-slot="top-edge"
          className="pointer-events-none fixed inset-x-0 top-0 z-40 hidden h-2 bg-background print:hidden [@media(display-mode:standalone)]:max-md:block"
        />
        <TooltipProvider>{children}</TooltipProvider>
        <ThemeToaster />
      </body>
    </html>
  );
}
