import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import type { Program } from "@/types/api";
import { useUpdateProgram } from "./hooks";

/** Rules for who can register, such as one registration per email address. */
export function RegistrationRulesCard({ program }: { program: Program }) {
  const updateProgram = useUpdateProgram(program.id);

  const toggleOnePerEmail = async (checked: boolean) => {
    try {
      await updateProgram.mutateAsync({ oneRegistrationPerEmail: checked });
      toast.success(checked ? "Each email can now register only once" : "Emails can now register more than once");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MailCheck className="h-4 w-4 text-primary" />
          Registration rules
        </CardTitle>
        <CardDescription>Control who can submit the registration form.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-3">
          <div>
            <Label htmlFor="onePerEmail" className="font-medium">
              One registration per email address
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {program.oneRegistrationPerEmail
                ? "Anyone who tries to register again with the same email is told their registration failed because they can only register once."
                : "The same email address can be used to register as many times as needed."}{" "}
              This uses the form&apos;s email question, so make sure your form has one.
            </p>
          </div>
          <Switch
            id="onePerEmail"
            checked={program.oneRegistrationPerEmail}
            onCheckedChange={toggleOnePerEmail}
            disabled={updateProgram.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
