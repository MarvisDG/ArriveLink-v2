"use client";

import { useState } from "react";
import { useLocation } from "wouter";
import { Bus, LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = "/api";

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export default function OperatorLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCompanyId, setSignupCompanyId] = useState("");

  const { data: companies } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["companies-list"],
    queryFn: () => fetch(`${API_BASE}/companies`).then((r) => r.json()),
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost("/operator/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem("operator_token", data.token);
      navigate("/business/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Login failed",
        description:
          err instanceof Error ? err.message : "Please check your details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!signupCompanyId) {
      toast({
        title: "Select your company",
        description: "Choose the company you represent",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost("/operator/auth/signup", {
        email: signupEmail,
        password: signupPassword,
        company_id: parseInt(signupCompanyId),
      });
      localStorage.setItem("operator_token", data.token);
      navigate("/business/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Sign up failed",
        description:
          err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="p-2 rounded-xl bg-primary text-white">
            <Bus className="h-6 w-6" />
          </div>
          <span className="font-display text-2xl font-bold text-primary">
            ArriveLink
          </span>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="gap-2">
              <LogIn className="h-4 w-4" />
              Operator Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Sign in to manage your company's listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Create operator account</CardTitle>
                <CardDescription>
                  Register to manage your transport company's listing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Your company</Label>
                    <Select
                      value={signupCompanyId}
                      onValueChange={setSignupCompanyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-6">
          For transport company representatives only.{" "}
          <a href="/" className="text-primary hover:underline">
            Back to ArriveLink
          </a>
        </p>
      </div>
    </div>
  );
}
