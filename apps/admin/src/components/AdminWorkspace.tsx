"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  PackagePlus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  FitSimulationAdminInspectionResponse,
  GarmentCertificationItemResponse,
  GarmentCertificationListResponse,
  GarmentCertificationReportItem,
} from "@freestyle/contracts";
import { fitSimulationAdminInspectionResponseSchema } from "@freestyle/contracts";
import { publishedGarmentAssetSchema } from "@freestyle/shared";
import type {
  AssetCategory,
  AssetApprovalState,
  GarmentCollisionZone,
  GarmentMeasurementMode,
  GarmentPublicationRecord,
  GarmentSizeSpec,
  PublishedGarmentAsset,
} from "@freestyle/shared-types";
import { wardrobeTokens } from "@freestyle/design-tokens";
import { DenseCatalogCard, Eyebrow, PillButton, SurfacePanel } from "@freestyle/ui";
import { FitSimulationInspectionPanel } from "@/components/FitSimulationInspectionPanel";
import { GarmentCertificationPanel } from "@/components/GarmentCertificationPanel";
import { adminApiFetchJson, getApiErrorMessage } from "@/lib/adminApi";
import { buildAdminFitReview, fitStateTone } from "@/lib/fitReview";
import { summarizeFitSimulationInspection } from "@/lib/fitSimulationInspection";
import {
  buildGarmentCertificationCoverageSet,
  filterByGarmentCertificationCoverage,
  findGarmentCertification,
  summarizeGarmentCertification,
  summarizeGarmentCertificationCoverage,
  type GarmentCertificationCoverageFilter,
} from "@/lib/garmentCertification";
import {
  APPROVAL_STATE_FILTERS,
  APPROVAL_STATE_OPTIONS,
  buildBlankPublishedGarment,
  CATEGORY_FILTERS,
  COLLISION_ZONE_OPTIONS,
  DRAFT_SELECTION_ID,
  duplicateSizeRow,
  EDITABLE_CATEGORY_OPTIONS,
  getMeasurementKeysForCategory,
  MEASUREMENT_LABELS,
  MEASUREMENT_MODE_OPTIONS,
  normalizeDraftForCategory,
  PUBLICATION_SOURCE_OPTIONS,
  PUBLISHED_SOURCE_OPTIONS,
  SIZE_SOURCE_OPTIONS,
  sortPublishedGarments,
  SOURCE_FILTERS,
} from "@/lib/publishedGarmentDraft";
import { useAuth } from "@/lib/AuthContext";

const formatDate = (value?: string) => {
  if (!value) return "Not published";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const summarizeMeasurementKeys = (item: PublishedGarmentAsset | null) =>
  Object.keys(item?.metadata?.measurements ?? {}).slice(0, 6);

const summarizePoseTuning = (item: PublishedGarmentAsset | null) =>
  Object.entries(item?.runtime.poseTuning ?? {}).filter(([, value]) => Boolean(value));

const selectedSizeChart = (item: PublishedGarmentAsset | null) =>
  item?.metadata?.sizeChart?.find((entry) => entry.label === item.metadata?.selectedSizeLabel) ?? null;

const cloneDraft = (item: PublishedGarmentAsset) => JSON.parse(JSON.stringify(item)) as PublishedGarmentAsset;

const CERTIFICATION_COVERAGE_FILTERS: Array<{
  id: GarmentCertificationCoverageFilter;
  label: string;
}> = [
  { id: "all", label: "All coverage" },
  { id: "covered", label: "Starter covered" },
  { id: "missing", label: "Bundle missing" },
];

const parseEditorState = (editorValue: string): { item: PublishedGarmentAsset | null; error: string | null } => {
  if (!editorValue.trim()) {
    return { item: null, error: null };
  }

  try {
    const parsedJson = JSON.parse(editorValue) as unknown;
    const parsed = publishedGarmentAssetSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return {
        item: null,
        error: parsed.error.issues[0]?.message ?? "Manifest shape가 올바르지 않다.",
      };
    }
    return { item: parsed.data, error: null };
  } catch (error) {
    return {
      item: null,
      error: error instanceof Error ? error.message : "Manifest JSON 파싱에 실패했다.",
    };
  }
};

const stringifyManifest = (item: PublishedGarmentAsset) => JSON.stringify(item, null, 2);

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : undefined;
};

function AdminLoginCard() {
  const { isConfigured, requestMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await requestMagicLink(email);
        setMessage("로그인 링크를 보냈다. 메일에서 인증 후 다시 이 화면으로 돌아오면 된다.");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "로그인 링크 발송에 실패했다.");
      }
    });
  }, [email, requestMagicLink]);

  return (
    <SurfacePanel className="mx-auto flex w-full max-w-[560px] flex-col gap-5 p-8">
      <div className="space-y-2">
        <Eyebrow>Admin Access</Eyebrow>
        <h1 className="text-[34px] font-semibold tracking-[-0.04em]" style={{ color: wardrobeTokens.color.text }}>
          FreeStyle publishing console
        </h1>
        <p className="max-w-[44ch] text-[14px] leading-6" style={{ color: wardrobeTokens.color.textMuted }}>
          의류 실측, pose tuning, publish metadata를 관리하는 내부 도메인이다. 로그인 후 partner garment를 생성하고 `/v1/admin/garments`로 publish-ready manifest를 저장한다.
        </p>
      </div>

      {!isConfigured ? (
        <div
          className="rounded-[24px] border px-4 py-4 text-[13px]"
          style={{ borderColor: wardrobeTokens.color.danger, color: wardrobeTokens.color.danger }}
        >
          NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 비어 있다. admin domain auth가 아직 설정되지 않았다.
        </div>
      ) : null}

      <label className="space-y-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
          Admin Email
        </span>
        <input
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="team@freestyle.app"
          className="w-full rounded-[22px] border bg-white/80 px-4 py-3 text-[14px] outline-none"
          style={{ borderColor: wardrobeTokens.color.dividerStrong }}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>
          Supabase magic link로 인증한다.
        </div>
        <PillButton onClick={handleSubmit} active={isConfigured && email.trim().length > 0}>
          {isSubmitting ? "Sending..." : "Send login link"}
        </PillButton>
      </div>

      {message ? (
        <div
          className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
          style={{ borderColor: "rgba(79,123,98,0.24)", color: wardrobeTokens.color.success }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}
      {error ? (
        <div
          className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
          style={{ borderColor: "rgba(141,74,69,0.24)", color: wardrobeTokens.color.danger }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </SurfacePanel>
  );
}

function SectionFrame(props: { eyebrow: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[24px] border px-4 py-4"
      style={{ borderColor: wardrobeTokens.color.dividerStrong, background: "rgba(255,255,255,0.52)" }}
    >
      <Eyebrow>{props.eyebrow}</Eyebrow>
      <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em]" style={{ color: wardrobeTokens.color.text }}>
        {props.title}
      </div>
      {props.description ? (
        <p className="mt-2 text-[13px] leading-6" style={{ color: wardrobeTokens.color.textMuted }}>
          {props.description}
        </p>
      ) : null}
      <div className="mt-4 space-y-4">{props.children}</div>
    </div>
  );
}

function TextInputField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
        {props.label}
      </span>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        className="w-full rounded-[18px] border bg-white/82 px-4 py-3 text-[13px] outline-none disabled:cursor-not-allowed disabled:opacity-60"
        style={{ borderColor: wardrobeTokens.color.dividerStrong, color: wardrobeTokens.color.text }}
      />
    </label>
  );
}

function NumberInputField(props: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
        {props.label}
      </span>
      <input
        type="number"
        step={props.step ?? 0.1}
        value={props.value ?? ""}
        onChange={(event) => props.onChange(parseOptionalNumber(event.currentTarget.value))}
        className="w-full rounded-[18px] border bg-white/82 px-4 py-3 text-[13px] outline-none"
        style={{ borderColor: wardrobeTokens.color.dividerStrong, color: wardrobeTokens.color.text }}
      />
    </label>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
        {props.label}
      </span>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 4}
        className="w-full rounded-[18px] border bg-white/82 px-4 py-3 text-[13px] outline-none"
        style={{ borderColor: wardrobeTokens.color.dividerStrong, color: wardrobeTokens.color.text }}
      />
    </label>
  );
}

