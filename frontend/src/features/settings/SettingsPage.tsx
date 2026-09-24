import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, KeyRound, MailCheck, ShieldCheck, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/Avatar";
import { CodeInput } from "@/components/CodeInput";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/api";
import { confirmEmailChange, requestEmailChange } from "../auth/api";
import { changePassword, updateProfile, uploadAvatar } from "./api";

const RESEND_COOLDOWN_SECONDS = 60;

function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const { updateLocalUser } = useAuth();
  const [step, setStep] = React.useState<"idle" | "enter" | "code">("idle");
  const [newEmail, setNewEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const reset = () => {
    setStep("idle");
    setNewEmail("");
    setCode("");
  };

  const sendCode = async () => {
    setBusy(true);
    try {
      await requestEmailChange(newEmail);
      setStep("code");
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(`Verification code sent to ${newEmail.trim().toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send a verification code");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    try {
      const updated = await confirmEmailChange(value);
      updateLocalUser(updated);
      toast.success("Email address updated");
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not verify the code");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
      <Label htmlFor="currentEmail" className="flex items-center gap-1.5">
        <MailCheck className="h-3.5 w-3.5 text-primary" />
        Email address
      </Label>

      {step === "idle" && (
        <div className="flex gap-2">
          <Input id="currentEmail" value={currentEmail} disabled className="flex-1" />
          <Button type="button" variant="outline" onClick={() => setStep("enter")}>
            Change
          </Button>
        </div>
      )}

      {step === "enter" && (
        <div className="flex flex-col gap-3">
          <Input
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll email a 6-character code to the new address. Your email only changes once you confirm it.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={sendCode} disabled={busy || !newEmail.includes("@")}>
              {busy ? "Sending..." : "Send code"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-gradient-brand-soft p-4">
          <p className="text-sm text-muted-foreground">
            Enter the code sent to{" "}
            <span className="font-semibold text-foreground">{newEmail.trim().toLowerCase()}</span>
          </p>
          <CodeInput value={code} onChange={setCode} onComplete={confirm} disabled={busy} autoFocus />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => confirm(code)} disabled={busy || code.length !== 6}>
              {busy ? "Verifying..." : "Confirm new email"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <button type="button" onClick={sendCode} className="font-medium text-primary hover:opacity-80">
                  Resend code
                </button>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const profileSchema = z.object({
  name: z.string().min(2, "Name is required").max(200),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, updateLocalUser, logout } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "" },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (values: ProfileForm) => {
    try {
      const updated = await updateProfile({ name: values.name });
      updateLocalUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      const updated = await updateProfile({ avatarUrl: url });
      updateLocalUser(updated);
      toast.success("Profile picture updated");
    } catch {
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const onChangePassword = async (values: PasswordForm) => {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success("Password changed. Please log in again.");
      passwordForm.reset();
      await logout();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, photo, and account security.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>Update your name, profile picture, and email address.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={user.name} src={user.avatarUrl} size="lg" />
                <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow">
                  <Camera className="h-3.5 w-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={uploadingAvatar} />
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                {uploadingAvatar ? "Uploading..." : "Click the camera icon to change your photo."}
              </div>
            </div>

            <form className="flex flex-col gap-4" onSubmit={profileForm.handleSubmit(onSaveProfile)}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...profileForm.register("name")} />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
              <Button type="submit" disabled={!profileForm.formState.isDirty || profileForm.formState.isSubmitting} className="w-fit">
                Save profile
              </Button>
            </form>

            <ChangeEmailSection currentEmail={user.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Change password
            </CardTitle>
            <CardDescription>You'll be signed out on this device after changing your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={passwordForm.handleSubmit(onChangePassword)}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <PasswordInput id="currentPassword" autoComplete="current-password" {...passwordForm.register("currentPassword")} />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <PasswordInput id="newPassword" autoComplete="new-password" {...passwordForm.register("newPassword")} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <PasswordInput id="confirmPassword" autoComplete="new-password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" variant="destructive" disabled={passwordForm.formState.isSubmitting} className="w-fit">
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Account
            </CardTitle>
            <CardDescription>Your role and access level, managed by a super admin.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Role</p>
              <p className="text-sm font-medium capitalize">{user.role.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Account status</p>
              <p className="text-sm font-medium capitalize">{user.status}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
