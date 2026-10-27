import AppProviders from "@/components/AppProviders";
import BoneCursorEffects from "@/components/BoneCursorEffects";
import Footer from "@/components/Footer";
import Header from "@/layout/Header";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "PawTail · AHP",
  description: "PawTail pet care and supplies by AHP.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AppProviders>
            <BoneCursorEffects />
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
