import type { Creative } from "./api";

/** A creative is a concept when it points at a parent batch. */
export function isConcept(creative: Creative): boolean {
  return (creative.parentItem?.length ?? 0) > 0;
}

/**
 * Merge a concept with its parent batch so the concept inherits any product
 * detail it does not carry itself. The concept's own data always wins.
 *
 * `product` is the one field without a clean null: the backend falls back to
 * the creative's own title when no product is resolved, so "no own product"
 * is exactly when the concept's product equals its name.
 */
export function withParentFallback(
  concept: Creative,
  parent: Creative | undefined,
): Creative {
  if (!parent) return concept;
  return {
    ...concept,
    product:
      !concept.product || concept.product === concept.name
        ? parent.product
        : concept.product,
    brand: concept.brand || parent.brand,
    angle: concept.angle ?? parent.angle,
    awareness: concept.awareness ?? parent.awareness,
    audience: concept.audience ?? parent.audience,
    problem: concept.problem ?? parent.problem,
    desire: concept.desire ?? parent.desire,
    hook: concept.hook ?? parent.hook,
    hypothesis: concept.hypothesis ?? parent.hypothesis,
    headlines: concept.headlines.length ? concept.headlines : parent.headlines,
    primary_texts: concept.primary_texts.length
      ? concept.primary_texts
      : parent.primary_texts,
    model: concept.model ?? parent.model,
    generatedAt: concept.generatedAt ?? parent.generatedAt,
    generationUpdatedAt: concept.generationUpdatedAt ?? parent.generationUpdatedAt,
  };
}
