"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, Bus, ShieldCheck, MapPin, Users, Route, 
  CalendarDays, Navigation, Clock, Map, Smartphone,
  CheckCircle2, CreditCard
} from "lucide-react";
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

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const LOGOS = [
  { name: "duolingo", font: "font-sans font-bold", size: "text-2xl" },
  { name: "Google", font: "font-sans font-semibold tracking-tight", size: "text-2xl" },
  { name: "gusto", font: "font-serif font-bold", size: "text-3xl" },
  { name: "Microsoft", font: "font-sans font-semibold", size: "text-xl", icon: true },
  { name: "PayPal", font: "font-sans font-bold italic", size: "text-2xl" },
  { name: "SoFi", font: "font-sans font-bold", size: "text-2xl", icon: true },
  { name: "stripe", font: "font-sans font-bold tracking-tighter", size: "text-3xl" },
  { name: "GIGM", font: "font-sans font-black tracking-widest uppercase", size: "text-2xl" },
  { name: "Uber", font: "font-sans font-medium", size: "text-3xl" },
];

export default function Home() {
  const router = useRouter();
  const [fromCityId, setFromCityId] = useState<string>("");
  const [toCityId, setToCityId] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const { data: cities = [], isLoading: isLoadingCities } = useGetCities({
    query: { queryKey: getGetCitiesQueryKey() },
  });

  const { data: featuredCompanies = [], isLoading: isLoadingFeatured } = useGetFeaturedCompanies({
    query: { queryKey: getGetFeaturedCompaniesQueryKey() },
  });

  const { data: popularRoutes = [], isLoading: isLoadingPopular } = useGetPopularRoutes({
    query: { queryKey: getGetPopularRoutesQueryKey() },
  });

  const { data: stats } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() },
  });

  function handleSearch() {
    if (!fromCityId || !toCityId) return;
    router.push(`/search?from=${fromCityId}&to=${toCityId}${date ? `&date=${date}` : ""}`);
  }

  function handlePopularRouteClick(fromId: number, toId: number) {
    router.push(`/search?from=${fromId}&to=${toId}`);
  }

  return (
    <Layout>
      <div className="flex flex-col min-h-screen font-sans bg-[#f4fcf4] text-[#1a331a] selection:bg-[#c2f0c2] selection:text-[#0f240f] overflow-hidden">
        
        <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-40 px-4 flex items-center justify-center min-h-[85vh]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                x: ["-10%", "110%"],
                y: [0, -20, 0]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute top-[20%] left-0 w-64 h-1 bg-[#d1f5d1] blur-[100px] opacity-60 rounded-full"
            />
             <motion.div 
              animate={{ 
                x: ["110%", "-10%"],
                y: [0, 30, 0]
              }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[20%] right-0 w-96 h-2 bg-[#bbf0bb] blur-[120px] opacity-50 rounded-full"
            />
          </div>

          <div className="relative max-w-7xl mx-auto w-full z-10 grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex flex-col items-start"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e1f8e1] border border-[#bbf0bb] mb-6">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22c55e]"></span>
                </span>
                <span className="text-sm font-semibold text-[#2c522c]">Live network active</span>
              </motion.div>
              
              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-[#142914]"
              >
                Moving you <br />
                <span className="text-[#3aa53a]">seamlessly</span> <br />
                across cities.
              </motion.h1>
              
              <motion.p
                variants={fadeUp}
                className="text-lg sm:text-xl text-[#3b6b3b] mb-10 max-w-xl leading-relaxed"
              >
                Experience the modern way to travel. Real-time tracking, unified bookings, and premium transport operators—all in one place.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex items-center gap-6 text-[#4a824a] font-medium">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#4ade80]"/> Instant Booking</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#4ade80]"/> E-Tickets</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#4ade80]"/> 24/7 Support</div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#c2f0c2] blur-[80px] opacity-40 rounded-full" />
              <div className="relative bg-white/60 backdrop-blur-xl border border-[#d1f5d1] rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(74,222,128,0.15)]">
                <div className="flex items-center justify-between mb-8 border-b border-[#e1f8e1] pb-4">
                  <h3 className="text-2xl font-bold text-[#1a331a]">Book a ride</h3>
                  <Bus className="text-[#3aa53a] w-6 h-6" />
                </div>

                <div className="space-y-5">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[#4ade80] bg-white z-10" />
                    <Select value={fromCityId} onValueChange={(v) => { setFromCityId(v); if (v === toCityId) setToCityId(""); }}>
                      <SelectTrigger className="w-full h-14 pl-10 text-lg border-[#c2f0c2] rounded-2xl bg-white focus:ring-[#4ade80] text-[#1a331a]">
                        <SelectValue placeholder="Leaving from..." />
                      </SelectTrigger>
                      <SelectContent className="border-[#c2f0c2] bg-white text-[#1a331a]">
                        {isLoadingCities ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          cities.map((city) => (
                            <SelectItem key={city.id} value={String(city.id)} className="focus:bg-[#e1f8e1] focus:text-[#1a331a]">
                              {city.name}, {city.state}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="absolute left-6 top-[156px] w-0.5 h-6 bg-gradient-to-b from-[#4ade80] to-[#3aa53a] z-10" />

                  <div className="relative group">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#3aa53a] z-10" />
                    <Select value={toCityId} onValueChange={setToCityId}>
                      <SelectTrigger className="w-full h-14 pl-10 text-lg border-[#c2f0c2] rounded-2xl bg-white focus:ring-[#4ade80] text-[#1a331a]">
                        <SelectValue placeholder="Going to..." />
                      </SelectTrigger>
                      <SelectContent className="border-[#c2f0c2] bg-white text-[#1a331a]">
                        {isLoadingCities ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          cities.filter((c) => String(c.id) !== fromCityId).map((city) => (
                            <SelectItem key={city.id} value={String(city.id)} className="focus:bg-[#e1f8e1] focus:text-[#1a331a]">
                              {city.name}, {city.state}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative">
                    <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8dc98d] z-10" />
                    <input 
                      type="date" 
                      className="w-full h-14 pl-12 pr-4 text-lg border border-[#c2f0c2] rounded-2xl bg-white focus:ring-2 focus:ring-[#4ade80] focus:outline-none text-[#1a331a] appearance-none"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full h-14 mt-4 bg-[#3aa53a] hover:bg-[#2c842c] text-white font-bold text-lg rounded-2xl shadow-xl shadow-[#3aa53a]/20 transition-all hover:shadow-[#3aa53a]/40 hover:-translate-y-0.5"
                    disabled={!fromCityId || !toCityId}
                    onClick={handleSearch}
                  >
                    Search Trips
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 border-y border-[#d1f5d1] bg-[#eaffea]/30 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#f4fcf4] via-transparent to-[#f4fcf4] z-10 pointer-events-none w-full" />
          
          <div 
            className="w-full flex"
            style={{ 
              maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
            }}
          >
            <motion.div
              className="flex whitespace-nowrap items-center w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 30, repeat: Infinity }}
            >
              <div className="flex items-center gap-24 px-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                {LOGOS.map((logo, i) => (
                  <div key={`logo-1-${i}`} className={`flex items-center gap-2 text-[#2c522c] ${logo.font} ${logo.size}`}>
                    {logo.icon && logo.name === "Microsoft" && (
                      <div className="grid grid-cols-2 gap-[2px] w-5 h-5">
                        <div className="bg-[#2c522c] w-full h-full"></div><div className="bg-[#2c522c] w-full h-full"></div>
                        <div className="bg-[#2c522c] w-full h-full"></div><div className="bg-[#2c522c] w-full h-full"></div>
                      </div>
                    )}
                    {logo.icon && logo.name === "SoFi" && (
                      <span className="grid grid-cols-3 gap-0.5 w-6 h-6">
                        {Array(9).fill(0).map((_, j) => (
                          <div key={j} className="w-full h-full rounded-full border border-[#2c522c] bg-transparent data-[fill=true]:bg-[#2c522c]" data-fill={j === 0} />
                        ))}
                      </span>
                    )}
                    {logo.name}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-24 px-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                {LOGOS.map((logo, i) => (
                  <div key={`logo-2-${i}`} className={`flex items-center gap-2 text-[#2c522c] ${logo.font} ${logo.size}`}>
                     {logo.icon && logo.name === "Microsoft" && (
                      <div className="grid grid-cols-2 gap-[2px] w-5 h-5">
                        <div className="bg-[#2c522c] w-full h-full"></div><div className="bg-[#2c522c] w-full h-full"></div>
                        <div className="bg-[#2c522c] w-full h-full"></div><div className="bg-[#2c522c] w-full h-full"></div>
                      </div>
                    )}
                    {logo.icon && logo.name === "SoFi" && (
                      <span className="grid grid-cols-3 gap-0.5 w-6 h-6">
                        {Array(9).fill(0).map((_, j) => (
                          <div key={j} className="w-full h-full rounded-full border border-[#2c522c] bg-transparent data-[fill=true]:bg-[#2c522c]" data-fill={j === 0} />
                        ))}
                      </span>
                    )}
                    {logo.name}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-[#eafaea] rounded-[2.5rem] p-10 md:p-16 border border-[#c2f0c2] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Map className="w-64 h-64 text-[#3aa53a]" />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-16 items-center justify-between">
                <div className="max-w-md">
                  <h2 className="text-3xl md:text-4xl font-bold text-[#142914] mb-4">Our network is constantly moving.</h2>
                  <p className="text-[#3b6b3b] text-lg mb-8">
                    Thousands of verified routes, unified under a single platform to give you unprecedented visibility into nationwide travel.
                  </p>
                  <Button className="bg-transparent border-2 border-[#3aa53a] text-[#3aa53a] hover:bg-[#3aa53a] hover:text-white rounded-xl h-12 px-8 font-semibold transition-all">
                    View Live Map <Navigation className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-x-12 gap-y-10 w-full md:w-auto">
                  {[
                    { icon: Bus, count: stats?.company_count, label: "Operators" },
                    { icon: MapPin, count: stats?.city_count, label: "Destinations" },
                    { icon: Route, count: stats?.route_count, label: "Active Routes" },
                    { icon: Users, count: stats?.user_count, label: "Passengers" }
                  ].map((stat, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: 1.05 }}
                      className="flex flex-col gap-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#d1f5d1] flex items-center justify-center mb-2">
                        <stat.icon className="h-6 w-6 text-[#2c842c]" />
                      </div>
                      <div className="text-4xl font-black text-[#142914] tracking-tight">
                        {stats ? stat.count : <Skeleton className="h-10 w-16 bg-[#c2f0c2]" />}
                      </div>
                      <div className="text-sm font-semibold text-[#4a824a] uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#142914] mb-3">Trending Routes</h2>
                <p className="text-[#4a824a] text-lg">Top destinations booked by travelers today.</p>
              </div>
              <Button variant="ghost" className="text-[#3aa53a] hover:text-[#2c842c] hover:bg-[#e1f8e1]">
                View All Routes <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoadingPopular
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl bg-[#e1f8e1]" />)
                : popularRoutes.slice(0, 8).map((route, i) => (
                    <motion.button
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={i}
                      onClick={() => handlePopularRouteClick(route.departure_city.id, route.destination_city.id)}
                      className="group relative flex flex-col justify-between h-full min-h-[140px] rounded-3xl bg-white border border-[#d1f5d1] p-6 text-left hover:border-[#4ade80] hover:shadow-[0_10px_40px_-10px_rgba(74,222,128,0.2)] transition-all overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#eaffea] to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative z-10 flex items-center justify-between w-full mb-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#649c64] uppercase tracking-wider mb-1">From</span>
                          <span className="font-bold text-[#142914] text-lg leading-none">{route.departure_city.name}</span>
                        </div>
                        <div className="px-3">
                           <motion.div 
                             animate={{ x: [0, 5, 0] }}
                             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                           >
                             <ArrowRight className="h-5 w-5 text-[#4ade80]" />
                           </motion.div>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-semibold text-[#649c64] uppercase tracking-wider mb-1">To</span>
                          <span className="font-bold text-[#142914] text-lg leading-none">{route.destination_city.name}</span>
                        </div>
                      </div>
                      
                      <div className="relative z-10 flex items-center justify-between border-t border-[#f0fdf0] pt-4 mt-auto">
                        <p className="text-sm text-[#4a824a] font-medium flex items-center gap-1.5">
                          <Bus className="w-4 h-4" /> {route.company_count} ops
                        </p>
                        <p className="text-sm text-[#142914] font-bold bg-[#e1f8e1] px-3 py-1 rounded-lg">
                          {formatPrice(route.min_price)}
                        </p>
                      </div>
                    </motion.button>
                  ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-[#eaffea] border-t border-[#d1f5d1]">
          <div className="max-w-7xl mx-auto px-4">
             <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-[#142914] mb-4">
                Premium Transport Partners
              </h2>
              <p className="text-[#4a824a] text-lg">
                We've integrated with the best operators to give you standardized comfort, safety, and reliability.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {isLoadingFeatured
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl bg-white/50" />)
                : featuredCompanies.map((company) => (
                    <motion.div whileHover={{ y: -10 }} key={company.id} className="h-full">
                      <Link href={`/company/${company.id}`} className="block h-full">
                        <div className="flex flex-col h-full rounded-3xl bg-white border border-[#c2f0c2] p-8 hover:shadow-[0_20px_50px_-12px_rgba(74,222,128,0.15)] transition-all relative overflow-hidden group">
                          
                          <div className="absolute top-0 right-0 w-full h-2 bg-[#d1f5d1] group-hover:bg-[#4ade80] transition-colors" />

                          <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-[#f4fcf4] border border-[#d1f5d1] flex items-center justify-center shrink-0 shadow-sm">
                              <Bus className="h-8 w-8 text-[#3aa53a]" />
                            </div>
                            {company.is_verified && (
                              <div className="flex items-center gap-1.5 bg-[#eafaea] text-[#2c842c] px-3 py-1.5 rounded-full text-xs font-bold border border-[#c2f0c2]">
                                <ShieldCheck className="h-4 w-4" /> Verified
                              </div>
                            )}
                          </div>
                          
                          <div className="grow">
                            <h3 className="text-2xl font-bold text-[#142914] mb-2 group-hover:text-[#2c842c] transition-colors">
                              {company.name}
                            </h3>
                            {company.tagline && (
                              <p className="text-[15px] text-[#4a824a] line-clamp-2 leading-relaxed">
                                {company.tagline}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f0fdf0]">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold text-[#649c64] uppercase">User Rating</span>
                              <div className="flex items-center gap-1">
                                <StarRating rating={company.rating} size={16} />
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs font-semibold text-[#649c64] uppercase">Reviews</span>
                              <span className="text-sm font-bold text-[#142914]">
                                {company.review_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
            </div>
          </div>
        </section>

        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="bg-[#142914] rounded-[3rem] p-10 md:p-16 lg:p-20 overflow-hidden relative border border-[#2c522c] shadow-2xl">
               
              <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.15)_0,transparent_60%)] pointer-events-none" />

              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                    Your journey in your pocket.
                  </h2>
                  <p className="text-[#a5d6a5] text-lg mb-10 leading-relaxed max-w-lg">
                    Get the full experience with our mobile app. Real-time boarding passes, live bus tracking, and exclusive mobile-only discounts.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button className="h-16 px-8 rounded-2xl bg-white text-[#142914] hover:bg-[#eaffea] font-bold text-lg flex items-center justify-center gap-3 transition-transform hover:-translate-y-1">
                      <Smartphone className="w-6 h-6" /> Download iOS App
                    </Button>
                    <Button className="h-16 px-8 rounded-2xl bg-[#2c522c] text-white hover:bg-[#3b6b3b] font-bold text-lg border border-[#4a824a] flex items-center justify-center gap-3 transition-transform hover:-translate-y-1">
                      <Smartphone className="w-6 h-6" /> Download Android
                    </Button>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { icon: Navigation, title: "Live Tracking", desc: "Share your trip ETA with family." },
                    { icon: CreditCard, title: "Seamless Pay", desc: "One-tap checkout & saved cards." },
                    { icon: ShieldCheck, title: "Verified Safety", desc: "Drivers vetted and trips monitored." },
                    { icon: Clock, title: "Instant Alerts", desc: "Push notifications for delays." }
                  ].map((feature, idx) => (
                    <div key={idx} className="bg-[#1e3d1e] rounded-3xl p-6 border border-[#2c522c]">
                      <div className="w-12 h-12 rounded-xl bg-[#2c522c] flex items-center justify-center mb-4 text-[#4ade80]">
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <h4 className="text-white font-bold text-lg mb-2">{feature.title}</h4>
                      <p className="text-[#8dc98d] text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}