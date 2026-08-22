export const assistantOpenEvent = "avrmd:assistant-open";

/** Lets the header trigger the panel without wrapping the app in a provider. */
export function openAssistant(prefill?: string) {
  window.dispatchEvent(
    new CustomEvent(assistantOpenEvent, {
      detail: typeof prefill === "string" ? prefill : undefined,
    }),
  );
}
