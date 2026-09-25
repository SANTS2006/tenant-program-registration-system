import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

/** Takes visitors on the sign-in and sign-up pages back to the public website. */
export function BackToWebsiteButton() {
  return (
    <LinkButton to="/" variant="outline" size="sm" className="rounded-full">
      <ArrowLeft className="h-4 w-4" />
      <span className="sm:hidden">Website</span>
      <span className="hidden sm:inline">Back to website</span>
    </LinkButton>
  );
}
