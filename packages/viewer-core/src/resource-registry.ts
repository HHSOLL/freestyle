export type ViewerResourceKind =
  | "geometry"
  | "texture"
  | "material"
  | "skeleton"
  | "animation"
  | "render-target"
  | "decoder"
  | "generic";

export type ViewerResourceRegistration = {
  id: string;
  kind: ViewerResourceKind;
  byteSize?: number;
  dispose?: () => void;
};

export type ViewerResourceSnapshot = {
  id: string;
  kind: ViewerResourceKind;
  refCount: number;
  byteSize: number;
  lastTouchedAt: number;
  disposed: boolean;
  owners: readonly string[];
};

export type ViewerResourceRegistrySnapshot = {
  resources: readonly ViewerResourceSnapshot[];
  totalBytes: number;
  retainedBytes: number;
  releasableBytes: number;
  unreleasedCount: number;
};

export type ViewerResourceRegistryOptions = {
  budgetBytes?: number;
  now?: () => number;
};

export type ViewerResourceRegistry = {
  register: (resource: ViewerResourceRegistration) => ViewerResourceSnapshot;
  acquire: (id: string, owner?: string) => ViewerResourceSnapshot;
  release: (id: string, owner?: string) => ViewerResourceSnapshot;
  markReleasable: (id: string) => ViewerResourceSnapshot;
  evictLRU: (targetBudgetBytes?: number) => string[];
  dispose: (id: string) => boolean;
  disposeAll: () => string[];
  get: (id: string) => ViewerResourceSnapshot | null;
  snapshot: () => ViewerResourceRegistrySnapshot;
};

type MutableResourceRecord = {
  id: string;
  kind: ViewerResourceKind;
  refCount: number;
  byteSize: number;
  lastTouchedAt: number;
  disposed: boolean;
  dispose?: () => void;
  owners: Map<string, number>;
};

const defaultNow = () => Date.now();

const normalizeOwner = (owner?: string) => owner?.trim() || "anonymous";

const toSnapshot = (record: MutableResourceRecord): ViewerResourceSnapshot => ({
  id: record.id,
  kind: record.kind,
  refCount: record.refCount,
  byteSize: record.byteSize,
  lastTouchedAt: record.lastTouchedAt,
  disposed: record.disposed,
  owners: [...record.owners.entries()]
    .filter(([, count]) => count > 0)
    .map(([owner]) => owner)
    .sort(),
});

const assertValidResourceId = (id: string) => {
  if (!id.trim()) {
    throw new Error("Resource id must be a non-empty string.");
  }
};

export const createResourceRegistry = (
  options: ViewerResourceRegistryOptions = {},
): ViewerResourceRegistry => {
  const now = options.now ?? defaultNow;
  const records = new Map<string, MutableResourceRecord>();

  const touch = (record: MutableResourceRecord) => {
    record.lastTouchedAt = now();
  };

  const requireRecord = (id: string) => {
    const record = records.get(id);
    if (!record || record.disposed) {
      throw new Error(`Viewer resource "${id}" is not registered.`);
    }
    return record;
  };

  const disposeRecord = (record: MutableResourceRecord) => {
    if (record.disposed) {
      return false;
    }
    if (record.refCount > 0) {
      throw new Error(`Viewer resource "${record.id}" still has ${record.refCount} active references.`);
    }

    record.dispose?.();
    record.disposed = true;
    record.owners.clear();
    records.delete(record.id);
    return true;
  };

  const registry: ViewerResourceRegistry = {
    register(resource) {
      assertValidResourceId(resource.id);
      if (records.has(resource.id)) {
        throw new Error(`Viewer resource "${resource.id}" is already registered.`);
      }

      const record: MutableResourceRecord = {
        id: resource.id,
        kind: resource.kind,
        refCount: 0,
        byteSize: Math.max(0, Math.floor(resource.byteSize ?? 0)),
        lastTouchedAt: now(),
        disposed: false,
        dispose: resource.dispose,
        owners: new Map(),
      };
      records.set(resource.id, record);
      return toSnapshot(record);
    },

    acquire(id, owner) {
      const record = requireRecord(id);
      const ownerKey = normalizeOwner(owner);
      record.refCount += 1;
      record.owners.set(ownerKey, (record.owners.get(ownerKey) ?? 0) + 1);
      touch(record);
      return toSnapshot(record);
    },

    release(id, owner) {
      const record = requireRecord(id);
      if (record.refCount <= 0) {
        throw new Error(`Viewer resource "${id}" has no active references to release.`);
      }

      const ownerKey = normalizeOwner(owner);
      const ownerCount = record.owners.get(ownerKey) ?? 0;
      if (ownerCount <= 0) {
        throw new Error(`Viewer resource "${id}" is not owned by "${ownerKey}".`);
      }

      record.refCount -= 1;
      if (ownerCount === 1) {
        record.owners.delete(ownerKey);
      } else {
        record.owners.set(ownerKey, ownerCount - 1);
      }
      touch(record);
      return toSnapshot(record);
    },

    markReleasable(id) {
      const record = requireRecord(id);
      if (record.refCount > 0) {
        throw new Error(`Viewer resource "${id}" cannot be marked releasable while referenced.`);
      }
      touch(record);
      return toSnapshot(record);
    },

    evictLRU(targetBudgetBytes = options.budgetBytes ?? 0) {
      const evicted: string[] = [];
      const budget = Math.max(0, Math.floor(targetBudgetBytes));

      const currentTotalBytes = () =>
        [...records.values()].reduce((total, record) => total + record.byteSize, 0);

      const candidates = [...records.values()]
        .filter((record) => record.refCount === 0)
        .sort((left, right) => left.lastTouchedAt - right.lastTouchedAt || left.id.localeCompare(right.id));

      for (const record of candidates) {
        if (currentTotalBytes() <= budget) {
          break;
        }
        if (disposeRecord(record)) {
          evicted.push(record.id);
        }
      }

      return evicted;
    },

    dispose(id) {
      const record = requireRecord(id);
      return disposeRecord(record);
    },

    disposeAll() {
      const disposed: string[] = [];
      const releasable = [...records.values()]
        .filter((record) => record.refCount === 0)
        .sort((left, right) => left.lastTouchedAt - right.lastTouchedAt || left.id.localeCompare(right.id));

      for (const record of releasable) {
        if (disposeRecord(record)) {
          disposed.push(record.id);
        }
      }

      return disposed;
    },

    get(id) {
      const record = records.get(id);
      return record && !record.disposed ? toSnapshot(record) : null;
    },

    snapshot() {
      const resources = [...records.values()].map(toSnapshot).sort((left, right) => left.id.localeCompare(right.id));
      const totalBytes = resources.reduce((total, resource) => total + resource.byteSize, 0);
      const retainedBytes = resources
        .filter((resource) => resource.refCount > 0)
        .reduce((total, resource) => total + resource.byteSize, 0);

      return {
        resources,
        totalBytes,
        retainedBytes,
        releasableBytes: totalBytes - retainedBytes,
        unreleasedCount: resources.filter((resource) => resource.refCount > 0).length,
      };
    },
  };

  return registry;
};
