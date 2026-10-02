import { describe, expect, it } from "vitest";
import { validateAndNormalizeResponses } from "../../src/modules/registrations/validation.js";
import type { FieldRow } from "../../src/modules/forms/repository.js";

function field(partial: Partial<FieldRow> & { fieldKey: string; type: string }): FieldRow {
  return {
    id: partial.fieldKey,
    formId: "f",
    sectionId: null,
    label: partial.fieldKey,
    description: null,
    placeholder: null,
    helpText: null,
    required: false,
    orderIndex: 0,
    config: {},
    conditionalLogic: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as unknown as FieldRow;
}

const check = (fields: FieldRow[], responses: Record<string, unknown>) => {
  try {
    return { ok: true as const, value: validateAndNormalizeResponses(fields, responses, []) };
  } catch (err) {
    return { ok: false as const, errors: ((err as { details?: string[] }).details ?? []) as string[] };
  }
};

describe("show a question only when another answer matches", () => {
  const fields = [
    field({ fieldKey: "employed", type: "yes_no" }),
    field({
      fieldKey: "employer",
      type: "short_text",
      required: true,
      conditionalLogic: [{ fieldKey: "employed", operator: "equals", value: "true" }],
    }),
  ];

  it("does not ask for a hidden required question", () => {
    expect(check(fields, { employed: false }).ok).toBe(true);
  });

  it("requires it once the answer matches", () => {
    const result = check(fields, { employed: true });
    expect(result.ok).toBe(false);
  });
});

describe("a chosen option can ask for more, in the kind of input the admin picked", () => {
  const withFollowUp = (followUp: Record<string, unknown>) => [
    field({
      fieldKey: "region",
      type: "single_choice",
      config: { options: ["North", "South"], followUps: { North: followUp } },
    }),
  ];

  it("checks numbers", () => {
    const fields = withFollowUp({ mode: "number", label: "How many?", required: true });
    expect(check(fields, { region: "North", region__other: "abc" }).ok).toBe(false);
    expect(check(fields, { region: "North", region__other: "12" }).ok).toBe(true);
  });

  it("requires an answer when asked to", () => {
    const fields = withFollowUp({ mode: "short_text", label: "Town", required: true });
    expect(check(fields, { region: "North" }).ok).toBe(false);
    expect(check(fields, { region: "South" }).ok).toBe(true);
  });

  it("only accepts the listed choices for a dropdown", () => {
    const fields = withFollowUp({ mode: "dropdown", label: "Size", options: ["Small", "Large"] });
    expect(check(fields, { region: "North", region__other: "Huge" }).ok).toBe(false);
    expect(check(fields, { region: "North", region__other: "Large" }).ok).toBe(true);
  });

  it("works on options that were filtered by another answer", () => {
    const fields = [
      field({ fieldKey: "district", type: "single_choice", config: { options: ["A", "B"] } }),
      field({
        fieldKey: "chiefdom",
        type: "single_choice",
        config: {
          options: ["A1", "B1"],
          optionsDependOn: { fieldKey: "district", map: { A: ["A1"], B: ["B1"] } },
          followUps: { A1: { mode: "email", label: "Chief's email", required: true } },
        },
      }),
    ];
    expect(check(fields, { district: "A", chiefdom: "A1", chiefdom__other: "nope" }).ok).toBe(false);
    expect(check(fields, { district: "A", chiefdom: "A1", chiefdom__other: "chief@example.com" }).ok).toBe(true);
    expect(check(fields, { district: "B", chiefdom: "B1" }).ok).toBe(true);
  });
});

describe("an extra input that only applies under conditions", () => {
  const fields = [
    field({ fieldKey: "phone_known", type: "yes_no" }),
    field({
      fieldKey: "region",
      type: "single_choice",
      config: {
        options: ["North", "South"],
        followUps: {
          North: {
            mode: "short_text",
            label: "Town",
            required: true,
            conditions: [{ fieldKey: "phone_known", operator: "equals", value: "true" }],
          },
        },
      },
    }),
  ];
  it("is not asked, or required, when its conditions do not match", () => {
    expect(check(fields, { phone_known: false, region: "North" }).ok).toBe(true);
  });
  it("is required once its conditions match", () => {
    expect(check(fields, { phone_known: true, region: "North" }).ok).toBe(false);
    expect(check(fields, { phone_known: true, region: "North", region__other: "Kono" }).ok).toBe(true);
  });
  it("can depend on whether another question is filled in", () => {
    const filled = [
      field({ fieldKey: "email", type: "short_text" }),
      field({
        fieldKey: "pick",
        type: "single_choice",
        config: {
          options: ["A"],
          followUps: { A: { mode: "short_text", required: true, conditions: [{ fieldKey: "email", operator: "is_not_empty" }] } },
        },
      }),
    ];
    expect(check(filled, { pick: "A" }).ok).toBe(true);
    expect(check(filled, { pick: "A", email: "x" }).ok).toBe(false);
  });
});

describe("multiple choice options that ask for more", () => {
  const fields = [
    field({
      fieldKey: "skills",
      type: "multiple_choice",
      config: {
        options: ["Cooking", "Driving", "Other"],
        followUps: {
          Cooking: { mode: "short_text", label: "Years of experience", required: true },
          Driving: { mode: "number", label: "Licence number" },
        },
      },
    }),
  ];
  it("keeps each ticked option's own answer", () => {
    const r = check(fields, { skills: ["Cooking", "Driving"], skills__fu__Cooking: "5", skills__fu__Driving: "42" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.skills__follow).toEqual({ Cooking: "5", Driving: "42" });
  });
  it("requires the answer only for options that are ticked", () => {
    expect(check(fields, { skills: ["Driving"] }).ok).toBe(true);
    expect(check(fields, { skills: ["Cooking"] }).ok).toBe(false);
  });
  it("checks the kind of input per option", () => {
    expect(check(fields, { skills: ["Driving"], skills__fu__Driving: "abc" }).ok).toBe(false);
  });
});
