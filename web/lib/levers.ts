// Policy levers grouped as the Lab and the Economic Systems page show them.
export const LEVER_GROUPS = [
  ["taxes", ["tau_top", "tau_b", "tau_c", "tau_k", "tau_cg", "tau_v"]],
  ["work", ["bite", "cb", "rr"]],
  ["services", ["m", "e", "ig", "gmi"]],
  ["ownership", ["s_coop", "s_pub"]],
] as const;
