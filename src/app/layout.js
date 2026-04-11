import "./globals.css";
import { AuthProvider } from "../../context/AuthContext";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import ThemeInitializer from "@/src/components/ThemeInitializer";

export const metadata = {
  title: "LearnToType - Master Your Typing Skills",
  description: "Intuitive Typing Practice Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var local = localStorage.getItem('ltt_settings');
                  var theme = null;
                  if (local) {
                    theme = JSON.parse(local).theme;
                  }
                  if (!theme || theme === 'auto') {
                    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
                    document.body.classList.add('theme-auto');
                  } else {
                    document.body.classList.add('theme-' + theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <AuthProvider>
          <ThemeInitializer />
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
