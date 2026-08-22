const scheduleImmediate =
  typeof globalThis.setImmediate === "function"
    ? globalThis.setImmediate.bind(globalThis)
    : (callback, ...args) => setTimeout(callback, 0, ...args);

export const unpatchedSetImmediate = scheduleImmediate;

export function DANGEROUSLY_runPendingImmediatesAfterCurrentTask() {}

export function expectNoPendingImmediates() {}
