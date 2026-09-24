import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  QrCode,
  Share2,
  Twitter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFormShareInfo } from "./api";

export function ShareFormCard({ programId, programName }: { programId: string; programName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["form-share", programId],
    queryFn: () => getFormShareInfo(programId),
  });

  if (isLoading || !data?.published) return null;

  const { publicUrl, qrCodeDataUrl } = data;
  const shareText = `Register for ${programName}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link automatically. Please copy it manually");
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: publicUrl });
      } catch {
        /* user cancelled the share sheet */
      }
    } else {
      await copyLink();
    }
  };

  const downloadQr = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `${programName.replace(/\s+/g, "-").toLowerCase()}-registration-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const shareLinks = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${publicUrl}`)}`,
    },
    {
      label: "X / Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${publicUrl}`)}`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" />
          Share this registration form
        </CardTitle>
        <CardDescription>
          Anyone with this link can register while the program stays open. Share it directly or let people scan the
          QR code.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly onFocus={(e) => e.target.select()} className="tabular-nums text-xs sm:text-sm" />
              <Button variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={nativeShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            {shareLinks.map((platform) => (
              <Button
                key={platform.label}
                variant="outline"
                size="icon"
                title={`Share on ${platform.label}`}
                onClick={() => window.open(platform.href, "_blank", "noopener,noreferrer")}
              >
                <platform.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        {qrCodeDataUrl && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-border/70 bg-white p-2 shadow-sm">
              <img src={qrCodeDataUrl} alt="QR code linking to the registration form" className="h-32 w-32" />
            </div>
            <Button variant="ghost" size="sm" onClick={downloadQr}>
              <Download className="h-4 w-4" />
              <QrCode className="h-4 w-4" />
              Download QR
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
