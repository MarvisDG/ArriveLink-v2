import { Link } from "wouter";
import { Bus, User, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

function getUserToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("user_token");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const isLoggedIn = !!getUserToken();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-primary"
          >
            <Bus className="h-6 w-6" />
            <span>ArriveLink</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bookings">
                <Ticket className="h-4 w-4 mr-1.5" />
                My Bookings
              </Link>
            </Button>
            {isLoggedIn ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app">
                  <User className="h-4 w-4 mr-1.5" />
                  My Account
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/login">Sign In</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/business/login">For Business</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link
                href="/"
                className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-primary mb-4"
              >
                <Bus className="h-6 w-6" />
                <span>ArriveLink</span>
              </Link>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Nigeria's most accurate bus travel directory. Search, compare, and
                message transport companies directly — for free.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors">
                    Search Routes
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-primary transition-colors">
                    Popular Companies
                  </Link>
                </li>
                <li>
                  <Link href="/app/login" className="hover:text-primary transition-colors">
                    Traveler Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Business</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/business/login"
                    className="hover:text-primary transition-colors"
                  >
                    Business Login
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    List Your Company
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ArriveLink. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
