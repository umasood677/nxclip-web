import { useCallback, useEffect, useRef, useState } from "react";
import { brandTemplateApi } from "../../../services/apiClient";
import type { BrandTemplate } from "./brandTemplateModel";
import type { DeletableTemplateDraft } from "./templateDeletion";

type Gallery = {
  key: string;
  items: BrandTemplate[];
  drafts: DeletableTemplateDraft[];
  nextOffset: number | null;
  loading: boolean;
  error: string;
};

function appendUnique<T extends { id: string }>(previous: T[], next: T[]) {
  return [...new Map([...previous, ...next].map(item => [item.id, item])).values()];
}

export function useTemplateGalleryPages(brandId: string, search: string, archived: boolean, reload: number) {
  const key = JSON.stringify([brandId, search, archived, reload]);
  const initial: Gallery = { key, items: [], drafts: [], nextOffset: 0, loading: !!brandId, error: "" };
  const [state, setState] = useState(initial);
  const current = state.key === key ? state : initial;
  const latest = useRef(key);
  latest.current = key;
  const inFlight = useRef<{ key: string } | null>(null);
  const fetchPage = useCallback(async (offset: number) => {
    if (!brandId || inFlight.current?.key === key) return;
    const request = { key };
    inFlight.current = request;
    setState(previous => previous.key === key
      ? { ...previous, loading: true, error: "" }
      : { key, items: [], drafts: [], nextOffset: offset, loading: true, error: "" });
    try {
      const page = await brandTemplateApi.galleryPage(brandId, offset, search.trim().slice(0, 160), archived);
      if (latest.current !== key || inFlight.current !== request) return;
      if (!Array.isArray(page.items) || !Array.isArray(page.drafts) ||
        page.items.some(item => item.brandKitId !== brandId) ||
        page.drafts.some(item => item.templateContext?.brandKitId !== brandId) ||
        (page.nextOffset !== null && page.nextOffset !== offset + 8))
        throw Error("The template gallery returned an invalid page.");
      setState(previous => ({
        key,
        items: appendUnique(offset ? previous.items : [], page.items),
        drafts: appendUnique(offset ? previous.drafts : [], page.drafts),
        nextOffset: page.nextOffset,
        loading: false,
        error: "",
      }));
    } catch {
      if (latest.current === key && inFlight.current === request) setState(previous => ({
        ...previous, loading: false, error: "Could not load templates.",
      }));
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, [brandId, search, archived, key]);

  useEffect(() => {
    if (!brandId) return;
    const timeout = window.setTimeout(() => void fetchPage(0), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [brandId, fetchPage, search]);

  const nextOffset = current.nextOffset;
  const loadMore = useCallback(() => {
    if (nextOffset !== null) void fetchPage(nextOffset);
  }, [fetchPage, nextOffset]);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (current.loading || current.error || nextOffset === null || !sentinel.current ||
      typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) loadMore();
    }, { rootMargin: "160px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [current.loading, current.error, nextOffset, loadMore]);

  return { ...current, sentinel, loadMore };
}
