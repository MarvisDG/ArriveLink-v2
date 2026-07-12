"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Shield, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Layout } from "@/components/layout";

const API_BASE = "/api";

interface BookingDetail {
  id: number;
  status: string;
  traveler_name: string;
  seats_requested: number;
  departure_time: string;
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

const PAYMENT_WINDOW_MS = 25 * 60 * 1000;

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

export default function BookingPayment() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const { data: booking, isLoading, refetch } = useQuery<BookingDetail>({
    queryKey: ["booking-payment", bookingId],
    queryFn: () => fetch(`${API_BASE}/bookings/${bookingId}`).then((r) => r.json()),
    refetchInterval: 10000,
    enabled: !!bookingId,
  });

  const { remaining, mins, secs } = useCountdown(
    booking?.payment_deadline ?? null,
    () => setTimeout(() => refetch(), 500)
  );

  useEffect(() => {
    if (!booking) return;
    if (booking.status === "TICKET_ISSUED" || booking.status === "BOARDED") {
      router.push(`/booking/ticket/${booking.id}`);
    }
    if (booking.status === "AWAITING_RESPONSE" || booking.status === "CONFIRMED") {
      router.push(`/booking/awaiting/${booking.id}`);
    }
  }, [booking?.status, navigate]);

  async function handlePay() {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      router.push(`/booking/ticket/${data.id}`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!booking || (booking as any).error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Booking not found.</p>
          <Button asChild><Link href="/">Go Home</Link></Button>
        </div>
      </Layout>
    );
  }

  if (booking.status === "CANCELLED_TIMEOUT") {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-6 px-4">
          <AlertTriangle className="w-16 h-16 text-amber-500" />
          <div className="text-center">
            <h2 className="font-bold text-xl mb-2">Payment Window Expired</h2>
            <p className="text-muted-foreground text-sm">
              Your seat reservation was released after 25 minutes. Please start a new booking.
            </p>
          </div>
          <Button asChild><Link href="/">Search Routes</Link></Button>
        </div>
      </Layout>
    );
  }

  if (booking.status === "REJECTED") {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-6 px-4">
          <XCircle className="w-16 h-16 text-destructive" />
          <div className="text-center">
            <h2 className="font-bold text-xl mb-2">Request Was Declined</h2>
            <p className="text-muted-foreground text-sm">
              This booking request was declined by the operator. Please search for another bus.
            </p>
          </div>
          <Button asChild variant="outline"><Link href="/">Search Routes</Link></Button>
        </div>
      </Layout>
    );
  }

  const farePerSeat = booking.route?.price ?? 0;
  const seatsCount = booking.seats_requested;
  const fareSub = farePerSeat * seatsCount;
  const convFee = booking.convenience_fee;
  const processingFee = Math.round(booking.total_fare * 0.015);
  const grandTotal = booking.total_fare + processingFee;
  const isExpired = remaining === 0 && !!booking.payment_deadline;

  return (
    <Layout>
      <div className="min-h-screen bg-muted/20 pb-20">
        <div className="bg-primary text-primary-foreground py-8">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <h1 className="text-2xl font-display font-bold">Complete Payment</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">
              {booking.route?.departure_city?.name} → {booking.route?.destination_city?.name} ·{" "}
              {booking.company?.name}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-lg py-8 space-y-5">
          {booking.payment_deadline && (
            <div
              className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
                isExpired
                  ? "bg-red-50 border-red-300"
                  : remaining < 300000
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    isExpired || remaining < 300000 ? "text-red-500" : "text-amber-500"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    isExpired
                      ? "text-red-700"
                      : remaining < 300000
                      ? "text-red-700"
                      : "text-amber-700"
                  }`}
                >
                  {isExpired ? "Payment window closed — refreshing…" : "Payment window closing"}
                </span>
              </div>
              {!isExpired && (
                <span
                  className={`font-bold font-mono text-lg tabular-nums ${
                    remaining < 300000 ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
              )}
              {isExpired && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
            </div>
          )}

          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Booking Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Traveler</span>
                <span className="font-medium">{booking.traveler_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-medium">
                  {booking.route?.departure_city?.name} → {booking.route?.destination_city?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Departure</span>
                <span className="font-medium">{booking.departure_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terminal</span>
                <span className="font-medium">{booking.route?.terminal_location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">{seatsCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Payment Breakdown</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Fare ({formatPrice(farePerSeat)} × {seatsCount})
                </span>
                <span>{formatPrice(fareSub)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Convenience fee</span>
                <span>{formatPrice(convFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing fee (card 1.5%)</span>
                <span>{formatPrice(processingFee)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>

          {payError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <p className="text-sm text-destructive">{payError}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handlePay}
              disabled={paying || isExpired}
            >
              {paying ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
              ) : isExpired ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking status...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Simulate Payment</>
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Powered by Paystack · Your payment is secure</span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Booking reference #{booking.id}
          </p>
        </div>
      </div>
    </Layout>
  );
}
