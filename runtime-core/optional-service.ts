import type { ServiceRef } from "mioku";

export async function importOptionalService<T>(
  moduleName: string,
  exportName: string,
): Promise<ServiceRef<T> | undefined> {
  try {
    const mod = (await import(moduleName)) as Record<string, unknown>;
    const ref = mod[exportName];
    return ref ? (ref as ServiceRef<T>) : undefined;
  } catch {
    return undefined;
  }
}
