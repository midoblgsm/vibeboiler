import { z } from "zod";

export const TargetSchema = z.enum(["web", "mobile", "apple"]);
export type Target = z.infer<typeof TargetSchema>;

export const WizardConfigSchema = z.object({
  projectId: z.string().min(1),
  displayName: z.string().min(1),
  slug: z.string().min(1),
  bundleId: z.string().min(1).optional(),
  androidPackage: z.string().min(1).optional(),
  region: z.string().default("aws-us-east-2"),
  targets: z.array(TargetSchema).default(["web"]),
  github: z
    .object({
      owner: z.string(),
      repo: z.string(),
      templateOwner: z.string().default("midoblgsm"),
      templateRepo: z.string().default("vibeboiler"),
      private: z.boolean().default(true),
    })
    .optional(),
  expo: z
    .object({
      accountName: z.string(),
    })
    .optional(),
  apple: z
    .object({
      teamId: z.string(),
      appleId: z.string(),
    })
    .optional(),
});

export type WizardConfig = z.infer<typeof WizardConfigSchema>;

export const WizardStateSchema = z.object({
  version: z.literal(1).default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  project: z
    .object({
      id: z.string().optional(),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      bundleId: z.string().optional(),
      androidPackage: z.string().optional(),
      region: z.string().optional(),
    })
    .default({}),
  targets: z.array(TargetSchema).default([]),
  firebase: z
    .object({
      projectId: z.string().optional(),
      projectNumber: z.string().optional(),
      servicesEnabled: z.array(z.string()).default([]),
      firestoreCreated: z.boolean().default(false),
      web: z
        .object({
          appId: z.string().optional(),
          apiKey: z.string().optional(),
          authDomain: z.string().optional(),
          storageBucket: z.string().optional(),
          messagingSenderId: z.string().optional(),
        })
        .default({}),
      ios: z
        .object({
          appId: z.string().optional(),
        })
        .default({}),
      android: z
        .object({
          appId: z.string().optional(),
        })
        .default({}),
    })
    .default({}),
  gcp: z
    .object({
      serviceAccountEmail: z.string().optional(),
      rolesGranted: z.array(z.string()).default([]),
    })
    .default({}),
  neon: z
    .object({
      projectId: z.string().optional(),
    })
    .default({}),
  expo: z
    .object({
      projectId: z.string().optional(),
      owner: z.string().optional(),
      slug: z.string().optional(),
    })
    .default({}),
  apple: z
    .object({
      bundleIdRecordId: z.string().optional(),
      ascAppId: z.string().optional(),
    })
    .default({}),
  github: z
    .object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      secretsPushed: z.array(z.string()).default([]),
    })
    .default({}),
  steps: z.record(z.string(), z.boolean()).default({}),
});

export type WizardState = z.infer<typeof WizardStateSchema>;

export function emptyState(): WizardState {
  return WizardStateSchema.parse({});
}
