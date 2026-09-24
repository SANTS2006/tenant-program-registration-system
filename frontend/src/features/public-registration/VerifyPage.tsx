import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, BadgeCheck, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { verifyRegistration } from "./api";

export function VerifyPage() {
  const { slug, registrationNumber } = useParams<{ slug: string; registrationNumber: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["verify", slug, registrationNumber],
    queryFn: () => verifyRegistration(slug!, registrationNumber!),
    enabled: !!slug && !!registrationNumber,
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Verifying...</p>;

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-destructive text-white">
            <ShieldX className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-semibold">Registration not found</h1>
          <p className="text-sm text-muted-foreground">
            We couldn't verify this registration. Double-check the link or QR code.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full text-white ${
            data.valid ? "bg-gradient-success" : "bg-gradient-destructive"
          }`}
        >
          {data.valid ? <BadgeCheck className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
        </span>
        <h1 className="text-xl font-semibold">{data.valid ? "Valid Registration" : "Registration Not Valid"}</h1>
        <div className="mt-2 flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Program: </span>
            <span className="font-medium">{data.programName}</span>
          </p>
          {data.applicantName && (
            <p>
              <span className="text-muted-foreground">Participant: </span>
              <span className="font-medium">{data.applicantName}</span>
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Registration #: </span>
            <span className="font-medium">{data.registrationNumber}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium capitalize">{data.status.replace("_", " ")}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
