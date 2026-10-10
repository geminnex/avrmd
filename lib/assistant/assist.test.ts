import { describe, expect, it } from "vitest";
import { buildActions } from "./actions";
import { buildMessages, validateReply } from "./llm";
import { buildCorpus, detectFacets, detectStages, retrieve, terms, type CorpusItem } from "./retrieve";

const corpus = buildCorpus();

describe("retrieval", () => {
  it("drops filler words and folds plurals", () => {
    expect(terms("What are the VR headsets for surgeons?")).toEqual(["headset", "surgeon"]);
  });

  it("finds FDA devices and records for a product question", () => {
    const items = retrieve("AR navigation for spine surgery", corpus);
    expect(items.some((item) => item.type === "fda")).toBe(true);
    expect(items.every((item, index) => item.id === `s${index + 1}`)).toBe(true);
  });

  it("caps any one source type so others still get a say", () => {
    const items = retrieve("spine surgery navigation system", corpus, { limit: 20 });
    expect(items.filter((item) => item.type === "fda").length).toBeLessThanOrEqual(4);
  });

  it("puts the page the reader is on first", () => {
    const stage = corpus.find((item) => item.href === "/stages/regulatory")!;
    const items = retrieve("what is hard here", corpus, { pinned: [stage] });
    expect(items[0].href).toBe("/stages/regulatory");
    expect(items[0].id).toBe("s1");
  });

  it("returns nothing rather than noise for an unrelated question", () => {
    expect(retrieve("zzqx flibbertigibbet", corpus)).toEqual([]);
  });
});

describe("detection", () => {
  it("ignores modalities, which every question names", () => {
    expect(detectFacets("an AR or VR headset")).toEqual([]);
  });

  it("maps regulatory and commercial wording onto stages", () => {
    expect(detectStages("How long does FDA 510(k) clearance take?")).toContain("regulatory");
    expect(detectStages("Who pays? reimbursement and pricing")).toContain("commercialization");
  });
});

describe("actions", () => {
  const base = { facets: [], stages: [], topicSlugs: [], helperCount: 0, items: [], query: "x" };

  it("always offers to ask the members, carrying the tags along", () => {
    const actions = buildActions({ ...base, facets: ["Rehabilitation"], stages: ["validation"] });
    const askAction = actions.find((action) => action.id === "ask")!;
    expect(askAction.href).toBe("/ask?facet=Rehabilitation&stage=validation");
  });

  it("only points at members when somebody has offered help", () => {
    expect(buildActions({ ...base, facets: ["Rehabilitation"] }).some((a) => a.id === "members")).toBe(false);
    const actions = buildActions({ ...base, facets: ["Rehabilitation"], helperCount: 2 });
    expect(actions.find((a) => a.id === "members")?.label).toMatch(/^2 members/);
  });

  it("links only inside the site", () => {
    const actions = buildActions({
      ...base,
      facets: ["Rehabilitation"],
      stages: ["regulatory"],
      topicSlugs: ["pain-management"],
      helperCount: 1,
      items: [{ type: "fda" }, { type: "talk" }, { type: "question" }, { type: "signal" }],
    });
    for (const action of actions) expect(action.href, action.id).toMatch(/^\/[a-z]/);
  });
});

describe("model replies", () => {
  const items: CorpusItem[] = [
    { id: "s1", type: "fda", title: "A", body: "", href: "https://x", external: true, meta: "" },
    { id: "s2", type: "record", title: "B", body: "", href: "/entities/b", external: false, meta: "" },
  ];
  const actions = [{ id: "ask", label: "Ask", href: "/ask" }];

  it("keeps only citations to sources it was given", () => {
    const reply = validateReply(
      { answer: "True [s1]. Invented [s9]. Also [s2].", citations: ["s1", "s7"], actions: ["ask", "hack"], followups: ["Next?"] },
      items,
      actions,
    )!;
    expect(reply.answer).toBe("True [s1]. Invented. Also [s2].");
    expect(reply.citations).toEqual(["s1", "s2"]);
    expect(reply.actions).toEqual(["ask"]);
    expect(reply.followups).toEqual(["Next?"]);
  });

  it("rejects anything that is not an answer", () => {
    expect(validateReply(null, items, actions)).toBeNull();
    expect(validateReply({ answer: "   " }, items, actions)).toBeNull();
    expect(validateReply({ text: "hi" }, items, actions)).toBeNull();
  });

  it("sends the model sources and actions, and nothing about members", () => {
    const [system, user] = buildMessages("q", items, actions, "the Regulatory stage guide");
    expect(system.content).toMatch(/ONLY from the numbered sources/);
    expect(user.content).toContain("[s1]");
    expect(user.content).toContain("ask: Ask");
    expect(user.content).toContain("Regulatory stage guide");
  });
});
