import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { ApiError } from "@/lib/api";
import { resetPassword } from "./api";
import { AuthCardShell } from "./AuthCardShell";

const MIN_LENGTH = 8;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [linkInvalid, setLinkInvalid] = React.useState(!token);

  if (linkInvalid) {
    return (
      <AuthCardShell icon={TriangleAlert} title="Link expired" subtitle="This password reset link is invalid or has expired.">
        <p className="text-sm text-muted-foreground">Reset links work once and expire after 10 minutes. Request a new one below.</p>
        <LinkButton to="/forgot-password" variant="default" size="lg" className="h-12 rounded-full">
          Request a new link
        </LinkButton>
        <Link to="/login" className="text-center text-sm font-medium text-muted-foreground hover:text-primary">
          Back to sign in
        </Link>
      </AuthCardShell>
    );
  }

  if (done) {
    return (
      <AuthCardShell icon={CheckCircle2} title="Password reset" subtitle="Your password has been changed successfully.">
        <p className="text-sm text-muted-foreground">
          You can now sign in with your new password. We&apos;ve also emailed you a confirmation, and signed you out of
          other devices for security.
        </p>
        <LinkButton to="/login" variant="default" size="lg" className="h-12 rounded-full">
          Sign in
        </LinkButton>
      </AuthCardShell>
    );
  }

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH || password !== confirm) return;
    setSubmitting(true);
    try {
      await resetPassword(token!, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && /invalid or has expired/i.test(err.message)) setLinkInvalid(true);
      else toast.error(err instanceof ApiError ? err.message : "Could not reset your password, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCardShell icon={LockKeyhole} title="Choose a new password" subtitle="Pick something you haven't used before.">
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              className="h-12 rounded-full px-5 pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className={tooShort ? "px-2 text-sm text-destructive" : "px-2 text-xs text-muted-foreground"}>
            At least {MIN_LENGTH} characters.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            className="h-12 rounded-full px-5"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && <p className="px-2 text-sm text-destructive">Passwords don&apos;t match</p>}
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-full"
          disabled={submitting || password.length < MIN_LENGTH || password !== confirm}
        >
          {submitting ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </AuthCardShell>
  );
}
