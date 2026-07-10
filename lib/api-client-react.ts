"use client";

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

export interface City {
  id: number;
  name: string;
  state: string;
}

export interface FeaturedCompany {
  id: number;
  name: string;
  tagline: string | null;
  is_verified: boolean;
  rating: number;
  review_count: number;
}

export interface PopularRoute {
  departure_city: City;
  destination_city: City;
  company_count: number;
  min_price: number;
}

export interface PlatformStats {
  company_count: number;
  city_count: number;
  route_count: number;
  unlock_count: number;
}

export interface SearchRouteCompany {
  id: number;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  is_verified: boolean;
  rating: number;
  review_count: number;
}

export interface SearchRoute {
  id: number;
  price: number;
  departure_times: string[];
  terminal_location: string;
  terminal_address: string | null;
  status: string;
  company: SearchRouteCompany;
}

export interface CompanyRoute {
  id: number;
  price: number;
  departure_times: string[];
  terminal_location: string;
  terminal_address: string | null;
  status: string;
  departure_city: City;
  destination_city: City;
}

export interface CompanyDetail {
  id: number;
  name: string;
  tagline: string | null;
  about: string | null;
  logo_url: string | null;
  founded_year: number | null;
  fleet_size: number | null;
  is_verified: boolean;
  rating: number;
  review_count: number;
  response_rate: number;
  routes: CompanyRoute[];
}

export interface CompanyReview {
  id: number;
  traveler_name: string;
  overall_rating: number;
  review_text: string | null;
  created_at: string;
  rating_punctuality: number;
  rating_comfort: number;
  rating_safety: number;
  rating_value: number;
  rating_professionalism: number;
}

export interface InitiateUnlockResponse {
  reference: string;
  test_mode: boolean;
  payment_url: string | null;
}

export interface VerifyUnlockResponse {
  company_name: string;
  contact_type: "whatsapp" | "phone";
  contact_value: string;
  route_summary: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export const getGetCitiesQueryKey = () => ["cities"] as const;
export const getGetFeaturedCompaniesQueryKey = () => ["featured-companies"] as const;
export const getGetPopularRoutesQueryKey = () => ["popular-routes"] as const;
export const getGetPlatformStatsQueryKey = () => ["platform-stats"] as const;
export const getGetCompanyQueryKey = (id: number) => ["company", id] as const;
export const getGetCompanyReviewsQueryKey = (id: number) => ["company-reviews", id] as const;
export const getSearchRoutesQueryKey = (params: { from_city_id: number; to_city_id: number }) =>
  ["search-routes", params] as const;

type QueryOpts<T> = {
  query?: Omit<UseQueryOptions<T, Error, T>, "queryFn">;
};

export function useGetCities(opts?: QueryOpts<City[]>) {
  return useQuery({
    queryKey: getGetCitiesQueryKey(),
    queryFn: () => apiFetch<City[]>("/cities"),
    ...opts?.query,
  });
}

export function useGetFeaturedCompanies(opts?: QueryOpts<FeaturedCompany[]>) {
  return useQuery({
    queryKey: getGetFeaturedCompaniesQueryKey(),
    queryFn: () => apiFetch<FeaturedCompany[]>("/companies/featured"),
    ...opts?.query,
  });
}

export function useGetPopularRoutes(opts?: QueryOpts<PopularRoute[]>) {
  return useQuery({
    queryKey: getGetPopularRoutesQueryKey(),
    queryFn: () => apiFetch<PopularRoute[]>("/routes/popular"),
    ...opts?.query,
  });
}

export function useGetPlatformStats(opts?: QueryOpts<PlatformStats>) {
  return useQuery({
    queryKey: getGetPlatformStatsQueryKey(),
    queryFn: () => apiFetch<PlatformStats>("/stats/platform"),
    ...opts?.query,
  });
}

export function useSearchRoutes(
  params: { from_city_id: number; to_city_id: number },
  opts?: QueryOpts<SearchRoute[]>
) {
  return useQuery({
    queryKey: getSearchRoutesQueryKey(params),
    queryFn: () =>
      apiFetch<SearchRoute[]>(
        `/routes/search?from_city_id=${params.from_city_id}&to_city_id=${params.to_city_id}`
      ),
    ...opts?.query,
  });
}

export function useGetCompany(id: number, opts?: QueryOpts<CompanyDetail>) {
  return useQuery({
    queryKey: getGetCompanyQueryKey(id),
    queryFn: () => apiFetch<CompanyDetail>(`/companies/${id}`),
    ...opts?.query,
  });
}

export function useGetCompanyReviews(id: number, opts?: QueryOpts<CompanyReview[]>) {
  return useQuery({
    queryKey: getGetCompanyReviewsQueryKey(id),
    queryFn: () => apiFetch<CompanyReview[]>(`/companies/${id}/reviews`),
    ...opts?.query,
  });
}

export function useSubmitReview(
  opts?: UseMutationOptions<unknown, Error, { data: Record<string, unknown> }>
) {
  return useMutation({
    mutationFn: ({ data }) =>
      apiFetch("/reviews", { method: "POST", body: JSON.stringify(data) }),
    ...opts,
  });
}

export function useInitiateUnlock(
  opts?: UseMutationOptions<InitiateUnlockResponse, Error, { data: Record<string, unknown> }>
) {
  return useMutation({
    mutationFn: ({ data }) =>
      apiFetch<InitiateUnlockResponse>("/unlocks/initiate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...opts,
  });
}

export function useVerifyUnlock(
  opts?: UseMutationOptions<VerifyUnlockResponse, Error, { data: Record<string, unknown> }>
) {
  return useMutation({
    mutationFn: ({ data }) =>
      apiFetch<VerifyUnlockResponse>("/unlocks/verify", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...opts,
  });
}
