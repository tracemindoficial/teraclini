import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

// Capture the real hook options without mounting React; exercise them through
// React Query's observer so disabled fetch and reopening are actually tested.
const capture = vi.hoisted(() => ({ options: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: (options: Record<string, unknown>) => { capture.options = options; return {}; },
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/patient-registration.functions", () => ({ saveCompletePatient: vi.fn() }));

import { usePatients } from "./patients";
import { useLocations } from "./locations";
import { usePackages } from "./packages";
import { useRooms, useAppointmentTypes } from "./schedule";
import { useServicePrices } from "./basic-registrations";

const hooks = [
  { name: "patients", run: (enabled?: boolean) => usePatients(undefined, enabled) },
  { name: "locations", run: (enabled?: boolean) => useLocations(enabled) },
  { name: "packages", run: (enabled?: boolean) => usePackages("patient-a", enabled) },
  { name: "rooms", run: (enabled?: boolean) => useRooms("location-a", enabled) },
  { name: "services", run: (enabled?: boolean) => useAppointmentTypes(enabled) },
  { name: "prices", run: (enabled?: boolean) => useServicePrices(true, "service-a", enabled) },
];

describe("dialog-owned queries", () => {
  for (const hook of hooks) {
    it(`${hook.name} stays disabled when closed and fetches after opening`, async () => {
      hook.run(false);
      const key = capture.options["queryKey"] as readonly unknown[];
      expect(capture.options["enabled"]).toBe(false);
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const fetch = vi.fn(async () => ["loaded"]);
      const observer = new QueryObserver(client, { queryKey: key, queryFn: fetch, enabled: false });
      const unsubscribe = observer.subscribe(() => {});
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fetch).not.toHaveBeenCalled();
      hook.run(true);
      expect(capture.options["queryKey"]).toEqual(key);
      observer.setOptions({ queryKey: key, queryFn: fetch, enabled: capture.options["enabled"] === true });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      await vi.waitFor(() => expect(client.getQueryData(key)).toEqual(["loaded"]));
      observer.setOptions({ queryKey: key, queryFn: fetch, enabled: false });
      await client.invalidateQueries({ queryKey: key });
      expect(fetch).toHaveBeenCalledTimes(1);
      observer.setOptions({ queryKey: key, queryFn: fetch, enabled: true });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      unsubscribe(); client.clear();
    });

    it(`${hook.name} keeps existing consumers enabled by default`, () => {
      hook.run();
      expect(capture.options["enabled"]).toBe(true);
    });
  }
});