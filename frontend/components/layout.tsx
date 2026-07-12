import Link from "next/link";
import { Bus, User, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

function getUserToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("user_token");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const isLoggedIn = !!getUserToken();

  return (
    <div className="min-h-screen flex flex-col bg-[#f4fcf4] text-[#1a331a] selection:bg-[#c2f0c2] selection:text-[#0f240f]">
      <header className="sticky top-0 z-50 w-full border-b border-[#c2f0c2] bg-[#f4fcf4]/80 backdrop-blur-md supports-backdrop-filter:bg-[#f4fcf4]/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-2xl font-black tracking-tight text-[#142914] group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e1f8e1] flex items-center justify-center group-hover:bg-[#4ade80] transition-colors">
              <Bus className="h-6 w-6 text-[#3aa53a] group-hover:text-[#142914] transition-colors" />
            </div>
            <span>ArriveLink</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-[#3b6b3b] hover:text-[#142914] hover:bg-[#e1f8e1] font-semibold">
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-[#3b6b3b] hover:text-[#142914] hover:bg-[#e1f8e1] font-semibold">
              <Link href="/bookings">
                <Ticket className="h-4 w-4 mr-1.5" />
                My Bookings
              </Link>
            </Button>
            {isLoggedIn ? (
              <Button variant="ghost" size="sm" asChild className="text-[#3b6b3b] hover:text-[#142914] hover:bg-[#e1f8e1] font-semibold">
                <Link href="/app">
                  <User className="h-4 w-4 mr-1.5" />
                  My Account
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" asChild className="text-[#3b6b3b] hover:text-[#142914] hover:bg-[#e1f8e1] font-semibold">
                <Link href="/app/login">Sign In</Link>
              </Button>
            )}
            <Button size="sm" asChild className="bg-[#3aa53a] hover:bg-[#2c842c] text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5">
              <Link href="/business/login">For Business</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#c2f0c2] py-16 bg-[#eaffea]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <Link
                href="/"
                className="flex items-center gap-2 font-display text-2xl font-black tracking-tight text-[#142914] mb-6"
              >
                <div className="w-10 h-10 rounded-xl bg-[#d1f5d1] flex items-center justify-center">
                  <Bus className="h-6 w-6 text-[#2c842c]" />
                </div>
                <span>ArriveLink</span>
              </Link>
              <p className="text-[#4a824a] mb-6 max-w-sm text-lg leading-relaxed">
                Nigeria's most accurate bus travel directory. Search, compare, and
                message transport companies directly — for free.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-[#142914] mb-6 text-lg">Platform</h4>
              <ul className="space-y-4 text-[15px] font-medium text-[#4a824a]">
                <li>
                  <Link href="/" className="hover:text-[#3aa53a] transition-colors">
                    Search Routes
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#3aa53a] transition-colors">
                    Popular Companies
                  </Link>
                </li>
                <li>
                  <Link href="/app/login" className="hover:text-[#3aa53a] transition-colors">
                    Traveler Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#142914] mb-6 text-lg">For Business</h4>
              <ul className="space-y-4 text-[15px] font-medium text-[#4a824a]">
                <li>
                  <Link
                    href="/business/login"
                    className="hover:text-[#3aa53a] transition-colors"
                  >
                    Business Login
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-[#3aa53a] transition-colors">
                    List Your Company
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#3aa53a] transition-colors">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#c2f0c2] mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-sm font-medium text-[#649c64]">
            <p>&copy; {new Date().getFullYear()} ArriveLink. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#3aa53a] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-[#3aa53a] transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}