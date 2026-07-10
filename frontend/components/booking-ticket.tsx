"use client";

import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Loader2, Bus, MapPin, Clock, Users, Calendar, QrCode, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Layout } from "@/components/layout";

const API_BASE = "/api";

interface BookingDetail {
  id: number;
  status: string;
  traveler_name: string;
  traveler_phone: string;
  seats_requested: number;
  departure_time: string;
  requested_at: string;
  paid_at: string | null;
  boarded_at: string | null;
  route: {
    price: number;
    terminal_location: string;
    terminal_address: string | null;
    departure_city: { name: string; state: string } | null;
    destination_city: { name: string; state: string } | null;
  } | null;
  company: { name: string; logo_url: string | null } | null;
  ticket: { id: number; ticket_code: string; issued_at: string } | null;
  convenience_fee: number;
  total_fare: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TICKET_ISSUED: { label: "Valid", color: "bg-green-100 text-green-700 border-green-200" },
  BOARDED: { label: "Boarded", color: "bg-blue-100 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function BookingTicket() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const { data: booking, isLoading } = useQuery<BookingDetail>({
    queryKey: ["booking-ticket", bookingId],
    queryFn: () => fetch(`${API_BASE}/bookings/${bookingId}`).then((r) => r.json()),
    enabled: !!bookingId,
  });

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
          <Button asChild variant="outline"><Link href="/">Go Home</Link></Button>
        </div>
      </Layout>
    );
  }

  if (!booking.ticket) {
    const actionHref =
      booking.status === "AWAITING_RESPONSE"
        ? `/booking/awaiting/${booking.id}`
        : booking.status === "AWAITING_PAYMENT"
        ? `/booking/payment/${booking.id}`
        : "/";
    const actionLabel =
      booking.status === "AWAITING_RESPONSE"
        ? "Track Request"
        : booking.status === "AWAITING_PAYMENT"
        ? "Complete Payment"
        : "Go Home";
    const desc =
      booking.status === "AWAITING_RESPONSE"
        ? "Your ticket will be issued once the operator accepts and you complete payment."
        : booking.status === "AWAITING_PAYMENT"
        ? "Your ticket will be issued after payment is completed."
        : "This booking does not have a ticket yet.";
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-6 px-4 text-center">
          <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
          <div>
            <h2 className="font-bold text-xl mb-2">Ticket Not Issued Yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm">{desc}</p>
          </div>
          <Button asChild><Link href={actionHref}>{actionLabel}</Link></Button>
        </div>
      </Layout>
    );
  }

  const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600" };
  const travelDate = booking.paid_at
    ? new Date(booking.paid_at).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date(booking.requested_at).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <Layout>
      <div className="min-h-screen bg-muted/20 pb-20">
        <div className="bg-primary text-primary-foreground py-8">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <h1 className="text-2xl font-display font-bold">Your E-Ticket</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">
              Show this ticket at the terminal when boarding
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-lg py-8 space-y-5">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-primary/5 px-5 pt-5 pb-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bus className="w-4 h-4 text-primary" />
                    <span className="font-bold text-base">{booking.company?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xl font-display font-bold">
                    <span>{booking.route?.departure_city?.name}</span>
                    <ArrowRight className="w-5 h-5 text-primary" />
                    <span>{booking.route?.destination_city?.name}</span>
                  </div>
                </div>
                <Badge className={`border text-xs px-2 py-0.5 ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Passenger</p>
                  <p className="font-semibold">{booking.traveler_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Seats</p>
                  <p className="font-semibold">{booking.seats_requested} seat{booking.seats_requested > 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Departure</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {booking.departure_time}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Date</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {travelDate}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Terminal</p>
                  <p className="font-semibold flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      {booking.route?.terminal_location}
                      {booking.route?.terminal_address && (
                        <span className="font-normal text-muted-foreground block text-xs">{booking.route.terminal_address}</span>
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t border-dashed pt-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-36 h-36 border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center bg-muted/30">
                    <div className="text-center">
                      <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-muted-foreground">QR Code</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Booking Reference</p>
                    <p className="font-bold text-2xl tracking-widest font-mono text-primary">
                      {booking.ticket.ticket_code}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold">{formatPrice(booking.total_fare)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold mb-0.5">Important</p>
            <p>Arrive at the terminal at least 30 minutes before departure. Show this ticket to the operator rep for boarding.</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/bookings">View All Bookings</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
