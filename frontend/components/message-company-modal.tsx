import { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface MessageCompanyModalProps {
  companyId: number;
  companyName: string;
  trigger?: React.ReactNode;
}

function getUserInfo() {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("user_token");
  const name = localStorage.getItem("user_name");
  if (token && name) return { token, name };
  return null;
}

export function MessageCompanyModal({
  companyId,
  companyName,
  trigger,
}: MessageCompanyModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"compose" | "sent">("compose");
  const [loading, setLoading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const userInfo = getUserInfo();
  const isLoggedIn = !!userInfo;

  async function handleSend() {
    if (!message.trim()) return;
    if (!isLoggedIn && (!guestName.trim() || !guestEmail.trim())) return;

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        company_id: companyId,
        initial_message: message.trim(),
      };

      if (!isLoggedIn) {
        body.guest_name = guestName.trim();
        body.guest_email = guestEmail.trim();
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (isLoggedIn && userInfo) {
        headers["Authorization"] = `Bearer ${userInfo.token}`;
      }

      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to send message");
      }

      setStep("sent");
    } catch (err) {
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setStep("compose");
      setMessage("");
      setGuestName("");
      setGuestEmail("");
    }, 300);
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button className="w-full sm:w-auto" data-testid="btn-message-company">
            <MessageSquare className="mr-2 h-4 w-4" />
            Message Company
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          {step === "compose" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Message {companyName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {!isLoggedIn && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You're messaging as a guest.{" "}
                      <a href="/app/login" className="text-primary hover:underline">
                        Sign in
                      </a>{" "}
                      to track replies in your inbox.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="guest-name">Your name</Label>
                        <Input
                          id="guest-name"
                          placeholder="Emeka Obi"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="guest-email">Email address</Label>
                        <Input
                          id="guest-email"
                          type="email"
                          placeholder="you@email.com"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {isLoggedIn && (
                  <p className="text-sm text-muted-foreground">
                    Sending as <span className="font-medium text-foreground">{userInfo.name}</span>. 
                    Replies will appear in your inbox.
                  </p>
                )}

                <div className="space-y-1">
                  <Label htmlFor="message-body">Your message</Label>
                  <Textarea
                    id="message-body"
                    placeholder={`Ask ${companyName} about availability, prices, or departure times...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={
                      loading ||
                      !message.trim() ||
                      (!isLoggedIn && (!guestName.trim() || !guestEmail.trim()))
                    }
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Message
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Message sent!</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground mb-1">
                    Your message was sent to {companyName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isLoggedIn
                      ? "Check your messages inbox for their reply."
                      : "They'll reply by email. Create an account to track all your conversations."}
                  </p>
                </div>
                <div className="flex gap-3">
                  {!isLoggedIn && (
                    <Button variant="outline" asChild onClick={handleClose}>
                      <a href="/app/login">Create Account</a>
                    </Button>
                  )}
                  {isLoggedIn && (
                    <Button variant="outline" asChild onClick={handleClose}>
                      <a href="/app">View Messages</a>
                    </Button>
                  )}
                  <Button onClick={handleClose}>Done</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
