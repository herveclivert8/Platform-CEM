import { Outlet, ScrollRestoration } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { DonationModal } from "../donation/DonationModal";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <DonationModal />
      {/* New page: back to the top; browser Back: previous scroll position */}
      <ScrollRestoration />
    </div>
  );
}
