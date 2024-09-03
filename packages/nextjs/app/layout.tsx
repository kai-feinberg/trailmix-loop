import "@rainbow-me/rainbowkit/styles.css";
import { Metadata } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { cn } from "~~/lib/utils";
import SideNavbar from "~~/components/SideNavbar";
import StrategyUpdater from "~~/components/StrategyUpdater";
import StrategyPriceUpdater from "~~/components/StrategyPriceUpdater";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `http://localhost:${process.env.PORT || 3000}`;
const imageUrl = `${baseUrl}/thumbnail.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "TrailMix",
    template: "%s | Scaffold-ETH 2",
  },
  description: "Automated risk management for crypto",
  openGraph: {
    title: {
      default: "Scaffold-ETH 2 App",
      template: "%s | Scaffold-ETH 2",
    },
    description: "Built with 🏗 Scaffold-ETH 2",
    images: [
      {
        url: imageUrl,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [imageUrl],
    title: {
      default: "Scaffold-ETH 2",
      template: "%s | Scaffold-ETH 2",
    },
    description: "Built with 🏗 Scaffold-ETH 2",
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
  },
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning lang="en">
      <ThemeProvider enableSystem>
        <ScaffoldEthAppWithProviders>

          <body className={cn(
            "w-full flex bg-gradient-to-b from-orange-100 to-orange-200 text-black",
          )}>
            <SideNavbar />
            <div className={cn(
              " w-full flex flex-col",
            )}>
              <StrategyUpdater />

              {/* <StrategyPriceUpdater /> */}
              <div className="p-8 w-full" >{children}</div>
            </div>
          </body>
        </ScaffoldEthAppWithProviders>
      </ThemeProvider>
    </html>
  );
};

export default ScaffoldEthApp;
