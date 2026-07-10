"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, MessageCircle, ExternalLink, Loader2, Key } from "lucide-react";

import { useInitiateUnlock, useVerifyUnlock } from "../../lib/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const unlockFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
});

type UnlockFormValues = z.infer<typeof unlockFormSchema>;

interface UnlockContactModalProps {
  companyId: number;
  routeId: number;
  companyName: string;
  trigger?: React.ReactNode;
}

export function UnlockContactModal({ companyId, routeId, companyName, trigger }: UnlockContactModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [unlockData, setUnlockData] = useState<{ reference: string; email: string; testMode: boolean; paymentUrl?: string | null } | null>(null);
  
  const initiateUnlock = useInitiateUnlock();
  const verifyUnlock = useVerifyUnlock();

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = (values: UnlockFormValues) => {
    initiateUnlock.mutate(
      {
        data: {
          traveler_name: values.name,
          traveler_email: values.email,
          company_id: companyId,
          route_id: routeId,
        },
      },
      {
        onSuccess: (data) => {
          setUnlockData({
            reference: data.reference,
            email: values.email,
            testMode: data.test_mode,
            paymentUrl: data.payment_url,
          });
          setStep("payment");
        },
      }
    );
  };

  const handleVerify = () => {
    if (!unlockData) return;
    
    verifyUnlock.mutate(
      {
        data: {
          reference: unlockData.reference,
          traveler_email: unlockData.email,
        },
      },
      {
        onSuccess: () => {
          setStep("success");
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when modal closes
      setTimeout(() => {
        setStep("form");
        setUnlockData(null);
        form.reset();
        verifyUnlock.reset();
        initiateUnlock.reset();
      }, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary" className="w-full" data-testid={`button-unlock-${companyId}-${routeId}`}>
            <Key className="w-4 h-4 mr-2" />
            Unlock Contact — ₦200
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="modal-unlock-contact">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Unlock Contact for {companyName}</DialogTitle>
              <DialogDescription>
                Pay a small fee of ₦200 to get direct access to the terminal representative. No more middle-men or inaccurate info.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Chinedu Okafor" {...field} data-testid="input-unlock-name" />
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="chinedu@example.com" {...field} data-testid="input-unlock-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {initiateUnlock.isError && (
                  <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-md">
                    Failed to initiate payment. Please try again.
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={initiateUnlock.isPending}
                  data-testid="button-submit-unlock"
                >
                  {initiateUnlock.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}

        {step === "payment" && unlockData && (
          <>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                You're almost there! Complete your payment to reveal the contact details.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              {unlockData.testMode ? (
                <div className="p-4 bg-muted rounded-lg border text-center space-y-4">
                  <div className="text-sm text-muted-foreground">
                    This is running in test mode. No real money will be charged.
                  </div>
                  <Button 
                    onClick={handleVerify} 
                    disabled={verifyUnlock.isPending}
                    className="w-full"
                    data-testid="button-simulate-payment"
                  >
                    {verifyUnlock.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Simulate Payment (Test Mode)"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to complete your payment securely via Paystack.
                  </p>
                  {unlockData.paymentUrl && (
                    <Button asChild className="w-full" variant="outline">
                      <a 
                        href={unlockData.paymentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Open Payment Page <ExternalLink className="ml-2 w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-4">
                      After you have completed the payment on Paystack, click below.
                    </p>
                    <Button 
                      onClick={handleVerify} 
                      disabled={verifyUnlock.isPending}
                      className="w-full"
                      data-testid="button-verify-payment"
                    >
                      {verifyUnlock.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "I've completed my payment"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {verifyUnlock.isError && (
                <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-md">
                  Verification failed. Make sure you completed the payment before clicking verify.
                </div>
              )}
            </div>
          </>
        )}

        {step === "success" && verifyUnlock.data && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-600 dark:text-green-500">Contact Unlocked!</DialogTitle>
              <DialogDescription>
                You now have direct access to the representative for this route.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <div className="p-4 bg-muted rounded-lg space-y-2 text-center border">
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  {verifyUnlock.data.company_name}
                </p>
                <p className="font-display font-bold text-2xl tracking-wider text-primary">
                  {verifyUnlock.data.contact_value}
                </p>
                <p className="text-xs text-muted-foreground pt-2">
                  {verifyUnlock.data.route_summary}
                </p>
              </div>

              {verifyUnlock.data.contact_type === 'whatsapp' ? (
                <Button asChild className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
                  <a 
                    href={`https://wa.me/${verifyUnlock.data.contact_value.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    data-testid="link-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat on WhatsApp
                  </a>
                </Button>
              ) : (
                <Button asChild className="w-full" variant="secondary">
                  <a href={`tel:${verifyUnlock.data.contact_value}`} data-testid="link-phone">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Representative
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
