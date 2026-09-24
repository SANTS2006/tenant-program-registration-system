import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { DynamicForm, type UploadedFileInfo } from "./DynamicForm";
import { FormCoverHeader } from "./FormCoverHeader";
import { getPublicForm, getPublicProgram, submitRegistration, uploadPublicFile } from "./api";

export function PublicRegistrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const { data: program } = useQuery({
    queryKey: ["public-program", slug],
    queryFn: () => getPublicProgram(slug!),
    enabled: !!slug,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => getPublicForm(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading registration form...</p>;

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {error instanceof ApiError ? error.message : "This registration form is not available."}
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (responses: Record<string, unknown>, files: UploadedFileInfo[]) => {
    setSubmitting(true);
    setErrors([]);
    try {
      const result = await submitRegistration(slug!, responses, files);
      navigate(`/programs/${slug}/confirmation`, { state: result });
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setErrors(err.details as string[]);
      } else {
        setErrors([err instanceof ApiError ? err.message : "Something went wrong. Please try again."]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {program && (
        <FormCoverHeader name={program.name} thumbnailUrl={program.thumbnailUrl} description={program.description} />
      )}
      <CardHeader>
        <CardTitle>{data.form.title}</CardTitle>
        {data.form.description && <CardDescription>{data.form.description}</CardDescription>}
        {data.form.instructions && <p className="text-sm text-muted-foreground">{data.form.instructions}</p>}
      </CardHeader>
      <CardContent>
        <DynamicForm
          sections={data.sections}
          fields={data.fields}
          errors={errors}
          submitting={submitting}
          layoutMode={data.form.layoutMode}
          requireConsent={data.form.requireConsent}
          consentText={data.form.consentText}
          onUploadFile={(file, fieldKey) => uploadPublicFile(slug!, fieldKey, file)}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/programs/${slug}`)}
        />
      </CardContent>
    </Card>
  );
}
