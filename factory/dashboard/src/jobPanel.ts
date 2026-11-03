import { useSearchParams } from "@solidjs/router";

export type PanelTab = "files" | "changes" | "activity";
const TABS: PanelTab[] = ["files", "changes", "activity"];

let opener: HTMLElement | null = null;

// The job panel lives in the URL (?job=<id>&tab=<tab>), so any page can open it and a link can share it.
export function useJobPanel() {
  const [params, setParams] = useSearchParams<{ job?: string; tab?: string }>();
  const tab = (): PanelTab => (TABS.includes(params.tab as PanelTab) ? (params.tab as PanelTab) : "files");
  return {
    id: () => params.job,
    tab,
    open(id: string, t: PanelTab = "files") {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setParams({ job: id, tab: t === "files" ? undefined : t });
    },
    setTab: (t: PanelTab) => setParams({ tab: t === "files" ? undefined : t }, { replace: true }),
    close() {
      setParams({ job: undefined, tab: undefined });
      opener?.focus();
      opener = null;
    },
  };
}

// Same thing as an href on the given page, for plain links.
export const jobHref = (path: string, id: string, tab: PanelTab = "files") =>
  `${path}?job=${encodeURIComponent(id)}${tab === "files" ? "" : `&tab=${tab}`}`;
