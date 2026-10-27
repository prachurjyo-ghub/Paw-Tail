import AppProviders from "@/components/AppProviders";
import "./globals.css";

export const metadata = {
  title: "Paw Tail Admin",
  description: "Paw Tail admin dashboard",
};

export default function RootLayout({ children }) {
  const themeScript = `
    try {
      const stored = localStorage.getItem("pawtail-admin-theme");
      const theme = stored === "dark" || stored === "light"
        ? stored
        : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
