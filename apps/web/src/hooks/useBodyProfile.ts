"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bodyMeasurementFields,
  createLocalBodyProfileRepository,
  resolveAvatarVariantFromProfile,
  updateBodyProfileMeasurement,
} from "@freestyle/domain-avatar";
import type {
  BodyFrame,
  BodyProfile,
  BodyProfileDetailedKey,
  BodyProfileSimpleKey,
} from "@freestyle/shared-types";
import { normalizeBodyProfile } from "@freestyle/shared-types";
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
      const { response, data } = await apiFetchJson<{ bodyProfile?: { profile?: BodyProfile } | null }>(
        "/v1/profile/body-profile",
      );

      if (cancelled) return;

      if (response.ok && data?.bodyProfile?.profile) {
        setProfile(normalizeBodyProfile(data.bodyProfile.profile));
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
      apiFetchJson("/v1/profile/body-profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ profile }),
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
