"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Bus,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  AlertCircle,
  ThumbsUp,
  Calendar,
  Hash,
} from "lucide-react";

import {
  useGetCompany,
  useGetCompanyReviews,
  useSubmitReview,
  getGetCompanyQueryKey,
  getGetCompanyReviewsQueryKey,
} from "../lib/api-client-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor, getStatusLabel, cn } from "@/lib/utils";
import { StarRating } from "@/components/star-rating";
import { MessageCompanyModal } from "@/components/message-company-modal";
import { Layout } from "@/components/layout";

const reviewFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  routeId: z.string().optional(),
  punctuality: z.number().min(1).max(5),
  comfort: z.number().min(1).max(5),
  safety: z.number().min(1).max(5),
  value: z.number().min(1).max(5),
  professionalism: z.number().min(1).max(5),
  text: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Company() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const { toast } = useToast();

  const {
    data: company,
    isLoading: isLoadingCompany,
    isError: isErrorCompany,
  } = useGetCompany(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCompanyQueryKey(id),
    },
  });

  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
    refetch: refetchReviews,
  } = useGetCompanyReviews(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCompanyReviewsQueryKey(id),
    },
  });

  const submitReview = useSubmitReview();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      name: "",
      email: "",
      routeId: "",
      punctuality: 0,
      comfort: 0,
      safety: 0,
      value: 0,
      professionalism: 0,
      text: "",
    },
  });

  const onSubmitReview = (values: ReviewFormValues) => {
    submitReview.mutate(
      {
        data: {
          traveler_name: values.name,
          traveler_email: values.email,
          company_id: id,
          route_id: values.routeId ? parseInt(values.routeId, 10) : undefined,
          rating_punctuality: values.punctuality,
          rating_comfort: values.comfort,
          rating_safety: values.safety,
          rating_value: values.value,
          rating_professionalism: values.professionalism,
          review_text: values.text || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Review submitted",
            description: "Thank you for your feedback!",
          });
          form.reset();
          refetchReviews();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to submit review. Please try again.",
          });
        },
      }
    );
  };

  if (isErrorCompany) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4 font-display">
            Company Not Found
          </h2>
          <p className="text-muted-foreground mb-8">
            We couldn't find the transport operator you're looking for.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Back to Search</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoadingCompany || !company) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="flex items-center gap-6 mb-12">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-muted/20 pb-20">
        {/* Company Header */}
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 py-10 max-w-5xl">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Bus className="w-12 h-12 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1
                    className="text-3xl md:text-5xl font-display font-bold"
                    data-testid="text-company-name"
                  >
                    {company.name}
                  </h1>
                  {company.is_verified && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border-transparent text-sm py-1"
                      data-testid="badge-verified"
                    >
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      Verified Operator
                    </Badge>
                  )}
                </div>

                {company.tagline && (
                  <p className="text-xl text-muted-foreground mb-4 font-medium">
                    {company.tagline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1.5 rounded-lg border border-secondary/20">
                    <Star className="w-5 h-5 fill-secondary text-secondary" />
                    <span className="font-bold text-lg">
                      {company.rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({company.review_count} reviews)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">
                      {Math.round(company.response_rate * 100)}% Response Rate
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Tabs defaultValue="routes" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-8">
              <TabsTrigger
                value="routes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 font-medium"
              >
                Routes & Pricing
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 font-medium"
              >
                About Company
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 font-medium"
              >
                Traveler Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="routes" className="mt-0">
              {company.routes.length === 0 ? (
                <div className="text-center py-16 bg-card border rounded-2xl">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold mb-2">No routes available</h3>
                  <p className="text-muted-foreground">
                    This company hasn't listed any routes yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {company.routes.map((route) => (
                    <div
                      key={route.id}
                      className="bg-card border rounded-2xl p-6 transition-all hover:shadow-md"
                      data-testid={`company-route-${route.id}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="font-display font-bold text-2xl">
                              {route.departure_city.name}
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <div className="font-display font-bold text-2xl">
                              {route.destination_city.name}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mb-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-transparent font-medium",
                                getStatusColor(route.status)
                              )}
                            >
                              {getStatusLabel(route.status)}
                            </Badge>
                            <div className="text-2xl font-display font-bold text-primary">
                              {formatPrice(route.price)}
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium text-foreground block mb-1">
                                Departure Times
                              </span>
                              {route.departure_times.join(" • ")}
                            </div>
                            <div>
                              <span className="font-medium text-foreground block mb-1">
                                Terminal
                              </span>
                              {route.terminal_location}
                            </div>
                          </div>
                        </div>

                        <div className="w-full md:w-64 flex flex-col justify-end pt-4 border-t md:border-t-0 md:border-l border-border md:pl-6">
                          <MessageCompanyModal
                            companyId={company.id}
                            companyName={company.name}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="about" className="mt-0">
              <div className="bg-card border rounded-2xl p-8">
                <h3 className="text-2xl font-display font-bold mb-6">
                  About {company.name}
                </h3>

                <div className="prose dark:prose-invert max-w-none mb-10">
                  <p className="whitespace-pre-line text-lg leading-relaxed">
                    {company.about || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8 border-t">
                  {company.founded_year && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                          Founded
                        </div>
                        <div className="text-xl font-bold font-display">
                          {company.founded_year}
                        </div>
                      </div>
                    </div>
                  )}

                  {company.fleet_size && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Hash className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                          Fleet Size
                        </div>
                        <div className="text-xl font-bold font-display">
                          {company.fleet_size}+ Vehicles
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 space-y-8">
              <div>
                <h3 className="text-2xl font-display font-bold mb-6">
                  Traveler Reviews ({reviews.length})
                </h3>

                {isLoadingReviews ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-16 bg-card border rounded-2xl">
                    <ThumbsUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">No reviews yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to review this company.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-card border rounded-2xl p-6"
                        data-testid={`review-${review.id}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display text-lg">
                              {review.traveler_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold">
                                {review.traveler_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md">
                            <Star className="w-4 h-4 fill-secondary text-secondary" />
                            <span className="font-bold">
                              {review.overall_rating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {review.review_text && (
                          <p className="mb-4 text-foreground/90">
                            {review.review_text}
                          </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t text-sm">
                          {[
                            ["Punctuality", review.rating_punctuality],
                            ["Comfort", review.rating_comfort],
                            ["Safety", review.rating_safety],
                            ["Value", review.rating_value],
                            ["Staff", review.rating_professionalism],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <div className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">
                                {label}
                              </div>
                              <div className="flex items-center gap-1 font-medium">
                                <Star className="w-3 h-3 text-secondary fill-secondary" />
                                {val}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Write a Review */}
              <div className="bg-card border rounded-2xl p-6 md:p-8 mt-12">
                <h3 className="text-2xl font-display font-bold mb-2">
                  Write a Review
                </h3>
                <p className="text-muted-foreground mb-8">
                  Share your experience to help other travelers.
                </p>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmitReview)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address (kept private)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="routeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Route traveled (Optional)</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="">Select a route</option>
                              {company.routes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.departure_city.name} to{" "}
                                  {r.destination_city.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-4 border-t">
                      {(
                        [
                          "punctuality",
                          "comfort",
                          "safety",
                          "value",
                          "professionalism",
                        ] as const
                      ).map((category) => (
                        <FormField
                          key={category}
                          control={form.control}
                          name={category}
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="capitalize">
                                {category}
                              </FormLabel>
                              <FormControl>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => field.onChange(star)}
                                      className="focus:outline-none focus-visible:ring-2 ring-primary rounded-sm transition-colors"
                                    >
                                      <Star
                                        className={cn(
                                          "w-6 h-6",
                                          star <= field.value
                                            ? "fill-secondary text-secondary"
                                            : "text-muted-foreground/30 hover:text-secondary/50"
                                        )}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>

                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem className="pt-4 border-t">
                          <FormLabel>Your Review (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your trip..."
                              className="min-h-[120px] resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full md:w-auto px-10"
                      disabled={submitReview.isPending}
                      data-testid="button-submit-review"
                    >
                      {submitReview.isPending
                        ? "Submitting..."
                        : "Submit Review"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
