"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Loader2, Bus, ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle, Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Layout } from "@/components/layout";

const API_BASE = "/api";

interface BookingItem {
  id: number;
  status: string;
  traveler_name: string;
  seats_requested: number;
  departure_time: string;
  requested_at: string;
  route: {
    price: number;
    departure_city: { name: string } | null;
    destination_city: { name: string } | null;
    terminal_location: string;
  } | null;
  company: { name: string } | null;
  ticket: { ticket_code: string } | null;
  total_fare: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  AWAITING_RESPONSE: {
    label: "Waiting for operator",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  AWAITING_PAYMENT: {
    label: "Payment required",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  TICKET_ISSUED: {
    label: "Ticket issued",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  BOARDED: {
    label: "Boarded",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  REJECTED: {
    label: "Declined",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  CANCELLED_TIMEOUT: {
    label: "Expired",
    color: "bg-red-100 text-red-600 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
};

export default function Bookings() {
  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const { data: bookings, isLoading, isError } = useQuery<BookingItem[]>({
    queryKey: ["my-bookings", searchPhone],
    queryFn: () =>
      fetch(`${API_BASE}/bookings?phone=${encodeURIComponent(searchPhone)}`).then((r) => r.json()),
    enabled: !!searchPhone,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchPhone(phone.trim());
  }

  function getBookingAction(b: BookingItem) {
    if (b.status === "AWAITING_RESPONSE") return { href: `/booking/awaiting/${b.id}`, label: "Track Request" };
    if (b.status === "AWAITING_PAYMENT") return { href: `/booking/payment/${b.id}`, label: "Complete Payment" };
    if (b.status === "TICKET_ISSUED" || b.status === "BOARDED") return { href: `/booking/ticket/${b.id}`, label: "View Ticket" };
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-muted/20 pb-20">
        <div className="bg-primary text-primary-foreground py-10">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="w-6 h-6" />
              <h1 className="text-2xl font-display font-bold">My Bookings</h1>
            </div>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                  required
                />
              </div>
              <Button type="submit" variant="secondary" className="shrink-0">
                Find Bookings
              </Button>
            </form>
            <p className="text-primary-foreground/70 text-xs mt-2">
              Enter the phone number you used when making the reservation
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-2xl py-8">
          {!searchPhone && (
            <div className="text-center py-20">
              <Ticket className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">Enter your phone number above to view your bookings</p>
            </div>
          )}

          {searchPhone && isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          )}

          {searchPhone && isError && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Failed to load bookings. Please try again.</p>
            </div>
          )}

          {searchPhone && bookings && (
            <>
              {bookings.length === 0 ? (
                <div className="text-center py-20">
                  <Ticket className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">No bookings found for this phone number.</p>
                  <Button asChild className="mt-6"><Link href="/">Book a Trip</Link></Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {bookings.length} booking{bookings.length !== 1 ? "s" : ""} found
                  </p>
                  {bookings.map((b) => {
                    const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", icon: null };
                    const action = getBookingAction(b);
                    return (
                      <div key={b.id} className="bg-card border rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-lg font-bold mb-0.5">
                              <Bus className="w-4 h-4 text-primary" />
                              {b.company?.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-base font-medium text-muted-foreground">
                              <span>{b.route?.departure_city?.name}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span>{b.route?.destination_city?.name}</span>
                            </div>
                          </div>
                          <Badge className={`border text-xs flex items-center gap-1 shrink-0 ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Departure</p>
                            <p className="font-medium">{b.departure_time}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Seats</p>
                            <p className="font-medium">{b.seats_requested}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Total Fare</p>
                            <p className="font-medium">{formatPrice(b.total_fare)}</p>
                          </div>
                        </div>

                        {b.ticket && (
                          <div className="bg-muted/40 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                            <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Ref:</span>
                            <span className="font-mono font-bold">{b.ticket.ticket_code}</span>
                          </div>
                        )}

                        {action && (
                          <Button asChild className="w-full" variant={b.status === "AWAITING_PAYMENT" ? "default" : "outline"}>
                            <Link href={action.href}>{action.label}</Link>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
