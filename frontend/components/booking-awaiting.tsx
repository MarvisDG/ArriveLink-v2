"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, Bus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

const API_BASE = "/api";

interface BookingDetail {
  id: number;
  status: string;
  traveler_name: string;
  seats_requested: number;
  departure_time: string;
  response_deadline: string;
  payment_deadline: string | null;
  route: {
    price: number;
    terminal_location: string;
    departure_city: { name: string } | null;
    destination_city: { name: string } | null;
  } | null;
  company: { name: string } | null;
  convenience_fee: number;
  total_fare: number;
}

function useCountdown(deadline: string | null, onExpire?: () => void) {
  const [remaining, setRemaining] = useState<number>(
    deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!deadline) return;
    expiredRef.current = false;
    const update = () => {
      const r = Math.max(0, new Date(deadline).getTime() - Date.now());
      setRemaining(r);
      if (r === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { remaining, mins, secs };
}

const RESPONSE_WINDOW_MS = 10 * 60 * 1000;

function CountdownRing({
  deadline,
  color = "text-primary",
  onExpire,
}: {
  deadline: string;
  color?: string;
  onExpire?: () => void;
}) {
  const { remaining, mins, secs } = useCountdown(deadline, onExpire);
  const pct = Math.max(0, Math.min(1, 1 - remaining / RESPONSE_WINDOW_MS));
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * pct;
  const isUrgent = remaining < 120000 && remaining > 0;
  const isDone = remaining === 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke="currentColor" strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={isDone ? "text-muted/30" : isUrgent ? "text-red-500" : color}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`text-2xl font-bold font-mono tabular-nums ${isUrgent ? "text-red-500" : isDone ? "text-muted-foreground" : ""}`}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">remaining</p>
    </div>
  );
}

export default function BookingAwaiting() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const { data: booking, isLoading, refetch } = useQuery<BookingDetail>({
    queryKey: ["booking", bookingId],
    queryFn: () => fetch(`${API_BASE}/bookings/${bookingId}`).then((r) => r.json()),
    refetchInterval: 4000,
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (!booking) return;
    if (booking.status === "AWAITING_PAYMENT") {
      router.push(`/booking/payment/${booking.id}`);
    }
  // }, [booking?.status, navigate]);
  }, [booking?.status, router, booking?.id]);

  if (isLoading) {
    return (
    
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      
    );
  }

  if (!booking || (booking as any).error) {
    return (
    
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Booking not found.</p>
          <Button asChild><Link href="/">Go Home</Link></Button>
        </div>
      
    );
  }

  return (
  
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <div className="bg-primary text-primary-foreground py-8">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bus className="w-5 h-5" />
              <span className="font-medium">{booking.company?.name}</span>
            </div>
            <h1 className="text-xl font-display font-bold">
              {booking.route?.departure_city?.name} → {booking.route?.destination_city?.name}
            </h1>
            <p className="text-primary-foreground/70 text-sm mt-1">
              {booking.seats_requested} seat{booking.seats_requested > 1 ? "s" : ""} · {booking.departure_time} departure
            </p>
          </div>
        </div>

        <div className="flex-1 container mx-auto px-4 max-w-lg py-10 flex flex-col items-center gap-8">
          {booking.status === "AWAITING_RESPONSE" && (
            <>
              <CountdownRing
                deadline={booking.response_deadline}
                onExpire={() => {
                  setTimeout(() => refetch(), 500);
                }}
              />
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <h2 className="font-semibold text-lg">Waiting for confirmation</h2>
                </div>
                <p className="text-muted-foreground text-sm max-w-sm">
                  The operator rep has been notified. They have 10 minutes to accept or decline your
                  request. This page will update automatically.
                </p>
              </div>
              <div className="w-full bg-card border rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Your Request
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{booking.traveler_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seats</span>
                    <span className="font-medium">{booking.seats_requested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departure</span>
                    <span className="font-medium">{booking.departure_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Terminal</span>
                    <span className="font-medium">{booking.route?.terminal_location}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total to pay</span>
                    <span className="text-primary">{formatPrice(booking.total_fare)}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">Booking #{booking.id}</p>
            </>
          )}

          {booking.status === "AWAITING_PAYMENT" && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="font-bold text-xl">Request Accepted!</h2>
              <p className="text-muted-foreground">Redirecting you to payment...</p>
              <Button onClick={() => router.push(`/booking/payment/${booking.id}`)}>
                Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {booking.status === "REJECTED" && (
            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="font-bold text-xl">Request Declined</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Unfortunately, the operator couldn't accommodate your request. Try another operator
                for the same route.
              </p>
              <Button asChild variant="outline">
                <Link href="/">Search Again</Link>
              </Button>
            </div>
          )}

          {booking.status === "CANCELLED_TIMEOUT" && (
            <div className="text-center space-y-4">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="font-bold text-xl">Request Timed Out</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                The operator didn't respond within 10 minutes. Your seat was not reserved. Please
                try a different time or operator.
              </p>
              <Button asChild variant="outline">
                <Link href="/">Search Again</Link>
              </Button>
            </div>
          )}

          {["TICKET_ISSUED", "BOARDED", "COMPLETED"].includes(booking.status) && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="font-bold text-xl">You're all set!</h2>
              <Button onClick={() => router.push(`/booking/ticket/${booking.id}`)}>
                View E-Ticket <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    
  );
}
