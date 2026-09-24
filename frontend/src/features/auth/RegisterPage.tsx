import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApiError } from "@/lib/api";

const registerSchema = z
  .object({
    organizationName: z.string().min(2, "Enter your organization or account name"),
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

function OwnAccountMockCard() {
  return (
    <div className="w-56 rotate-2 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
      <p className="text-[11px] uppercase tracking-wide text-white/60">Your account</p>
      <div className="mt-3 flex flex-col gap-2">
        {["Programs", "Registrations", "Team"].map((row) => (
          <div key={row} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
            <span className="text-xs font-medium text-white/90">{row}</span>
            <span className="h-1.5 w-10 rounded-full bg-white/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { user, register: createAccount, isLoading } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  // Signing up sets the auth user, which re-renders this page into the redirect
  // below -- this marks that redirect as "just registered" so the verification
  // screen knows a code was sent moments ago.
  const justRegisteredRef = React.useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  if (!isLoading && user) {
    return justRegisteredRef.current ? (
      <Navigate to="/verify-email" replace state={{ codeJustSent: true }} />
    ) : (
      <Navigate to="/admin" replace />
    );
  }

  const onSubmit = async (values: RegisterForm) => {
    setSubmitting(true);
    justRegisteredRef.current = true;
    try {
      await createAccount({
        organizationName: values.organizationName,
        name: values.name,
        email: values.email,
        password: values.password,
      });
    } catch (err) {
      justRegisteredRef.current = false;
      const message = err instanceof ApiError ? err.message : "Unable to create your account";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-enter flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-2xl lg:min-h-[680px] lg:grid-cols-2">
        {/* Info panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-brand p-10 text-white lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-gradient-radial-soft opacity-60" />

          <p className="relative max-w-[220px] text-xs text-white/70">
            Set up your own workspace in minutes &mdash; no setup fees, no waiting.
          </p>

          <div className="relative flex flex-1 flex-col items-center justify-center gap-8 py-10">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

            <h1 className="relative text-center text-3xl font-bold leading-tight">
              Your own space for
              <br />
              programs and registrations
            </h1>

            <div className="relative">
              <OwnAccountMockCard />
            </div>
          </div>

          <p className="relative text-xs text-white/60">
            &copy; {new Date().getFullYear()} Program Registration Platform
          </p>
        </div>

        {/* Form panel */}
        <div className="flex flex-col p-6 sm:p-10 lg:p-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-semibold">
              <BrandLogo className="h-9" />
              <span className="gradient-text">Program Registration</span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-sm">
              <div className="mb-6">
                <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You'll be the admin of your own workspace, with full control over your programs.
                </p>
              </div>

              <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="organizationName" className="sr-only">
                    Organization name
                  </Label>
                  <Input
                    id="organizationName"
                    autoComplete="organization"
                    placeholder="Organization or account name"
                    className="h-12 rounded-full px-5"
                    {...register("organizationName")}
                  />
                  {errors.organizationName && (
                    <p className="px-2 text-sm text-destructive">{errors.organizationName.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="sr-only">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Your full name"
                    className="h-12 rounded-full px-5"
                    {...register("name")}
                  />
                  {errors.name && <p className="px-2 text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    className="h-12 rounded-full px-5"
                    {...register("email")}
                  />
                  {errors.email && <p className="px-2 text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password" className="sr-only">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Password"
                      className="h-12 rounded-full px-5 pr-12"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="px-2 text-sm text-destructive">{errors.password.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword" className="sr-only">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className="h-12 rounded-full px-5"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="px-2 text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={submitting} size="lg" className="mt-2 h-12 rounded-full">
                  {submitting ? "Creating account..." : "Create account"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
