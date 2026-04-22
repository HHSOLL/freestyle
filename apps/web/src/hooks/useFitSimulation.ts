"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fitSimulationCreateResponseSchema,
  fitSimulationGetResponseSchema,
  type FitSimulationQualityTier,
  type FitSimulationRecord,
} from "@freestyle/contracts";
import { apiFetchJson, getApiErrorMessage, isClientApiConfigured } from "@/lib/clientApi";

export type FitSimulationClientState =
  | "idle"
  | "creating"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "auth-required"
  | "unavailable"
  | "error";

const fitSimulationPollDelayMs = 2400;

const isPollingStatus = (status: FitSimulationRecord["status"] | null | undefined) =>
  status === "queued" || status === "processing";

const resolveNextClientState = (record: FitSimulationRecord | null): FitSimulationClientState => {
  if (!record) return "idle";
  switch (record.status) {
    case "queued":
      return "queued";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    default:
      return "idle";
  }
};

export function useFitSimulation() {
  const [fitSimulation, setFitSimulation] = useState<FitSimulationRecord | null>(null);
  const [state, setState] = useState<FitSimulationClientState>(isClientApiConfigured ? "idle" : "unavailable");
  const [error, setError] = useState<string | null>(null);
  const activeFitSimulationIdRef = useRef<string | null>(null);

  const fetchFitSimulation = useCallback(async (fitSimulationId: string) => {
    if (!isClientApiConfigured) {
      setState("unavailable");
      setError("API 환경이 설정되지 않아 HQ 피팅을 불러올 수 없습니다.");
      return null;
    }

    const { response, data } = await apiFetchJson<unknown>(`/v1/lab/fit-simulations/${fitSimulationId}`);
    if (response.status === 401) {
      setState("auth-required");
      setError("HQ 피팅은 로그인된 세션 또는 개발용 bypass 환경에서만 사용할 수 있습니다.");
      return null;
    }
    if (!response.ok) {
      setState("error");
      setError(getApiErrorMessage(data, "HQ 피팅 상태를 불러오지 못했습니다."));
      return null;
    }

    const parsed = fitSimulationGetResponseSchema.safeParse(data);
    if (!parsed.success) {
      setState("error");
      setError("HQ 피팅 응답 형식이 올바르지 않습니다.");
      return null;
    }

    activeFitSimulationIdRef.current = parsed.data.fitSimulation.id;
    setFitSimulation(parsed.data.fitSimulation);
    setState(resolveNextClientState(parsed.data.fitSimulation));
    setError(null);
    return parsed.data.fitSimulation;
  }, []);

  const startFitSimulation = useCallback(
    async (input: {
      garmentId: string;
      qualityTier: FitSimulationQualityTier;
      materialPreset?: string;
      idempotencyKey?: string;
    }) => {
      if (!isClientApiConfigured) {
        setState("unavailable");
        setError("API 환경이 설정되지 않아 HQ 피팅을 시작할 수 없습니다.");
        return null;
      }

      setState("creating");
      setError(null);

      const payload = {
        garment_id: input.garmentId,
        quality_tier: input.qualityTier,
        material_preset: input.materialPreset,
        idempotency_key: input.idempotencyKey,
      };

      const { response, data } = await apiFetchJson<unknown>("/v1/lab/jobs/fit-simulations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setState("auth-required");
        setError("HQ 피팅은 로그인된 세션 또는 개발용 bypass 환경에서만 사용할 수 있습니다.");
        return null;
      }

      if (!response.ok) {
        setState("error");
        setError(getApiErrorMessage(data, "HQ 피팅 작업을 생성하지 못했습니다."));
        return null;
      }

      const parsed = fitSimulationCreateResponseSchema.safeParse(data);
      if (!parsed.success) {
        setState("error");
        setError("HQ 피팅 생성 응답 형식이 올바르지 않습니다.");
        return null;
      }

      activeFitSimulationIdRef.current = parsed.data.fit_simulation_id;
      return fetchFitSimulation(parsed.data.fit_simulation_id);
    },
    [fetchFitSimulation],
  );

  useEffect(() => {
    if (!isPollingStatus(fitSimulation?.status) || !activeFitSimulationIdRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const fitSimulationId = activeFitSimulationIdRef.current;
      if (!fitSimulationId) return;
      fetchFitSimulation(fitSimulationId).catch(() => undefined);
    }, fitSimulationPollDelayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [fetchFitSimulation, fitSimulation?.status]);

  const clear = useCallback(() => {
    activeFitSimulationIdRef.current = null;
    setFitSimulation(null);
    setError(null);
    setState(isClientApiConfigured ? "idle" : "unavailable");
  }, []);

  const refresh = useCallback(async () => {
    if (!activeFitSimulationIdRef.current) return null;
    return fetchFitSimulation(activeFitSimulationIdRef.current);
  }, [fetchFitSimulation]);

  return useMemo(
    () => ({
      fitSimulation,
      state,
      error,
      startFitSimulation,
      refresh,
      clear,
    }),
    [clear, error, fitSimulation, refresh, startFitSimulation, state],
  );
}
