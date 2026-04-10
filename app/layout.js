import Script from "next/script";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Neural Cascade",
  description: "Brain activity visualizer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <head>
        <Script id="statcounter-config" strategy="afterInteractive">
          {`var sc_project=13215786;var sc_invisible=1;var sc_security="f32ad222";`}
        </Script>
        <Script
          id="statcounter-loader"
          src="https://www.statcounter.com/counter/counter.js"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {children}
        <noscript>
          <div className="statcounter">
            <a
              title="Web Analytics"
              href="https://statcounter.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                className="statcounter"
                src="https://c.statcounter.com/13215786/0/f32ad222/1/"
                alt="Web Analytics"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </a>
          </div>
        </noscript>
      </body>
    </html>
  );
}
