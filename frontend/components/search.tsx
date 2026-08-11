"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Search as SearchIcon, ShieldCheck, Bus, AlertCircle, Calendar } from "lucide-react";
import {
  useGetCities,
  useSearchRoutes,
  getGetCitiesQueryKey,
  getSearchRoutesQueryKey,
} from "../lib/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getStatusColor, getStatusLabel, cn } from "@/lib/utils";
import { StarRating } from "@/components/star-rating";

export default function Search() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const params = new URLSearchParams(search);
  const fromId = params.get("from");
  const toId = params.get("to");

  const fromCityId = fromId ? parseInt(fromId, 10) : undefined;
  const toCityId = toId ? parseInt(toId, 10) : undefined;
  const isValidSearch = !!(fromCityId && toCityId);

  const { data: cities = [], isLoading: isLoadingCities } = useGetCities({
    query: { queryKey: getGetCitiesQueryKey() },
  });

  const {
    data: routes = [],
    isLoading: isLoadingRoutes,
    isError,
  } = useSearchRoutes(
    { from_city_id: fromCityId!, to_city_id: toCityId! },
    {
      query: {
        enabled: isValidSearch,
        queryKey: getSearchRoutesQueryKey({
          from_city_id: fromCityId!,
          to_city_id: toCityId!,
        }),
      },
    }
  );

  const fromCity = cities.find((c) => c.id === fromCityId);
  const toCity = cities.find((c) => c.id === toCityId);

  if (!isValidSearch) {
    return (
      
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Search</h2>
          <p className="text-muted-foreground mb-8">
            Please select a departure and destination city.
          </p>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-muted/20 pb-20">
        {/* Search Header */}
        <div className="bg-primary text-primary-foreground py-10">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-6 -ml-4"
              asChild
            >
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to search
              </Link>
            </Button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80 uppercase tracking-wider mb-2">
                  Showing buses for
                </p>
                {isLoadingCities ? (
                  <Skeleton className="h-10 w-64 bg-primary-foreground/20" />
                ) : (
                  <h1 className="text-3xl md:text-5xl font-display font-bold">
                    {fromCity?.name}{" "}
                    <span className="text-secondary opacity-80 mx-2">→</span>{" "}
                    {toCity?.name}
                  </h1>
                )}
              </div>

              <div className="bg-primary-foreground/10 rounded-lg px-4 py-2 text-sm font-medium">
                {isLoadingRoutes ? (
                  <Skeleton className="h-5 w-24 bg-primary-foreground/20" />
                ) : (
                  `${routes.length} buses found`
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {isLoadingRoutes ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 flex gap-4">
                      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20 bg-card border rounded-2xl">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Error loading routes</h3>
              <p className="text-muted-foreground">
                We couldn't fetch the routes at this time. Please try again
                later.
              </p>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-20 bg-card border rounded-2xl">
              <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">No buses found</h3>
              <p className="text-muted-foreground mb-6">
                There are no direct routes available for this journey.
              </p>
              <Button asChild variant="outline">
                <Link href="/">Try another route</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="bg-card border rounded-2xl p-6 transition-all hover:shadow-md"
                  data-testid={`route-result-${route.id}`}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Company Info */}
                    <div className="w-full md:w-1/3 md:pr-6 md:border-r border-border">
                      <div className="flex items-start gap-4">
                        <Link href={`/company/${route.company.id}`}>
                          <div className="w-12 h-12 rounded-full bg-muted border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer">
                            {route.company.logo_url ? (
                              <img
                                src={route.company.logo_url}
                                alt={route.company.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bus className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                        </Link>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              href={`/company/${route.company.id}`}
                              className="font-display font-bold text-lg hover:text-primary transition-colors"
                            >
                              {route.company.name}
                            </Link>
                            {route.company.is_verified && (
                              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <StarRating rating={route.company.rating} size={14} />
                            <span className="text-sm font-medium">
                              {route.company.rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({route.company.review_count} reviews)
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {route.company.tagline || "Reliable transport operator"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                          <div className="text-3xl font-display font-bold text-primary mb-1">
                            {formatPrice(route.price)}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-transparent font-medium",
                              getStatusColor(route.status)
                            )}
                          >
                            {getStatusLabel(route.status)}
                          </Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="font-medium block mb-1">
                                Departure Times
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {route.departure_times.map((time, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="font-mono"
                                  >
                                    {time}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="font-medium block">Terminal</span>
                              <span className="text-muted-foreground">
                                {route.terminal_location}
                              </span>
                              {route.terminal_address && (
                                <span className="text-muted-foreground block text-xs mt-0.5">
                                  {route.terminal_address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end mt-auto pt-4 border-t">
                        <Button variant="outline" asChild>
                          <Link href={`/company/${route.company.id}`}>
                            View Company
                          </Link>
                        </Button>
                        <Button asChild>
                          <Link href={`/booking/request/${route.id}`}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Reserve Seat
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    
  );
}
