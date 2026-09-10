/**
 * Which batch actions belong in which Notion phase.
 *
 * These were decided separately in each view and, for upload, not at all:
 * the "Upload Batch to Meta" button was gated only on the three readiness
 * checks (creative URL, creative content, destination URL). A batch still
 * being written whose concepts happened to pass those showed an Upload
 * button — offering to push copy to Meta before the writing stage had
 * handed the batch on.
 *
 * The workflow the pipeline itself implements:
 *
 *     Write ──copy done──▶ Upload ──uploaded──▶ Launch ──launched──▶ Testing ──▶ Active
 *
 * `advance_to_upload` performs the first arrow and `meta_advance` the next
 * two, so the phase is the system's own record of which stage a batch has
 * reached. An action belongs to the stage that produced it.
 */

/** Copy is written in Write, and nowhere else. */
export function canWriteCopy(phase: string | undefined | null): boolean {
  return (phase ?? "") === "Write";
}

/**
 * Upload belongs to the Upload phase — the stage a batch is moved into once
 * its copy is finished.
 *
 * The later phases are included because they are all *past* upload: a batch
 * at Launch or Active whose concepts are not all uploaded (a partial upload,
 * or a concept added afterwards) still needs the button. What it excludes is
 * everything before Upload, which is the bug this fixes.
 */
const AT_OR_PAST_UPLOAD = new Set([
  "Upload",
  "Launch",
  "Testing",
  "Analyse",
  "Analysis",
  "Active",
]);

export function canUploadToMeta(phase: string | undefined | null): boolean {
  return AT_OR_PAST_UPLOAD.has(phase ?? "");
}

/**
 * Launch is offered wherever upload is, because the button only replaces
 * Upload once every concept is actually uploaded — the phase alone never
 * decides it.
 */
export function canLaunchToMeta(phase: string | undefined | null): boolean {
  return canUploadToMeta(phase);
}

/**
 * Should this concept offer a Generate / Re-Generate Copy button?
 *
 * This was gated on the BATCH's phase, which hid the button on exactly the
 * concept that needed it: P326 sits at Testing because three of its four
 * concepts are live, while P326 C4 is at Write with no copy at all. The
 * batch's phase describes the batch as a whole, so it cannot answer a
 * question about one concept.
 *
 * Two independent reasons to offer it:
 *
 *   - The concept is at Write. Writing is the job of that phase, and
 *     re-generating there is a normal thing to do.
 *   - The concept has no copy, whatever its phase. A concept with nothing
 *     written is broken wherever it sits, and hiding the only control that
 *     fixes it helps nobody.
 *
 * Conversely a concept past Write that HAS copy does not offer it: that copy
 * is already an ad in Meta, and rewriting it there would leave Notion and
 * Meta disagreeing.
 */
export function canGenerateCopy(
  conceptPhase: string | undefined | null,
  hasCreativeContent: boolean,
): boolean {
  return canWriteCopy(conceptPhase) || !hasCreativeContent;
}

/**
 * Copy is written FROM the creative, so there is nothing to generate without
 * one. The button stays visible and disabled rather than disappearing — the
 * missing Creative URL is the thing to act on, and a button that is not
 * there cannot say so.
 */
export function copyGenerationBlocked(hasFrameUrl: boolean): boolean {
  return !hasFrameUrl;
}
