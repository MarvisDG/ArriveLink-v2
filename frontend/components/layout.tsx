// layout.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Bus, Home, Users, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function getUserToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("user_token");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const isLoggedIn = !!getUserToken();
  const [isNavHovered, setIsNavHovered] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4fcf4] text-[#1a331a] selection:bg-[#c2f0c2] selection:text-[#0f240f]">
      
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <motion.nav
          initial={{ y: -100 }}
          animate={{ 
            y: 0,
            padding: isNavHovered ? "12px 32px" : "8px 24px",
            gap: isNavHovered ? "32px" : "20px",
          }}
          onHoverStart={() => setIsNavHovered(true)}
          onHoverEnd={() => setIsNavHovered(false)}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="pointer-events-auto relative bg-[#142914] rounded-b-[2.5rem] flex items-center shadow-[0_20px_40px_-15px_rgba(20,41,20,0.3)] border-b border-x border-[#2c522c]"
        >
          <svg className="absolute top-0 -left-[23px] w-6 h-6 text-[#142914] fill-current" viewBox="0 0 24 24">
            <path d="M0 0H24V24C24 10.745 13.255 0 0 0Z" />
          </svg>
          <svg className="absolute top-0 -right-[23px] w-6 h-6 text-[#142914] fill-current" viewBox="0 0 24 24">
            <path d="M0 0H24C10.745 0 0 10.745 0 24V0Z" />
          </svg>

          <Link href="/app/login" className="relative transition-transform hover:scale-105">
            <div className="w-10 h-10 rounded-full bg-[#d1f5d1] overflow-hidden border-2 border-[#142914] flex items-center justify-center">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Marvel&backgroundColor=transparent" 
                alt="User" 
                className="w-full h-full object-cover" 
              />
            </div>
            <span className="absolute top-0 left-0 w-3 h-3 bg-[#4ade80] rounded-full border-2 border-[#142914]"></span>
          </Link>

          <Link href="/app" className="text-[#a5d6a5] hover:text-[#4ade80] transition-colors">
            <Users className="w-5 h-5 fill-current" />
          </Link>

          <Link href="/bookings" className="text-[#a5d6a5] hover:text-[#4ade80] transition-colors relative">
            <ClipboardCheck className="w-5 h-5" />
            <span className="absolute top-0 -right-1.5 w-2.5 h-2.5 bg-[#4ade80] rounded-full border-2 border-[#142914]"></span>
          </Link>

          <Link href="/" className="flex items-center gap-2 bg-[#4ade80] text-[#142914] px-5 py-2 rounded-full font-bold transition-all hover:scale-105 hover:bg-[#3aa53a] hover:text-white hover:shadow-lg hover:shadow-[#3aa53a]/20">
            <span className="text-sm">Home</span>
            <Home className="w-4 h-4 fill-current" />
          </Link>

        </motion.nav>
      </header>

      <main className="flex-1 pt-24">{children}</main>
      
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