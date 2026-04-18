"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bodyProfileGetResponseSchema,
  bodyProfileUpsertInputSchema,
  type BodyFrame,
  type BodyProfile,
  type BodyProfileDetailedKey,
  type BodyProfileSimpleKey,
} from "@freestyle/contracts";
import {
  bodyMeasurementFields,
  createLocalBodyProfileRepository,
  resolveAvatarVariantFromProfile,
  updateBodyProfileMeasurement,
} from "@freestyle/domain-avatar";
import { apiFetchJson, isClientApiConfigured } from "@/lib/clientApi";

const repository = createLocalBodyProfileRepository();

export function useBodyProfile() {
  const [profile, setProfile] = useState<BodyProfile>(() => repository.load());
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (!isClientApiConfigured) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      const { response, data } = await apiFetchJson<unknown>("/v1/profile/body-profile");
      const parsed = bodyProfileGetResponseSchema.safeParse(data);

      if (cancelled) return;

      if (response.ok && parsed.success && parsed.data.bodyProfile?.profile) {
        setProfile(parsed.data.bodyProfile.profile);
      }

      setApiReady(true);
    };

    hydrate().catch(() => {
      if (!cancelled) {
        setApiReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    repository.save(profile);
  }, [profile]);

  useEffect(() => {
    if (!isClientApiConfigured || !apiReady) return;

    const timeout = window.setTimeout(() => {
      const payload = bodyProfileUpsertInputSchema.parse({ profile });
      apiFetchJson("/v1/profile/body-profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [apiReady, profile]);

  return useMemo(
    () => ({
      profile,
      fields: bodyMeasurementFields,
      avatarVariantId: resolveAvatarVariantFromProfile(profile),
      setProfile,
      setGender: (gender: BodyProfile["gender"]) =>
        setProfile((current) => ({
          ...current,
          gender,
        })),
      setBodyFrame: (bodyFrame: BodyFrame) =>
        setProfile((current) => ({
          ...current,
          bodyFrame,
        })),
      updateMeasurement: (key: BodyProfileSimpleKey | BodyProfileDetailedKey, value: number) =>
        setProfile((current) => updateBodyProfileMeasurement(current, key, value)),
    }),
    [profile],
  );
}
