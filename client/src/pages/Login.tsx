import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { signIn } from "../lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { TicketCheck, Loader2, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").superRefine((val, ctx) => {
    if (val.length > 0 && !z.string().email().safeParse(val).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address",
      });
    }
  }),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, { message: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const { register } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const formatted: Record<string, { message: string }> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        formatted[path] = { message: issue.message };
      }
      setFieldErrors(formatted);
      setSubmitting(false);
      return;
    }
    const { error: err } = await signIn.email(data);
    setSubmitting(false);
    if (err) {
      setError(err.message ?? "Invalid email or password");
      return;
    }
    const from = (location.state as any)?.from?.pathname ?? "/";
    const target = from.endsWith("/") ? from : `${from}/`;
    navigate(target);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const formData = new FormData(e.currentTarget);
    const data: LoginForm = {
      email: (formData.get("email") as string) ?? "",
      password: (formData.get("password") as string) ?? "",
    };
    await onSubmit(data);
  };

  return (
    <div className="min-h-svh grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-brand from-60% to-brand/60 overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700 fill-mode-both">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Glow orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-white/15 blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />

        {/* Content */}
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 size-16 rounded-2xl bg-white/25 blur-2xl" />
            <div className="relative flex items-center justify-center size-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30">
              <TicketCheck className="size-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-white text-3xl font-semibold tracking-tight">
              TicketHub
            </h1>
            <p className="text-white/60 text-sm mt-2 max-w-56 leading-relaxed">
              AI-powered ticket management for your support team.
            </p>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-12 left-12 right-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-150 fill-mode-both">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 lg:hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <div className="flex items-center justify-center size-12 rounded-xl bg-brand/10 border border-brand/20">
              <TicketCheck className="size-6 text-brand" />
            </div>
            <span className="text-foreground text-lg font-semibold tracking-tight">
              TicketHub
            </span>
          </div>

          <Card className="border-border/50 shadow-2xl shadow-black/40">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to your account to continue
                </p>
              </div>

              <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">{fieldErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 fill-mode-both">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">{fieldErrors.password.message}</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 animate-in fade-in duration-300 fill-mode-both">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
                  <Button
                    type="submit"
                    className="w-full transition-all duration-300 hover:-translate-y-0.5"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
