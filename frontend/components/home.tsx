"use client";

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowRight, Bus, ShieldCheck, MapPin, Users, Route } from "lucide-react";
import {
  useGetCities,
  useGetFeaturedCompanies,
  useGetPopularRoutes,
  useGetPlatformStats,
  getGetCitiesQueryKey,
  getGetFeaturedCompaniesQueryKey,
  getGetPopularRoutesQueryKey,
  getGetPlatformStatsQueryKey,
} from "../lib/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/star-rating";
import { Layout } from "@/components/layout";
import { formatPrice } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const [, navigate] = useLocation();
  const [fromCityId, setFromCityId] = useState<string>("");
  const [toCityId, setToCityId] = useState<string>("");

  const { data: cities = [], isLoading: isLoadingCities } = useGetCities({
    query: { queryKey: getGetCitiesQueryKey() },
  });

  const { data: featuredCompanies = [], isLoading: isLoadingFeatured } =
    useGetFeaturedCompanies({
      query: { queryKey: getGetFeaturedCompaniesQueryKey() },
    });

  const { data: popularRoutes = [], isLoading: isLoadingPopular } =
    useGetPopularRoutes({
      query: { queryKey: getGetPopularRoutesQueryKey() },
    });

  const { data: stats } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() },
  });

  function handleSearch() {
    if (!fromCityId || !toCityId) return;
    navigate(`/search?from=${fromCityId}&to=${toCityId}`);
  }

  function handlePopularRouteClick(fromId: number, toId: number) {
    navigate(`/search?from=${fromId}&to=${toId}`);
  }

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        {/* Hero */}
        <section className="relative bg-primary text-primary-foreground overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, hsl(43 100% 50%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(151 100% 80%) 0%, transparent 40%)`,
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 py-20 sm:py-28">
            <div className="mb-3 flex items-center gap-2">
              <Badge className="bg-secondary text-secondary-foreground font-semibold text-xs px-3 py-1">
                Nigeria Road Travel
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-4 max-w-2xl">
              Find the right bus. Contact the right rep.
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 mb-10 max-w-xl">
              Compare prices and departure times from real transport companies
              across Nigeria — then message a company rep directly, for free.
            </p>

            <div className="bg-white rounded-2xl p-5 shadow-xl max-w-2xl" data-testid="search-form">
              <p className="text-foreground text-sm font-semibold mb-3">
                Where are you travelling?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    From
                  </label>
                  <Select
                    value={fromCityId}
                    onValueChange={(v) => {
                      setFromCityId(v);
                      if (v === toCityId) setToCityId("");
                    }}
                  >
                    <SelectTrigger className="w-full" data-testid="select-from-city">
                      <SelectValue placeholder="Departure city" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCities ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        cities.map((city) => (
                          <SelectItem
                            key={city.id}
                            value={String(city.id)}
                            data-testid={`option-from-${city.id}`}
                          >
                            {city.name}, {city.state}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    To
                  </label>
                  <Select value={toCityId} onValueChange={setToCityId}>
                    <SelectTrigger className="w-full" data-testid="select-to-city">
                      <SelectValue placeholder="Destination city" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCities ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        cities
                          .filter((c) => String(c.id) !== fromCityId)
                          .map((city) => (
                            <SelectItem
                              key={city.id}
                              value={String(city.id)}
                              data-testid={`option-to-${city.id}`}
                            >
                              {city.name}, {city.state}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    className="w-full sm:w-auto px-6"
                    disabled={
                      !fromCityId || !toCityId || fromCityId === toCityId
                    }
                    onClick={handleSearch}
                    data-testid="button-search"
                  >
                    Search
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="bg-secondary/10 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex flex-wrap gap-8 justify-center sm:justify-start">
              <div className="flex items-center gap-3" data-testid="stat-companies">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-foreground">
                    {stats ? (
                      stats.company_count
                    ) : (
                      <Skeleton className="h-7 w-8 inline-block" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Transport companies
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3" data-testid="stat-cities">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-foreground">
                    {stats ? (
                      stats.city_count
                    ) : (
                      <Skeleton className="h-7 w-8 inline-block" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cities covered
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3" data-testid="stat-routes">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-foreground">
                    {stats ? (
                      stats.route_count
                    ) : (
                      <Skeleton className="h-7 w-8 inline-block" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active routes
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3" data-testid="stat-unlocks">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-foreground">
                    {stats ? (
                      stats.user_count
                    ) : (
                      <Skeleton className="h-7 w-8 inline-block" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Travelers registered
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular routes */}
        <section className="max-w-5xl mx-auto px-4 py-14 w-full">
          <h2 className="text-2xl font-display font-bold mb-1">Popular Routes</h2>
          <p className="text-muted-foreground text-sm mb-6">
            The routes most searched by Nigerian travelers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoadingPopular
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))
              : popularRoutes.slice(0, 8).map((route, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      handlePopularRouteClick(
                        route.departure_city.id,
                        route.destination_city.id
                      )
                    }
                    className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left hover:border-primary hover:shadow-sm transition-all"
                    data-testid={`card-popular-route-${i}`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                      <span>{route.departure_city.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>{route.destination_city.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {route.company_count}{" "}
                      {route.company_count === 1 ? "company" : "companies"}{" "}
                      &middot; from {formatPrice(route.min_price)}
                    </p>
                  </button>
                ))}
          </div>
        </section>

        {/* Featured companies */}
        <section className="bg-muted/40 border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-14">
            <h2 className="text-2xl font-display font-bold mb-1">
              Verified Companies
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Trusted transport operators with confirmed contact details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingFeatured
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))
                : featuredCompanies.map((company) => (
                    <Link
                      key={company.id}
                      href={`/company/${company.id}`}
                      className="block group"
                      data-testid={`card-company-${company.id}`}
                    >
                      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bus className="h-5 w-5 text-primary" />
                          </div>
                          {company.is_verified && (
                            <div className="flex items-center gap-1 text-primary text-xs font-medium">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verified
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                            {company.name}
                          </h3>
                          {company.tagline && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {company.tagline}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-auto">
                          <StarRating rating={company.rating} size={14} />
                          <span className="text-xs text-muted-foreground">
                            {company.review_count} reviews
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-4 py-14 w-full">
          <h2 className="text-2xl font-display font-bold mb-1 text-center">
            How ArriveLink Works
          </h2>
          <p className="text-muted-foreground text-sm mb-10 text-center">
            Three steps to find your bus and connect with the company
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Search your route",
                desc: "Pick your departure and destination city to see all companies operating on that route with real prices and times.",
              },
              {
                step: "2",
                title: "Compare companies",
                desc: "See prices, departure times, terminals, ratings, and traveler reviews side by side. Choose the best fit.",
              },
              {
                step: "3",
                title: "Message the company",
                desc: "Send a free message to any company rep directly. Ask about availability, prices, or departure times — no fees.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
