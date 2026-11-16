import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overlord — Dark Web Monitoring",
  description:
    "Malaysia-first dark-web monitoring console for CTI analysts.",
};

const themeBoot = `(function(){try{var t=localStorage.getItem("overlord-theme");if(t==="night")t="obsidian";if(t==="day")t="graphite";var ok=["obsidian","mangrove","graphite","phosphor","cobalt","violet"];if(ok.indexOf(t)>=0)document.documentElement.dataset.theme=t;var l=localStorage.getItem("overlord-locale");if(l==="ms"||l==="en")document.documentElement.lang=l;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="obsidian"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="flex h-full min-h-0 flex-col overflow-hidden font-[family-name:var(--font-ui)]">
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
