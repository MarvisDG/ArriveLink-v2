"use client";

import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Bus, MapPin, Clock, Users, Phone, User, Loader2, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { Layout } from "@/components/layout";

const API_BASE = "/api";

interface RouteDetail {
  id: number;
  price: number;
  departure_times: string[];
  terminal_location: string;
  terminal_address: string | null;
  departure_city: { id: number; name: string; state: string } | null;
  destination_city: { id: number; name: string; state: string } | null;
  company: { id: number; name: string; logo_url: string | null; is_verified: boolean } | null;
}

export default function BookingRequest() {
  const { routeId } = useParams<{ routeId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState("1");
  const [departureTime, setDepartureTime] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: route, isLoading, isError } = useQuery<RouteDetail>({
    queryKey: ["route-detail", routeId],
    queryFn: () => fetch(`${API_BASE}/routes/${routeId}`).then((r) => r.json()),
    enabled: !!routeId,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!route) return;
    if (!departureTime) {
      toast({ title: "Select a departure time", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_id: route.id,
          traveler_name: name,
          traveler_phone: phone,
          seats_requested: parseInt(seats),
          departure_time: departureTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit request");
      navigate(`/booking/awaiting/${data.id}`);
    } catch (err) {
      toast({
        title: "Request failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  if (isError || !route) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Route not found.</p>
          <Button asChild variant="outline"><Link href="/">Go Home</Link></Button>
        </div>
      </Layout>
    );
  }

  const farePerSeat = route.price;
  const convenienceFee = 20000;
  const totalFare = farePerSeat * parseInt(seats) + convenienceFee;

  return (
    <Layout>
      <div className="min-h-screen bg-muted/20 pb-20">
        <div className="bg-primary text-primary-foreground py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Button
              variant="ghost"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4 -ml-4"
              onClick={() => history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to results
            </Button>
            <h1 className="text-2xl font-display font-bold">Reserve Your Seat</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">
              {route.departure_city?.name} → {route.destination_city?.name}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
          <div className="bg-card border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {route.company?.logo_url ? (
                  <img src={route.company.logo_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Bus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{route.company?.name}</span>
                  {route.company?.is_verified && <ShieldCheck className="w-4 h-4 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {route.departure_city?.name} → {route.destination_city?.name}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium block">Departures</span>
                  <span className="text-muted-foreground">{route.departure_times.join(", ")}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium block">Terminal</span>
                  <span className="text-muted-foreground">{route.terminal_location}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-card border rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-base">Your Details</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. +2348012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Used to look up your booking later</p>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-base">Trip Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure Time</Label>
                  <Select value={departureTime} onValueChange={setDepartureTime} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {route.departure_times.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seats</Label>
                  <Select value={seats} onValueChange={setSeats}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} seat{n > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5">
              <h2 className="font-semibold text-base mb-3">Fare Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {formatPrice(farePerSeat)} × {seats} seat{parseInt(seats) > 1 ? "s" : ""}
                  </span>
                  <span>{formatPrice(farePerSeat * parseInt(seats))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Convenience fee</span>
                  <span>{formatPrice(convenienceFee)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(totalFare)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                You only pay after the operator confirms your request. The operator has 10 minutes to respond.
              </p>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending Request...</>
              ) : (
                <><Users className="w-4 h-4 mr-2" /> Send Reservation Request</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
