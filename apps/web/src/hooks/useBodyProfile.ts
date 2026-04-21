"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bodyProfileConflictResponseSchema,
  bodyProfileGetResponseSchema,
  bodyProfilePutResponseSchema,
  bodyProfileUpsertInputSchema,
  buildBodyProfileRevision,
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
import { apiFetchJson, getApiErrorMessage, isClientApiConfigured } from "@/lib/clientApi";

const repository = createLocalBodyProfileRepository();
type BodyProfileSyncState = "idle" | "hydrating" | "syncing" | "synced" | "offline" | "conflict" | "error";

export function useBodyProfile() {
  const [profile, setProfile] = useState<BodyProfile>(() => repository.load());
  const [apiReady, setApiReady] = useState(false);
  const [serverRevision, setServerRevision] = useState<string | null>(null);
  const [lastSyncedRevision, setLastSyncedRevision] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<BodyProfileSyncState>(isClientApiConfigured ? "hydrating" : "offline");
  const [syncError, setSyncError] = useState<string | null>(null);
  const localMutationIdRef = useRef(0);
  const blockedMutationIdRef = useRef<number | null>(null);
  const localRevision = useMemo(() => buildBodyProfileRevision(profile), [profile]);

  const updateProfile = useCallback((next: BodyProfile | ((current: BodyProfile) => BodyProfile)) => {
    blockedMutationIdRef.current = null;
    localMutationIdRef.current += 1;
    setSyncError(null);
    setSyncState((current) => (current === "offline" ? current : "idle"));
    setProfile((current) => (typeof next === "function" ? next(current) : next));
  }, []);

  useEffect(() => {
    if (!isClientApiConfigured) {
      return;
    }

    let cancelled = false;
    const hydrateMutationId = localMutationIdRef.current;

    const hydrate = async () => {
      const { response, data } = await apiFetchJson<unknown>("/v1/profile/body-profile");
      const parsed = bodyProfileGetResponseSchema.safeParse(data);

      if (cancelled) return;

      if (response.ok && parsed.success) {
        const serverBodyProfile = parsed.data.bodyProfile;
        setServerRevision(serverBodyProfile?.revision ?? null);
        setLastSyncedRevision(serverBodyProfile?.revision ?? null);
        setSyncError(null);
        setSyncState("synced");

        if (serverBodyProfile?.profile && hydrateMutationId === localMutationIdRef.current) {
          setProfile(serverBodyProfile.profile);
        }
      } else {
        setSyncState("offline");
      }

      setApiReady(true);
    };

    hydrate().catch(() => {
      if (!cancelled) {
        setSyncState("offline");
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
    if (localRevision === lastSyncedRevision) {
      return;
    }
    if (blockedMutationIdRef.current === localMutationIdRef.current) {
      return;
    }

    let cancelled = false;
    const mutationIdAtRequest = localMutationIdRef.current;
    const timeout = window.setTimeout(() => {
      const payload = bodyProfileUpsertInputSchema.parse({
        profile,
        baseRevision: serverRevision ?? undefined,
      });
      setSyncState("syncing");
      apiFetchJson("/v1/profile/body-profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(({ response, data }) => {
          if (cancelled) return;

          const parsed = bodyProfilePutResponseSchema.safeParse(data);
          if (response.ok && parsed.success) {
            setServerRevision(parsed.data.bodyProfile.revision);
            setLastSyncedRevision(parsed.data.bodyProfile.revision);
            setSyncError(null);
            setSyncState("synced");
            blockedMutationIdRef.current = null;
            return;
          }

          if (response.status === 409) {
            const conflict = bodyProfileConflictResponseSchema.safeParse(data);
            if (conflict.success) {
              blockedMutationIdRef.current = mutationIdAtRequest;
              setServerRevision(conflict.data.currentBodyProfile?.revision ?? null);
              setLastSyncedRevision(conflict.data.currentBodyProfile?.revision ?? null);
              setSyncError(conflict.data.message);
              setSyncState("conflict");
              return;
            }
          }

          setSyncError(getApiErrorMessage(data, "Failed to sync body profile."));
          setSyncState("error");
        })
        .catch(() => {
          if (cancelled) return;
          setSyncError("Failed to sync body profile.");
          setSyncState("offline");
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [apiReady, lastSyncedRevision, localRevision, profile, serverRevision]);

  return useMemo(
    () => ({
      profile,
      fields: bodyMeasurementFields,
      avatarVariantId: resolveAvatarVariantFromProfile(profile),
      bodyProfileRevision: localRevision,
      serverRevision,
      syncState,
      syncError,
      setProfile: updateProfile,
      setGender: (gender: BodyProfile["gender"]) =>
        updateProfile((current) => ({
          ...current,
          gender,
        })),
      setBodyFrame: (bodyFrame: BodyFrame) =>
        updateProfile((current) => ({
          ...current,
          bodyFrame,
        })),
      updateMeasurement: (key: BodyProfileSimpleKey | BodyProfileDetailedKey, value: number) =>
        updateProfile((current) => updateBodyProfileMeasurement(current, key, value)),
    }),
    [localRevision, profile, serverRevision, syncError, syncState, updateProfile],
  );
}
