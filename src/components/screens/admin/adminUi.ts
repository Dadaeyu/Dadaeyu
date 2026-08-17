/** Shared admin UI class tokens (light + dark via design tokens). */

export const adminAlertClass =
  "border-error/40 text-error bg-surface-soft rounded-2xl border px-4 py-3 text-sm";

export const adminPanelClass =
  "border-hairline-soft bg-background overflow-hidden rounded-2xl border";

export const adminFormPanelClass =
  "border-hairline-soft bg-background space-y-4 rounded-2xl border p-5 sm:p-6";

export const fieldLabelClass = "text-stone mb-1.5 block text-xs font-semibold";

export const fieldInputClass =
  "border-hairline bg-background text-ink placeholder:text-stone focus:border-navy-400 focus:ring-navy-400/30 w-full rounded-xl border px-3 py-2.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60";

export const fieldTextareaClass = `${fieldInputClass} resize-y leading-relaxed`;

export const fieldSelectClass =
  "border-hairline bg-background text-ink focus:border-navy-400 focus:ring-navy-400/30 rounded-xl border px-3 py-2.5 text-sm focus:ring-2 focus:outline-none";

export const tableWrapClass = "overflow-x-auto";

export const tableClass = "w-full min-w-[52rem] text-sm";

export const tableHeadRowClass = "border-hairline-soft bg-surface-soft border-b";

/** Default header: centered */
export const tableThClass = "text-steel px-4 py-3 text-center text-xs font-bold whitespace-nowrap";

/** Long text columns (title, question, nickname, email) */
export const tableThLeftClass =
  "text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap";

export const tableBodyClass = "divide-hairline-soft divide-y";

export const tableRowClass = "hover:bg-surface-soft/60 transition-colors";

export const tableTdClass = "px-4 py-3.5 align-middle";

export const tableTdCenterClass = "px-4 py-3.5 text-center align-middle";

export const emptyStateClass = "text-stone px-4 py-10 text-center text-sm";