function SelectInputField<T extends string>(props: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
        {props.label}
      </span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value as T)}
        className="w-full rounded-[18px] border bg-white/82 px-4 py-3 text-[13px] outline-none"
        style={{ borderColor: wardrobeTokens.color.dividerStrong, color: wardrobeTokens.color.text }}
      >
        {props.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminWorkspace() {
  const { isLoading: authLoading, user, signOut } = useAuth();
  const [items, setItems] = useState<PublishedGarmentAsset[]>([]);
  const [category, setCategory] = useState<AssetCategory | "all">("all");
  const [sourceSystem, setSourceSystem] = useState<GarmentPublicationRecord["sourceSystem"] | "all">("all");
  const [approvalState, setApprovalState] = useState<AssetApprovalState | "all">("all");
  const [certificationCoverageFilter, setCertificationCoverageFilter] =
    useState<GarmentCertificationCoverageFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [certificationItems, setCertificationItems] = useState<GarmentCertificationReportItem[]>([]);
  const [certificationGeneratedAt, setCertificationGeneratedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [certificationLoadError, setCertificationLoadError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [selectedCertification, setSelectedCertification] = useState<GarmentCertificationReportItem | null>(null);
  const [selectedCertificationGeneratedAt, setSelectedCertificationGeneratedAt] = useState<string | null>(null);
  const [selectedCertificationError, setSelectedCertificationError] = useState<string | null>(null);
  const [fitSimulationInspectionId, setFitSimulationInspectionId] = useState("");
  const [fitSimulationInspection, setFitSimulationInspection] =
    useState<FitSimulationAdminInspectionResponse | null>(null);
  const [fitSimulationInspectionError, setFitSimulationInspectionError] = useState<string | null>(null);
  const [activeSizeLabel, setActiveSizeLabel] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isCertificationFetching, setIsCertificationFetching] = useState(false);
  const [isCertificationDetailFetching, setIsCertificationDetailFetching] = useState(false);
  const [isFitSimulationInspectionFetching, setIsFitSimulationInspectionFetching] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const activeFitSimulationInspectionIdRef = useRef<string | null>(null);

  const parsedEditor = useMemo(() => parseEditorState(editorValue), [editorValue]);
  const certificationCoverageIds = useMemo(
    () => buildGarmentCertificationCoverageSet(certificationItems),
    [certificationItems],
  );
  const visibleItems = useMemo(
    () =>
      certificationLoadError
        ? items
        : filterByGarmentCertificationCoverage(
            items,
            certificationCoverageIds,
            certificationCoverageFilter,
          ),
    [certificationCoverageFilter, certificationCoverageIds, certificationLoadError, items],
  );
  const certificationCoverageSummary = useMemo(
    () => summarizeGarmentCertificationCoverage(visibleItems, certificationCoverageIds),
    [certificationCoverageIds, visibleItems],
  );

  const selectedCatalogItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const workingItem = useMemo(
    () => parsedEditor.item ?? selectedCatalogItem,
    [parsedEditor.item, selectedCatalogItem],
  );
  const workingGarmentId = workingItem?.id ?? null;
  const certificationCatalogItem = useMemo(
    () => findGarmentCertification(certificationItems, workingGarmentId),
    [certificationItems, workingGarmentId],
  );
  const effectiveCertification = selectedCertification ?? certificationCatalogItem;
  const certificationSummary = useMemo(
    () => summarizeGarmentCertification(effectiveCertification),
    [effectiveCertification],
  );
  const fitSimulationInspectionSummary = useMemo(
    () => summarizeFitSimulationInspection(fitSimulationInspection),
    [fitSimulationInspection],
  );

  const activeSize = useMemo(() => {
    if (!workingItem?.metadata?.sizeChart?.length) return null;
    if (activeSizeLabel) {
      return workingItem.metadata.sizeChart.find((entry) => entry.label === activeSizeLabel) ?? null;
    }
    return selectedSizeChart(workingItem) ?? workingItem.metadata.sizeChart[0] ?? null;
  }, [activeSizeLabel, workingItem]);

  const measurementKeys = useMemo(
    () => (workingItem ? getMeasurementKeysForCategory(workingItem.category) : []),
    [workingItem],
  );

  const poseTuningEntries = summarizePoseTuning(workingItem);
  const measurementSummary = summarizeMeasurementKeys(workingItem);
  const isDraft = selectedId === DRAFT_SELECTION_ID || Boolean(workingItem && !items.some((item) => item.id === workingItem.id));
  const adminFitReview = useMemo(() => (workingItem ? buildAdminFitReview(workingItem) : []), [workingItem]);

  const setEditorFromItem = useCallback((item: PublishedGarmentAsset) => {
    setEditorValue(stringifyManifest(item));
    setEditorError(null);
  }, []);

  const updateDraft = useCallback(
    (mutator: (current: PublishedGarmentAsset) => PublishedGarmentAsset) => {
      const base = parsedEditor.item ?? workingItem ?? buildBlankPublishedGarment(category === "all" ? "tops" : category);
      const next = mutator(cloneDraft(base));
      setEditorFromItem(next);
      setStatusMessage(null);
    },
    [category, parsedEditor.item, setEditorFromItem, workingItem],
  );

  const loadItems = useCallback(async () => {
    if (!user) return;

    setIsFetching(true);
    setLoadError(null);
    setStatusMessage(null);

    const query = new URLSearchParams();
    if (category !== "all") query.set("category", category);
    if (sourceSystem !== "all") query.set("source_system", sourceSystem);
    if (approvalState !== "all") query.set("approval_state", approvalState);

    const { response, data } = await adminApiFetchJson<{ items?: PublishedGarmentAsset[] }>(
      `/v1/admin/garments${query.size ? `?${query.toString()}` : ""}`,
    );

    if (!response.ok) {
      setItems([]);
      setLoadError(getApiErrorMessage(data, "관리자 garment 목록을 불러오지 못했다."));
      setIsFetching(false);
      return;
    }

    const nextItems = sortPublishedGarments(data?.items ?? []);
    setItems(nextItems);
    setSelectedId((current) => {
      if (current === DRAFT_SELECTION_ID) return current;
      return current && nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id ?? null;
    });
    setIsFetching(false);
  }, [approvalState, category, sourceSystem, user]);

  const loadCertificationCatalog = useCallback(async () => {
    if (!user) return;

    setIsCertificationFetching(true);
    setCertificationLoadError(null);

    const query = new URLSearchParams();
    if (category !== "all") query.set("category", category);

    const { response, data } = await adminApiFetchJson<GarmentCertificationListResponse>(
      `/v1/admin/garment-certifications${query.size ? `?${query.toString()}` : ""}`,
    );

    if (!response.ok || !data) {
      setCertificationItems([]);
      setCertificationGeneratedAt(null);
      setCertificationLoadError(getApiErrorMessage(data, "Starter certification bundle을 불러오지 못했다."));
      setIsCertificationFetching(false);
      return;
    }

    setCertificationItems(data.items);
    setCertificationGeneratedAt(data.generatedAt);
    setIsCertificationFetching(false);
  }, [category, user]);

  const loadFitSimulationInspection = useCallback(async () => {
    if (!user) return;

    const fitSimulationId = fitSimulationInspectionId.trim();
    if (!fitSimulationId) {
      activeFitSimulationInspectionIdRef.current = null;
      setFitSimulationInspection(null);
      setFitSimulationInspectionError("HQ fit simulation id를 입력해라.");
      return;
    }

    activeFitSimulationInspectionIdRef.current = fitSimulationId;
    setIsFitSimulationInspectionFetching(true);
    setFitSimulationInspectionError(null);
    setFitSimulationInspection(null);

    const { response, data } = await adminApiFetchJson<FitSimulationAdminInspectionResponse>(
      `/v1/admin/fit-simulations/${fitSimulationId}`,
    );

    if (activeFitSimulationInspectionIdRef.current !== fitSimulationId) {
      return;
    }

    if (!response.ok || !data) {
      setFitSimulationInspection(null);
      setFitSimulationInspectionError(
        getApiErrorMessage(data, "HQ artifact inspection을 불러오지 못했다."),
      );
      setIsFitSimulationInspectionFetching(false);
      return;
    }

    const parsed = fitSimulationAdminInspectionResponseSchema.safeParse(data);
    if (!parsed.success) {
      setFitSimulationInspection(null);
      setFitSimulationInspectionError("HQ artifact inspection 응답 형식이 올바르지 않다.");
      setIsFitSimulationInspectionFetching(false);
      return;
    }

    setFitSimulationInspection(parsed.data);
    setIsFitSimulationInspectionFetching(false);
  }, [fitSimulationInspectionId, user]);

  useEffect(() => {
    void loadItems();
    void loadCertificationCatalog();
  }, [loadCertificationCatalog, loadItems]);

  useEffect(() => {
    if (selectedId === DRAFT_SELECTION_ID) {
      return;
    }

    if (visibleItems.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0]?.id ?? null);
    }
  }, [selectedId, visibleItems]);

  useEffect(() => {
    if (!selectedCatalogItem) {
      if (selectedId !== DRAFT_SELECTION_ID) {
        setEditorValue("");
      }
      return;
    }
    setEditorFromItem(selectedCatalogItem);
  }, [selectedCatalogItem, selectedId, setEditorFromItem]);

  useEffect(() => {
    if (!workingItem?.metadata?.sizeChart?.length) {
      setActiveSizeLabel(null);
      return;
    }
    setActiveSizeLabel((current) =>
      current && workingItem.metadata?.sizeChart?.some((entry) => entry.label === current)
        ? current
        : workingItem.metadata?.selectedSizeLabel ?? workingItem.metadata?.sizeChart?.[0]?.label ?? null,
    );
  }, [workingItem]);

  useEffect(() => {
    if (
      !user ||
      selectedId === DRAFT_SELECTION_ID ||
      !workingGarmentId ||
      !certificationCatalogItem
    ) {
      setSelectedCertification(null);
      setSelectedCertificationGeneratedAt(null);
      setSelectedCertificationError(null);
      setIsCertificationDetailFetching(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSelectedCertification(null);
      setSelectedCertificationGeneratedAt(null);
      setIsCertificationDetailFetching(true);
      setSelectedCertificationError(null);

      const { response, data } = await adminApiFetchJson<GarmentCertificationItemResponse>(
        `/v1/admin/garment-certifications/${certificationCatalogItem.id}`,
      );

      if (cancelled) {
        return;
      }

      if (response.status === 404) {
        setSelectedCertification(null);
        setSelectedCertificationGeneratedAt(null);
        setIsCertificationDetailFetching(false);
        return;
      }

      if (!response.ok || !data) {
        setSelectedCertification(null);
        setSelectedCertificationGeneratedAt(null);
        setSelectedCertificationError(
          getApiErrorMessage(data, "Starter certification detail을 불러오지 못했다."),
        );
        setIsCertificationDetailFetching(false);
        return;
      }

      setSelectedCertification(data.item);
      setSelectedCertificationGeneratedAt(data.generatedAt);
      setIsCertificationDetailFetching(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [certificationCatalogItem, selectedId, user, workingGarmentId]);

  const handleFitSimulationInspectionIdChange = useCallback((value: string) => {
    activeFitSimulationInspectionIdRef.current = null;
    setFitSimulationInspectionId(value);
    setFitSimulationInspection(null);
    setFitSimulationInspectionError(null);
    setIsFitSimulationInspectionFetching(false);
  }, []);

  const handleClearFitSimulationInspection = useCallback(() => {
    activeFitSimulationInspectionIdRef.current = null;
    setFitSimulationInspectionId("");
    setFitSimulationInspection(null);
    setFitSimulationInspectionError(null);
    setIsFitSimulationInspectionFetching(false);
  }, []);

  const handleCreateDraft = useCallback(() => {
    const nextCategory = category === "all" ? "tops" : category;
    const nextDraft = buildBlankPublishedGarment(nextCategory);
    setSelectedId(DRAFT_SELECTION_ID);
    setEditorFromItem(nextDraft);
    setActiveSizeLabel(nextDraft.metadata?.selectedSizeLabel ?? "M");
    setStatusMessage("새 garment draft를 열었다. 필수 필드를 채운 뒤 Create garment로 저장하면 된다.");
    setLoadError(null);
  }, [category, setEditorFromItem]);

  const handleSave = useCallback(() => {
    if (!workingItem) return;

    startSaving(async () => {
      setEditorError(null);
      setStatusMessage(null);

      try {
        const raw = JSON.parse(editorValue) as unknown;
        const parsed = publishedGarmentAssetSchema.parse(raw);
        const hasSameId = items.some((item) => item.id === parsed.id);
        const isCreateMode = selectedId === DRAFT_SELECTION_ID || !selectedCatalogItem || parsed.id !== selectedCatalogItem.id;

        if (isCreateMode && hasSameId) {
          throw new Error("같은 id를 가진 garment가 이미 존재한다. 새 draft에서는 고유한 id를 사용해라.");
        }

        const endpoint = isCreateMode ? "/v1/admin/garments" : `/v1/admin/garments/${selectedCatalogItem.id}`;
        const method = isCreateMode ? "POST" : "PUT";

        const { response, data } = await adminApiFetchJson<{ item?: PublishedGarmentAsset }>(endpoint, {
          method,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(parsed),
        });

        if (!response.ok || !data?.item) {
          throw new Error(getApiErrorMessage(data, "Garment 저장에 실패했다."));
        }

        const savedItem = data.item;
        setItems((current) => {
          const next = current.filter((item) => item.id !== savedItem.id);
          next.push(savedItem);
          return sortPublishedGarments(next);
        });
        setSelectedId(savedItem.id);
        setEditorFromItem(savedItem);
        setStatusMessage(isCreateMode ? "새 garment를 발행 목록에 추가했다." : "Garment manifest를 저장했다.");
      } catch (nextError) {
        setEditorError(nextError instanceof Error ? nextError.message : "Manifest 저장에 실패했다.");
      }
    });
  }, [editorValue, items, selectedCatalogItem, selectedId, setEditorFromItem, workingItem]);

  const handleReset = useCallback(() => {
    if (selectedCatalogItem) {
      setEditorFromItem(selectedCatalogItem);
      setStatusMessage("편집기를 서버 상태로 되돌렸다.");
      return;
    }
    if (selectedId === DRAFT_SELECTION_ID) {
      const nextCategory = category === "all" ? "tops" : category;
      setEditorFromItem(buildBlankPublishedGarment(nextCategory));
      setStatusMessage("draft를 초기 기본값으로 되돌렸다.");
    }
  }, [category, selectedCatalogItem, selectedId, setEditorFromItem]);

  const handleToggleZone = useCallback(
    (field: "collisionZones" | "bodyMaskZones", zone: GarmentCollisionZone) => {
      updateDraft((current) => {
        const hasZone = current.runtime[field].includes(zone);
        return {
          ...current,
          runtime: {
            ...current.runtime,
            [field]: hasZone
              ? current.runtime[field].filter((entry) => entry !== zone)
              : [...current.runtime[field], zone],
          },
        };
      });
    },
    [updateDraft],
  );

  const handleUpdateSizeRow = useCallback(
    (label: string, updater: (row: GarmentSizeSpec) => GarmentSizeSpec) => {
      updateDraft((current) => {
        const sizeChart = current.metadata?.sizeChart ?? [];
        const nextSizeChart = sizeChart.map((row) => (row.label === label ? updater({ ...row, measurements: { ...row.measurements }, measurementModes: row.measurementModes ? { ...row.measurementModes } : {} }) : row));
        const nextSelectedLabel = current.metadata?.selectedSizeLabel === label ? updater({ ...activeSize!, measurements: { ...activeSize!.measurements }, measurementModes: activeSize!.measurementModes ? { ...activeSize!.measurementModes } : {} }).label : current.metadata?.selectedSizeLabel;
        const selectedRow = nextSizeChart.find((row) => row.label === nextSelectedLabel) ?? nextSizeChart[0];
        return {
          ...current,
          metadata: {
            ...current.metadata,
            sizeChart: nextSizeChart,
            selectedSizeLabel: nextSelectedLabel ?? selectedRow?.label,
            measurements: selectedRow?.measurements ? { ...selectedRow.measurements } : current.metadata?.measurements,
            measurementModes: selectedRow?.measurementModes ? { ...selectedRow.measurementModes } : current.metadata?.measurementModes,
          },
        };
      });
    },
    [activeSize, updateDraft],
  );

  const handleAddSizeRow = useCallback(() => {
    if (!workingItem) return;
    const nextLabel = workingItem.category === "shoes" ? `${250 + (workingItem.metadata?.sizeChart?.length ?? 0) * 5}` : `Size ${String((workingItem.metadata?.sizeChart?.length ?? 0) + 1)}`;
    updateDraft((current) => {
      const nextRow = duplicateSizeRow(activeSize ?? undefined, current.category, nextLabel);
      return {
        ...current,
        metadata: {
          ...current.metadata,
          sizeChart: [...(current.metadata?.sizeChart ?? []), nextRow],
        },
      };
    });
    setActiveSizeLabel(nextLabel);
  }, [activeSize, updateDraft, workingItem]);

  const handleRemoveSizeRow = useCallback(() => {
    if (!workingItem || !activeSize) return;
    updateDraft((current) => {
      const nextSizeChart = (current.metadata?.sizeChart ?? []).filter((row) => row.label !== activeSize.label);
      const fallbackRow = nextSizeChart[0];
      return {
        ...current,
        metadata: {
          ...current.metadata,
          sizeChart: nextSizeChart,
          selectedSizeLabel: fallbackRow?.label,
          measurements: fallbackRow?.measurements ? { ...fallbackRow.measurements } : {},
          measurementModes: fallbackRow?.measurementModes ? { ...fallbackRow.measurementModes } : {},
        },
      };
    });
    setActiveSizeLabel((current) => (current === activeSize.label ? null : current));
  }, [activeSize, updateDraft, workingItem]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="flex items-center gap-3 text-[14px]" style={{ color: wardrobeTokens.color.textMuted }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Admin session 확인 중...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-6 py-10">
        <AdminLoginCard />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-5">
        <SurfacePanel className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <Eyebrow>FreeStyle Admin</Eyebrow>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-semibold tracking-[-0.04em]" style={{ color: wardrobeTokens.color.text }}>
                freestyleadmin
              </h1>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ background: "rgba(255,255,255,0.8)", color: wardrobeTokens.color.textMuted }}
              >
                Vercel Surface
              </span>
            </div>
            <p className="text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
              Railway `freestyle` API의 `/v1/admin/garments`를 실제 partner publish workflow처럼 다루는 관리 도메인이다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="hidden rounded-full px-4 py-2 text-[12px] md:block"
              style={{ background: "rgba(255,255,255,0.76)", color: wardrobeTokens.color.textMuted }}
            >
              {user.email ?? "Signed in"}
            </div>
            <PillButton onClick={handleCreateDraft}>
              <span className="inline-flex items-center gap-2">
                <PackagePlus className="h-4 w-4" />
                New garment
              </span>
            </PillButton>
            <PillButton
              onClick={() => {
                void loadItems();
                void loadCertificationCatalog();
              }}
            >
              Refresh
            </PillButton>
            <PillButton onClick={() => void signOut()}>
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </span>
            </PillButton>
          </div>
        </SurfacePanel>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SurfacePanel className="flex max-h-[calc(100vh-168px)] flex-col gap-4 overflow-hidden p-4">
            <div className="space-y-3">
              <Eyebrow>Catalog Filters</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((filter) => (
                  <PillButton
                    key={filter.id}
                    active={category === filter.id}
                    onClick={() => setCategory(filter.id)}
                    className="px-3 py-1.5 text-[11px]"
                  >
                    {filter.label}
                  </PillButton>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {SOURCE_FILTERS.map((filter) => (
                  <PillButton
                    key={filter.id}
                    active={sourceSystem === filter.id}
                    onClick={() => setSourceSystem(filter.id)}
                    className="px-3 py-1.5 text-[11px]"
                  >
                    {filter.label}
                  </PillButton>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {APPROVAL_STATE_FILTERS.map((filter) => (
                  <PillButton
                    key={filter.id}
                    active={approvalState === filter.id}
                    onClick={() => setApprovalState(filter.id)}
                    className="px-3 py-1.5 text-[11px]"
                  >
                    {filter.label}
                  </PillButton>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATION_COVERAGE_FILTERS.map((filter) => (
                  <PillButton
                    key={filter.id}
                    active={certificationCoverageFilter === filter.id}
                    onClick={() => setCertificationCoverageFilter(filter.id)}
                    className="px-3 py-1.5 text-[11px]"
                  >
                    {filter.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>
              <span>
                {visibleItems.length} visible · {certificationCoverageSummary.coveredCount} starter-covered ·{" "}
                {certificationCoverageSummary.uncoveredCount} not covered
              </span>
              <div className="flex items-center gap-3">
                {isCertificationFetching ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cert bundle
                  </span>
                ) : null}
                {isFetching ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading
                  </span>
                ) : null}
              </div>
            </div>

            <div className="fs-scroll-slim flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {selectedId === DRAFT_SELECTION_ID && workingItem ? (
                <DenseCatalogCard
                  title={workingItem.name}
                  subtitle={`${workingItem.category} · unsaved draft`}
                  thumbnail={workingItem.imageSrc}
                  active
                  onClick={() => setSelectedId(DRAFT_SELECTION_ID)}
                  footer={<span>Create-ready draft</span>}
                />
              ) : null}
              {visibleItems.map((item) => (
                <DenseCatalogCard
                  key={item.id}
                  title={item.name}
                  subtitle={`${item.category} · ${item.publication.sourceSystem} · ${item.publication.approvalState ?? "PUBLISHED"}`}
                  thumbnail={item.imageSrc}
                  active={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                  footer={
                    <div className="flex flex-wrap gap-2">
                      <span>{item.publication.approvalState ?? "PUBLISHED"}</span>
                      <span>·</span>
                      <span>{item.metadata?.selectedSizeLabel ?? "No size"}</span>
                      <span>·</span>
                      <span>{formatDate(item.publication.publishedAt)}</span>
                      {certificationCoverageIds.has(item.id) ? (
                        <>
                          <span>·</span>
                          <span>starter cert</span>
                        </>
                      ) : null}
                    </div>
                  }
                />
              ))}
              {!isFetching && visibleItems.length === 0 && selectedId !== DRAFT_SELECTION_ID ? (
                <div
                  className="rounded-[24px] border px-4 py-5 text-[13px]"
                  style={{ borderColor: wardrobeTokens.color.dividerStrong, color: wardrobeTokens.color.textMuted }}
                >
                  현재 필터와 starter certification coverage 조건에 해당하는 published runtime garment가 없다.
                </div>
              ) : null}
            </div>
          </SurfacePanel>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.94fr)]">
            <SurfacePanel className="flex flex-col gap-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Eyebrow>{isDraft ? "Create Workflow" : "Manifest Summary"}</Eyebrow>
                  <h2 className="text-[24px] font-semibold tracking-[-0.04em]" style={{ color: wardrobeTokens.color.text }}>
                    {workingItem?.name ?? "Select a garment"}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>
                    <span>{workingItem?.id ?? "No selection"}</span>
                    {workingItem ? <span>·</span> : null}
                    <span>{workingItem?.publication.sourceSystem ?? "No source"}</span>
                    {workingItem ? <span>·</span> : null}
                    <span>{workingItem?.publication.approvalState ?? "PUBLISHED"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PillButton onClick={handleReset}>Reset</PillButton>
                  <PillButton active={Boolean(workingItem)} onClick={handleSave}>
                    <span className="inline-flex items-center gap-2">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isDraft ? "Create garment" : "Save manifest"}
                    </span>
                  </PillButton>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Category", value: workingItem?.category ?? "-" },
                  { label: "Selected Size", value: workingItem?.metadata?.selectedSizeLabel ?? "-" },
                  { label: "Asset Version", value: workingItem?.publication.assetVersion ?? "-" },
                  { label: "Approval State", value: workingItem?.publication.approvalState ?? "PUBLISHED" },
                  { label: "Published", value: formatDate(workingItem?.publication.publishedAt) },
                  {
                    label: "Certification",
                    value: effectiveCertification ? "Starter bundle" : "Not covered",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[22px] border px-4 py-4"
                    style={{ borderColor: wardrobeTokens.color.dividerStrong, background: "rgba(255,255,255,0.64)" }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
                      {card.label}
                    </div>
                    <div className="mt-2 text-[16px] font-semibold" style={{ color: wardrobeTokens.color.text }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {workingItem ? (
                <>
                  <SectionFrame
                    eyebrow="Step 1"
                    title="Garment Identity"
                    description="Partner/brand 정보와 published asset의 기본 식별자를 설정한다. id는 create 이후부터 runtime catalog의 stable key가 된다."
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <TextInputField
                        label="Garment ID"
                        value={workingItem.id}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            id: value,
                          }))
                        }
                      />
                      <TextInputField
                        label="Name"
                        value={workingItem.name}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            name: value,
                          }))
                        }
                      />
                      <SelectInputField
                        label="Category"
                        value={workingItem.category}
                        options={EDITABLE_CATEGORY_OPTIONS}
                        onChange={(value) =>
                          updateDraft((current) =>
                            normalizeDraftForCategory(current, value, {
                              resetCategoryOwnedRuntime: isDraft,
                            }),
                          )
                        }
                      />
                      <SelectInputField
                        label="Source"
                        value={workingItem.source}
                        options={PUBLISHED_SOURCE_OPTIONS}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            source: value,
                          }))
                        }
                      />
                      <TextInputField
                        label="Brand"
                        value={workingItem.brand ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            brand: value || undefined,
                          }))
                        }
                      />
                      <TextInputField
                        label="Image Src"
                        value={workingItem.imageSrc}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            imageSrc: value,
                          }))
                        }
                      />
                      <TextInputField
                        label="Product URL"
                        value={workingItem.sourceUrl ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            sourceUrl: value || undefined,
                          }))
                        }
                      />
                      <TextInputField
                        label="Model Path"
                        value={workingItem.runtime.modelPath}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            runtime: {
                              ...current.runtime,
                              modelPath: value,
                            },
                          }))
                        }
                      />
                    </div>
                  </SectionFrame>

                  <SectionFrame
                    eyebrow="Step 2"
                    title="Publication Metadata"
                    description="Railway API로 저장되는 published contract 메타데이터다. approval state가 `PUBLISHED`인 garment만 closet product route에 기본 노출된다."
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <SelectInputField
                        label="Publication Source"
                        value={workingItem.publication.sourceSystem}
                        options={PUBLICATION_SOURCE_OPTIONS}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              sourceSystem: value,
                            },
                          }))
                        }
                      />
                      <SelectInputField
                        label="Approval State"
                        value={(workingItem.publication.approvalState ?? "PUBLISHED") as AssetApprovalState}
                        options={APPROVAL_STATE_OPTIONS}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              approvalState: value,
                              approvedAt:
                                value === "PUBLISHED"
                                  ? current.publication.approvedAt ?? current.publication.publishedAt
                                  : current.publication.approvedAt,
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Asset Version"
                        value={workingItem.publication.assetVersion}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              assetVersion: value,
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Approved At"
                        value={workingItem.publication.approvedAt ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              approvedAt: value || undefined,
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Approved By"
                        value={workingItem.publication.approvedBy ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              approvedBy: value || undefined,
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Viewer Manifest Version"
                        value={workingItem.publication.viewerManifestVersion ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              viewerManifestVersion: value || undefined,
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Published At"
                        value={workingItem.publication.publishedAt}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              publishedAt: value,
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Provenance URL"
                        value={workingItem.publication.provenanceUrl ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            publication: {
                              ...current.publication,
                              provenanceUrl: value || undefined,
                            },
                          }))
                        }
                      />
                    </div>
                    <TextAreaField
                      label="Certification Notes"
                      rows={5}
                      value={(workingItem.publication.certificationNotes ?? []).join("\n")}
                      placeholder="One note per line"
                      onChange={(value) =>
                        updateDraft((current) => ({
                          ...current,
                          publication: {
                            ...current.publication,
                            certificationNotes: value
                              .split("\n")
                              .map((entry) => entry.trim())
                              .filter(Boolean),
                          },
                        }))
                      }
                    />
                    <div className="rounded-[18px] border px-4 py-3 text-[13px]" style={{ borderColor: wardrobeTokens.color.divider }}>
                      Measurement standard: <span style={{ color: wardrobeTokens.color.text }}>{workingItem.publication.measurementStandard}</span>
                    </div>
                  </SectionFrame>

                  <SectionFrame
                    eyebrow="Step 3"
                    title="Size Chart And Measurements"
                    description="실제 상품 상세 실측을 입력하는 핵심 영역이다. active row가 `Closet`에서 현재 기본 비교 대상으로 사용된다."
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {(workingItem.metadata?.sizeChart ?? []).map((row) => (
                        <PillButton
                          key={row.label}
                          active={activeSize?.label === row.label}
                          onClick={() => {
                            setActiveSizeLabel(row.label);
                            updateDraft((current) => ({
                              ...current,
                              metadata: {
                                ...current.metadata,
                                selectedSizeLabel: row.label,
                                measurements: { ...row.measurements },
                                measurementModes: row.measurementModes ? { ...row.measurementModes } : current.metadata?.measurementModes,
                              },
                            }));
                          }}
                          className="px-3 py-1.5 text-[11px]"
                        >
                          {row.label}
                        </PillButton>
                      ))}
                      <PillButton onClick={handleAddSizeRow} className="px-3 py-1.5 text-[11px]">
                        Add size row
                      </PillButton>
                      <PillButton
                        onClick={handleRemoveSizeRow}
                        className="px-3 py-1.5 text-[11px]"
                        active={Boolean(activeSize && (workingItem.metadata?.sizeChart?.length ?? 0) > 1)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove row
                        </span>
                      </PillButton>
                    </div>

                    {activeSize ? (
                      <>
                        <div className="grid gap-4 xl:grid-cols-3">
                          <TextInputField
                            label="Active Size Label"
                            value={activeSize.label}
                            onChange={(value) => {
                              const previousLabel = activeSize.label;
                              handleUpdateSizeRow(previousLabel, (row) => ({
                                ...row,
                                label: value,
                              }));
                              setActiveSizeLabel(value);
                            }}
                          />
                          <SelectInputField
                            label="Size Row Source"
                            value={activeSize.source ?? "product-detail"}
                            options={SIZE_SOURCE_OPTIONS}
                            onChange={(value) =>
                              handleUpdateSizeRow(activeSize.label, (row) => ({
                                ...row,
                                source: value,
                              }))
                            }
                          />
                          <TextInputField
                            label="Notes"
                            value={activeSize.notes ?? ""}
                            onChange={(value) =>
                              handleUpdateSizeRow(activeSize.label, (row) => ({
                                ...row,
                                notes: value || undefined,
                              }))
                            }
                          />
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                          {measurementKeys.map((key) => (
                            <div
                              key={key}
                              className="grid gap-3 rounded-[20px] border px-4 py-4 md:grid-cols-[minmax(0,1fr)_160px]"
                              style={{ borderColor: wardrobeTokens.color.divider, background: "rgba(255,255,255,0.62)" }}
                            >
                              <NumberInputField
                                label={`${MEASUREMENT_LABELS[key]} (cm)`}
                                value={activeSize.measurements[key]}
                                onChange={(value) =>
                                  handleUpdateSizeRow(activeSize.label, (row) => ({
                                    ...row,
                                    measurements: {
                                      ...row.measurements,
                                      [key]: value,
                                    },
                                  }))
                                }
                              />
                              <SelectInputField
                                label="Mode"
                                value={(activeSize.measurementModes?.[key] ?? "linear-length") as GarmentMeasurementMode}
                                options={MEASUREMENT_MODE_OPTIONS}
                                onChange={(value) =>
                                  handleUpdateSizeRow(activeSize.label, (row) => ({
                                    ...row,
                                    measurementModes: {
                                      ...(row.measurementModes ?? {}),
                                      [key]: value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
                        size chart row를 먼저 추가해라.
                      </div>
                    )}

                    <div className="grid gap-4 xl:grid-cols-3">
                      <NumberInputField
                        label="Material Stretch Ratio"
                        value={workingItem.metadata?.physicalProfile?.materialStretchRatio}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            metadata: {
                              ...current.metadata,
                              physicalProfile: {
                                ...current.metadata?.physicalProfile,
                                materialStretchRatio: value,
                              },
                            },
                          }))
                        }
                      />
                      <NumberInputField
                        label="Max Comfort Stretch"
                        value={workingItem.metadata?.physicalProfile?.maxComfortStretchRatio}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            metadata: {
                              ...current.metadata,
                              physicalProfile: {
                                ...current.metadata?.physicalProfile,
                                maxComfortStretchRatio: value,
                              },
                            },
                          }))
                        }
                      />
                      <TextInputField
                        label="Dominant Color"
                        value={workingItem.metadata?.dominantColor ?? ""}
                        onChange={(value) =>
                          updateDraft((current) => ({
                            ...current,
                            metadata: {
                              ...current.metadata,
                              dominantColor: value || undefined,
                            },
                          }))
                        }
                      />
                    </div>
                  </SectionFrame>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <SectionFrame
                      eyebrow="Step 4"
                      title="Runtime Binding"
                      description="shared skeleton, collision, body mask, render ordering을 관리한다. `Closet`는 이 값을 그대로 소비한다."
                    >
                      <div className="grid gap-4 xl:grid-cols-2">
                        <TextInputField
                          label="Skeleton Profile"
                          value={workingItem.runtime.skeletonProfileId}
                          onChange={(value) =>
                            updateDraft((current) => ({
                              ...current,
                              runtime: {
                                ...current.runtime,
                                skeletonProfileId: value,
                              },
                            }))
                          }
                        />
                        <NumberInputField
                          label="Render Priority"
                          value={workingItem.runtime.renderPriority}
                          onChange={(value) =>
                            updateDraft((current) => ({
                              ...current,
                              runtime: {
                                ...current.runtime,
                                renderPriority: value ?? current.runtime.renderPriority,
                              },
                            }))
                          }
                        />
                        <NumberInputField
                          label="Surface Clearance (cm)"
                          value={workingItem.runtime.surfaceClearanceCm}
                          onChange={(value) =>
                            updateDraft((current) => ({
                              ...current,
                              runtime: {
                                ...current.runtime,
                                surfaceClearanceCm: value ?? current.runtime.surfaceClearanceCm,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
                          Collision Zones
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {COLLISION_ZONE_OPTIONS.map((zone) => (
                            <PillButton
                              key={zone.id}
                              active={workingItem.runtime.collisionZones.includes(zone.id)}
                              onClick={() => handleToggleZone("collisionZones", zone.id)}
                              className="px-3 py-1.5 text-[11px]"
                            >
                              {zone.label}
                            </PillButton>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: wardrobeTokens.color.textFaint }}>
                          Body Mask Zones
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {COLLISION_ZONE_OPTIONS.map((zone) => (
                            <PillButton
                              key={zone.id}
                              active={workingItem.runtime.bodyMaskZones.includes(zone.id)}
                              onClick={() => handleToggleZone("bodyMaskZones", zone.id)}
                              className="px-3 py-1.5 text-[11px]"
                            >
                              {zone.label}
                            </PillButton>
                          ))}
                        </div>
                      </div>
                    </SectionFrame>

                    <SectionFrame
                      eyebrow="Inspector"
                      title="Runtime And Fit Snapshot"
                      description="현재 draft가 `Closet`에 들어갈 때 어떤 summary로 읽히는지 빠르게 확인한다."
                    >
                      <div className="space-y-3 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
                        <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
                          <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Runtime binding</div>
                          <div className="mt-2">Collision: {workingItem.runtime.collisionZones.join(", ") || "none"}</div>
                          <div>Body mask: {workingItem.runtime.bodyMaskZones.join(", ") || "none"}</div>
                          <div>Clearance: {workingItem.runtime.surfaceClearanceCm}cm</div>
                        </div>
                        <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
                          <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Measurement snapshot</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {measurementSummary.map((key) => (
                              <span
                                key={key}
                                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                                style={{ background: "rgba(255,255,255,0.84)", color: wardrobeTokens.color.textMuted }}
                              >
                                {key}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: wardrobeTokens.color.divider }}>
                          <div className="font-semibold" style={{ color: wardrobeTokens.color.text }}>Pose tuning</div>
                          {poseTuningEntries.length === 0 ? (
                            <div className="mt-2">No pose-specific overrides.</div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {poseTuningEntries.map(([poseId, tuning]) => (
                                <div key={poseId}>
                                  {poseId}: clearance x{tuning?.clearanceMultiplier ?? 1}, width {tuning?.widthScale ?? 1}, depth {tuning?.depthScale ?? 1}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </SectionFrame>

                    <SectionFrame
                      eyebrow="Certification"
                      title="Starter Certification Snapshot"
                      description="Phase 6 read-only inspection seam이다. 현재 committed starter certification bundle에 포함된 garment만 summary가 보이고, 이 값은 publish editor state를 바꾸지 않는다."
                    >
                      <GarmentCertificationPanel
                        hasWorkingItem={Boolean(workingItem)}
                        generatedAtLabel={formatDate(selectedCertificationGeneratedAt ?? certificationGeneratedAt ?? undefined)}
                        loadError={certificationLoadError}
                        detailError={selectedCertificationError}
                        isLoading={isCertificationDetailFetching}
                        certification={effectiveCertification}
                        summary={certificationSummary}
                      />
                    </SectionFrame>

                    <SectionFrame
                      eyebrow="HQ Fit"
                      title="Artifact Inspection"
                      description="Phase 8.5 read-only admin inspection seam이다. persisted HQ fit simulation id를 기준으로 artifact bundle과 lineage snapshot을 확인하고, publish editor state와는 분리해서 유지한다."
                    >
                      <div className="space-y-4">
                        <TextInputField
                          label="Fit Simulation ID"
                          value={fitSimulationInspectionId}
                          onChange={handleFitSimulationInspectionIdChange}
                          placeholder="00000000-0000-4000-8000-000000000801"
                        />
                        <div className="flex flex-wrap gap-2">
                          <PillButton
                            active={false}
                            onClick={() => {
                              void loadFitSimulationInspection();
                            }}
                            className="px-4 py-2 text-[12px]"
                          >
                            Load inspection
                          </PillButton>
                          <PillButton
                            active={false}
                            onClick={handleClearFitSimulationInspection}
                            className="px-4 py-2 text-[12px]"
                          >
                            Clear
                          </PillButton>
                        </div>
                        <FitSimulationInspectionPanel
                          inspection={fitSimulationInspection}
                          summary={fitSimulationInspectionSummary}
                          isLoading={isFitSimulationInspectionFetching}
                          loadError={fitSimulationInspectionError}
                        />
                      </div>
                    </SectionFrame>

                    <SectionFrame
                      eyebrow="Review"
                      title="Archetype Fit Preview"
                      description="저장 전에 representative body archetype 기준으로 fit 상태를 빠르게 확인한다. partner garment가 특정 체형에서만 과하게 끼거나 지나치게 큰지 여기서 먼저 걸러낸다."
                    >
                      <div className="grid gap-3">
                        {adminFitReview.map((entry) => {
                          const state = entry.assessment?.overallState ?? "regular";
                          const tone = fitStateTone[state];
                          return (
                            <div
                              key={entry.id}
                              className="rounded-[18px] border px-4 py-4"
                              style={{ borderColor: wardrobeTokens.color.divider, background: "rgba(255,255,255,0.6)" }}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-[14px] font-semibold" style={{ color: wardrobeTokens.color.text }}>
                                    {entry.label.en}
                                  </div>
                                  <div className="mt-1 text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>
                                    {entry.profile.gender} · {entry.profile.bodyFrame} · {entry.profile.simple.heightCm}cm
                                  </div>
                                </div>
                                <span
                                  className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                                  style={{ background: tone.bg, color: tone.fg }}
                                >
                                  {entry.assessment?.overallState ?? "no-data"}
                                </span>
                              </div>

                              <div className="mt-3 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
                                {entry.summaryKo}
                              </div>

                              {entry.assessment ? (
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                  {entry.assessment.limitingKeys.map((key) => (
                                    <span
                                      key={key}
                                      className="rounded-full px-3 py-1 font-semibold uppercase tracking-[0.14em]"
                                      style={{ background: "rgba(255,255,255,0.84)", color: wardrobeTokens.color.textMuted }}
                                    >
                                      {key}
                                    </span>
                                  ))}
                                  <span
                                    className="rounded-full px-3 py-1 font-semibold uppercase tracking-[0.14em]"
                                    style={{ background: "rgba(255,255,255,0.84)", color: wardrobeTokens.color.textMuted }}
                                  >
                                    tension {entry.assessment.tensionRisk}
                                  </span>
                                  <span
                                    className="rounded-full px-3 py-1 font-semibold uppercase tracking-[0.14em]"
                                    style={{ background: "rgba(255,255,255,0.84)", color: wardrobeTokens.color.textMuted }}
                                  >
                                    clipping {entry.assessment.clippingRisk}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </SectionFrame>
                  </div>
                </>
              ) : (
                <div
                  className="rounded-[24px] border px-4 py-5 text-[13px]"
                  style={{ borderColor: wardrobeTokens.color.dividerStrong, color: wardrobeTokens.color.textMuted }}
                >
                  편집할 garment를 먼저 선택하거나 새 draft를 만들어라.
                </div>
              )}

              {statusMessage ? (
                <div
                  className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
                  style={{ borderColor: "rgba(79,123,98,0.24)", color: wardrobeTokens.color.success }}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              ) : null}
              {loadError ? (
                <div
                  className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
                  style={{ borderColor: "rgba(141,74,69,0.24)", color: wardrobeTokens.color.danger }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{loadError}</span>
                </div>
              ) : null}
              {editorError ? (
                <div
                  className="flex items-start gap-2 rounded-[20px] border px-4 py-3 text-[13px]"
                  style={{ borderColor: "rgba(141,74,69,0.24)", color: wardrobeTokens.color.danger }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{editorError}</span>
                </div>
              ) : null}
            </SurfacePanel>

            <SurfacePanel className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Eyebrow>Raw Manifest Inspector</Eyebrow>
                  <p className="mt-2 text-[13px]" style={{ color: wardrobeTokens.color.textMuted }}>
                    guided form이 이 JSON payload를 조립한다. 필요하면 직접 수정할 수 있지만, parse가 실패하면 저장은 막힌다.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: parsedEditor.error ? wardrobeTokens.color.danger : wardrobeTokens.color.textMuted }}>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{parsedEditor.error ? "Invalid manifest" : "Schema-valid manifest"}</span>
                </div>
              </div>

              <textarea
                value={editorValue}
                onChange={(event) => {
                  setEditorValue(event.currentTarget.value);
                  setEditorError(null);
                  setStatusMessage(null);
                }}
                spellCheck={false}
                className="min-h-[1040px] w-full rounded-[28px] border bg-[rgba(16,22,31,0.96)] px-5 py-5 font-mono text-[12px] leading-6 text-white outline-none"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              />
            </SurfacePanel>
          </div>
        </div>
      </div>
    </main>
  );
}
