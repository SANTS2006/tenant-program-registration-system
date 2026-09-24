import { CheckCircle2, Printer } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import type { SubmitRegistrationResult } from "./api";

export function ConfirmationPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const result = location.state as SubmitRegistrationResult | undefined;

  if (!result) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">We couldn't find your confirmation details.</p>
          <LinkButton to={`/programs/${slug}`} variant="outline" size="sm">
            Back to program
          </LinkButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-success text-white shadow-glow">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-semibold">Registration submitted!</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {result.confirmationMessage ?? "Thank you for registering. We've received your submission."}
        </p>
        <div className="rounded-xl border border-border/70 bg-gradient-brand-soft px-6 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Registration Number</p>
          <p className="gradient-text text-lg font-semibold tracking-wide">{result.registrationNumber}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {result.idCardEnabled && slug && (
            <Button
              variant="success"
              onClick={() =>
                window.open(`/api/public/programs/${slug}/registrations/${result.registrationNumber}/id-card`, "_blank")
              }
            >
              Download ID Card
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="h-4 w-4" />
            Print this page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
