// UI copy, English. Spanish is in messages.es.ts, with the same shape (the Messages type checks it). The part
// client components need is in messages.client.ts.
import { enClient, type Widen } from "./messages.client";

/**
 * Text that reaches the site in English from the engine or the database, keyed by code. English leaves
 * every map empty, so the source text shows; another language fills them in. Anything missing falls back
 * to the source text, so a new indicator or project never shows a blank.
 */
export type ModelText = {
  indicators: Record<string, string>;
  /** Mechanism explanations by lever code, with {parameter} placeholders filled from the run's values. */
  mechanisms: Record<string, string>;
  /** The engine's fixed assumptions, in the engine's order; null keeps the engine's text. */
  assumptions: readonly string[] | null;
  /** The fiscal-closure line the engine adds to its assumptions, by closure code. */
  closure: Record<string, string>;
  /** Not-modelled items, keyed by the engine's English phrase. */
  notModelled: Record<string, string>;
  /** A sustainability flag: the indicator's label and its limit. */
  exceeds: ((label: string, limit: string) => string) | null;
  params: Record<string, string>;
  presets: Record<string, string>;
  regions: Record<string, string>;
  versions: Record<string, string>;
  projects: Record<string, { title: string; summary: string; social: string; environmental: string }>;
  /** Project assumptions, keyed by their English text. */
  projectAssumptions: Record<string, string>;
};

const sourceText: ModelText = {
  indicators: {},
  mechanisms: {},
  assumptions: null,
  closure: {},
  notModelled: {},
  exceeds: null,
  params: {},
  presets: {},
  regions: {},
  versions: {},
  projects: {},
  projectAssumptions: {},
};

export const en = {
  ...enClient,
  categories: {
    agriculture: "Agriculture",
    food_processing: "Food processing",
    renewable_energy: "Renewable energy",
    infrastructure: "Infrastructure",
    technology: "Technology and innovation",
    housing: "Housing",
    healthcare: "Healthcare",
    education: "Education and training",
    cooperatives: "Worker cooperatives",
    sme: "Small and medium businesses",
    ppp: "Public-private partnership",
    community: "Community development",
    public_fund: "Public investment fund",
  } as Record<string, string>,
  model: sourceText,
  brand: { name: "VERDANIA", tagline: "An open economic laboratory", home: "Verdania home" },
  common: { loading: "Loading…", between: (lo: string, hi: string) => `${lo} to ${hi}` },
  meta: {
    title: "Verdania: Can an economy serve humanity?",
    description:
      "An interactive economic laboratory: experiment with economic models, public policies and virtual investment in Verdania, a fictional country of 2,000,000 synthetic people.",
  },
  badges: { synthetic: "Synthetic data", virtual: "Virtual capital only", model: "Model output, not a forecast" },
  hero: {
    eyebrow: "A project of Let's the Data Talk",
    title: ["Can an economy", "serve humanity?"],
    lead: "Can an economy keep the benefits of markets and private investment while making prosperity serve everyone?",
    art: "Illustration of Verdania's farms, river, city and wind turbines",
    badgesLabel: "About the data",
    economyLabel: "Economy",
    economy: "Agriculture-led",
    flowLabel: "Capital flow",
    flow: "Fields → Factories → Families",
    ticker: "A fictional country · Synthetic population · Transparent assumptions · No real money · No financial advice",
  },
  about: {
    eyebrow: "What is Verdania?",
    title: "An economic laboratory you can step into",
    lead: "Verdania is much more than an educational website: it presents an interactive economic laboratory where people can experiment with economic models, public policies and virtual investment, and observe their consequences on prosperity, inequality and the environment.",
    country: "It is a fictional, agriculture-led country of 2,000,000 synthetic people, built so that every assumption is visible and every result can be checked.",
    tiles: [
      { href: "/experiment", title: "Run experiments", text: "Change taxes, wages, public services and ownership. A transparent engine calculates growth, incomes, poverty, inequality and debt, and explains why." },
      { href: "/experiment?preset=C", title: "Compare economic systems", text: "Four editable models, from market-led capitalism to collective ownership. Labels never change the equations; policies do." },
      { href: "/market", title: "Invest virtual capital", text: "Allocate 100,000 virtual units across Verdania's projects. Private returns are shown apart from social and environmental effects." },
      { href: "/community", title: "Save, publish, reproduce", text: "Saved scenarios keep their exact inputs and a fingerprint of their results, so anyone can re-run them and check." },
    ],
    environment: "Environmental effects come from each investment project's notes today; the simulation will model them in a later version.",
  },
  stats: {
    label: "Verdania at a glance",
    population: "Population · 50% women / 50% men",
    employment: "Employment rate (ages 15–64)",
    gdp: "GDP per person",
    allocated: "Virtual capital allocated so far",
    source: (version: string) => `Synthetic baseline · model v${version}`,
  },
  admin: {
    title: "Moderation",
    lead: "Staff only. Every action here is recorded in the audit log with who did it and when.",
    suggestions: "Suggestions",
    noSuggestions: "No suggestions yet.",
    mark: { new: "Mark new", read: "Mark read", done: "Mark done" } as Record<string, string>,
    status: { new: "New", read: "Read", done: "Done" } as Record<string, string>,
    anonymous: "Anonymous",
    signedIn: "signed-in user",
    scenarios: "Published scenarios",
    noScenarios: "No published scenarios.",
    reason: "Reason (recorded in the audit log)",
    hide: "Hide from the Community page",
    restore: "Restore",
    visible: "Visible",
    hidden: "Hidden",
    audit: "Audit log (latest 50)",
    auditCols: { when: "When", action: "Action", entity: "Item", details: "Details" },
    hiddenNote: "A moderator has hidden this scenario from the Community page. It stays visible to you.",
  },
  systems: {
    eyebrow: "02 · Four economic systems",
    title: "Same country. Four sets of rules.",
    lead: "Each system is a complete, editable bundle of taxes and spending. A label never changes an equation.",
    note: "Labels don't determine results: every model is configurable.",
    traits: { tau_top: "Top income tax", cb: "Collective bargaining coverage", s_pub: "Public ownership of capital" },
    test: "Test this model",
  },
  join: {
    eyebrow: "Join in",
    title: "Save scenarios and join the Virtual Investment Market",
    lead: "Create an account only when you want to save. Everything else stays open to explore.",
    keepExploring: "Keep exploring without an account",
  },
  footer: {
    blurb: (version: string) =>
      `An open fictional economy for testing ideas, not predicting the future. Model v${version} · All data synthetic. No real money, securities or investments.`,
  },
  signIn: {
    meta: "Sign in",
    title: "Continue with Google",
    lead: "You only need an account to save scenarios and join the Virtual Investment Market.",
    storeTitle: "What we store",
    store: [
      "Your Google name, picture link and email address. Your email is used only to sign you in and is never shown.",
      "Your profile is private.",
      "Your scenarios are private unless you publish them. Your virtual portfolio only counts towards totals across all participants.",
      "Google sign-in grants no special permissions. Roles are assigned separately by administrators.",
      "You can delete your account, and everything in it, at any time.",
    ],
    consent: "By continuing you agree to this use of your data.",
    privacyLink: "Read the privacy notice",
    noAccount: "Explore without an account",
  },
  privacy: {
    title: "Privacy",
    footer: "Privacy",
    updated: "Last updated 17 October 2026",
    lead: "Verdania runs on synthetic data and virtual capital, so it needs very little about you. You can explore every page without an account.",
    deleted: "Your account has been deleted, with your profile, scenarios and virtual portfolio.",
    sections: [
      {
        id: "browsing",
        title: "Browsing without an account",
        items: [
          "No account, no profile and no tracking. The site sets no analytics or advertising cookies.",
          "If you switch language, a cookie remembers your choice for a year.",
          "To stop abuse, the website counts each IP address's requests for a few minutes, in memory. The counts are never stored.",
        ],
      },
      {
        id: "account",
        title: "If you sign in with Google",
        items: [
          "Supabase, which runs our sign-in, keeps what Google shares: your name, email address and picture link, and when you last signed in. Your email is never shown on the site.",
          "Your profile holds only a display name and picture link, and it is private.",
          "Signing in adds two cookies: one keeps you signed in, and the other remembers for up to ten minutes which page to return you to after you sign in.",
          "Signing in grants no special permissions. Moderator and researcher roles are given separately.",
        ],
      },
      {
        id: "scenarios",
        title: "Scenarios you save",
        items: [
          "Saved scenarios are private. If you publish one, the Community page shows its title, notes, assumptions and results, but not your name.",
          "Moderators can hide a published scenario from the Community page. Each such action is recorded with who did it and why.",
        ],
      },
      {
        id: "market",
        title: "The virtual market",
        items: [
          "Your portfolio and its history of virtual units are private.",
          "Public totals add up everyone's choices, and stay hidden until a project has at least five participants.",
        ],
      },
      {
        id: "suggestions",
        title: "Ideas and suggestions",
        items: ["We keep your message, and your name and email if you give them, only to read it and reply. Only the project team, including moderators, reads them."],
      },
      {
        id: "where",
        title: "Where your data lives",
        items: [
          "Supabase holds the database and sign-in. Amazon Web Services in Sydney, Australia, runs the website and the simulation engine. Google handles the sign-in itself.",
          "These providers keep standard technical logs, such as IP addresses, for a short time to run and secure the service.",
          "We do not sell your data, show advertising, or share your data with anyone else.",
        ],
      },
    ],
    choicesTitle: "Your choices",
    choices: {
      account: "See your profile, scenarios and virtual portfolio on your account page.",
      manage: "Unpublish or delete any scenario, and withdraw virtual units, at any time.",
      delete:
        "Delete your account from your account page. That removes your sign-in record, profile, roles, every scenario (published ones too) and your virtual portfolio. Suggestions you sent stay, without your name and email. The audit log keeps only your former account ID, which no longer links to anything.",
      contact: "To have a suggestion deleted, or for any other question about your data, send us a message.",
    },
    accountLink: "Your account",
    contactLink: "Send a message",
  },
  authError: {
    meta: "Sign-in problem",
    title: "Sign-in didn't complete",
    cancelled: "Google sign-in was cancelled or interrupted.",
    exchange: "The sign-in link expired or was already used.",
    start: "We couldn't start Google sign-in.",
    retry: "Try again",
  },
  account: {
    title: "Your account",
    name: "Name",
    since: "Member since",
    visibility: "Profile visibility",
    private: "Private",
    public: "Public",
    signOut: "Sign out",
    portfolio: "Virtual portfolio",
    holdings: (allocated: string, projects: number, unallocated: string) =>
      `${allocated} allocated across ${projects} ${projects === 1 ? "project" : "projects"} · ${unallocated} unallocated`,
    notJoined: "You haven't joined the virtual market yet.",
    goMarket: "Go to the market",
    deleteTitle: "Delete your account",
    deleteLead:
      "This permanently removes your sign-in record, profile, every scenario (published ones too) and your virtual portfolio. Suggestions you sent stay, without your name and email. It can't be undone.",
    deleteOpen: "Delete my account…",
    deleteConfirm: (word: string) => `Type "${word}" to confirm`,
    deleteWord: "delete",
    deleteButton: "Delete my account permanently",
    deleteError: "Your account couldn't be deleted right now. Nothing was removed. Please try again later.",
  },
  methodology: {
    eyebrow: "Research and methodology",
    title: "How Verdania's numbers are made",
    lead: "Every result on this site comes from one published model. This page explains what it calculates, the assumptions it rests on, how uncertain it is, and how anyone can reproduce a run.",
    status: (v: string, date: string) => `Model v${v}, released ${date}. Parameter values are accepted for launch and open to revision.`,
    disclaimer:
      "Every figure is a simulated output for a fictional country. It is not a forecast, not a causal estimate for any real economy and not investment advice.",
    toc: "On this page",
    spec: "Read the full specification, with every equation",
    code: "Browse the engine's source code",
    sections: {
      rules: "Design rules",
      model: "The model in brief",
      limits: "What the model leaves out",
      parameters: "Parameters",
      uncertainty: "Uncertainty",
      checks: "Accounting checks",
      data: "Synthetic and empirical data",
      versions: "Version history",
      reproduce: "Reproduce a run",
    },
    rules: [
      "No conclusion is built in. Every behavioural link is a named parameter with a central value, a range and an evidence label. Where research disagrees on the direction of an effect, the range crosses zero.",
      "Uncertainty is explicit. Your policy choices are exact; the uncertain parameters are drawn many times, and results show a range.",
      "The accounts always balance. Accounting identities are checked every year of every run, and a failure blocks the result.",
      "A label never changes an equation. The four economic systems are bundles of policies run through the same model.",
      "What isn't modelled is said, never faked.",
    ],
    blocks: [
      {
        title: "Population",
        text: "2,000,000 synthetic people in six regions, half women and half men in every region and age group. The engine works on 20,000 sample households, each standing for 40. No wage, job or leadership rule depends on gender, so any gender gap would have to come from a modelled mechanism; version 0.1 has none.",
        equation: null,
      },
      {
        title: "Production",
        text: "Output comes from private capital, public infrastructure, and the number and skills of workers. Productivity grows at a trend rate. Public spending on education and health raises skills over time.",
        equation: "Y = A · K^α · G^γ · (h · L)^(1 − α)",
      },
      {
        title: "Work and wages",
        text: "Unemployment responds to the minimum wage, unemployment benefits, labour taxes and collective bargaining, each through its own named parameter. Bargaining and the minimum wage also shift the share of output paid as wages. When jobs are lost, they fall first on the workers most at risk.",
        equation: "u = u₀ + η_mw·Δbite + η_ub·Δrr + η_w·Δτ_L + η_cb·ΔCB",
      },
      {
        title: "Firms and ownership",
        text: "Profits are shared between public enterprises, cooperatives and private owners. Changes in ownership phase in over five years and are paid for at book value with public bonds, so nobody's wealth is simply taken. Private investment responds to corporate tax, the profit share and, possibly, public deficits.",
        equation: "I = Y · [ι₀ · (tax term)^ε_τ · (profit term)^ε_π − ψ · max(0, Δdeficit)]",
      },
      {
        title: "Government",
        text: "Revenue comes from income, capital, capital-gains, corporate and value-added taxes, plus the surplus of public enterprises. Spending covers health, education, infrastructure, pensions, unemployment benefits, a guaranteed minimum income and interest. Deficits add to debt or, if you choose, other spending is cut to respect a debt limit.",
        equation: "D(t+1) = D(t) + spending − revenue + compensation bonds",
      },
      {
        title: "Households",
        text: "Households receive wages, dividends, interest, pensions and benefits, pay taxes, then consume and save; richer households save a larger share. Health costs that public spending doesn't cover fall on households, and some go without care.",
        equation: "disposable income = market income + transfers − taxes",
      },
      {
        title: "Closing the accounts",
        text: "Trade balances the national accounts, so Verdania behaves like a small open economy.",
        equation: "net exports = GDP − consumption − investment − public spending",
      },
    ],
    noDemand:
      "The most important simplification: there is no demand block. Tax rises and spending cuts carry no short-run cost to output, and extra spending brings no short-run boost. Output responds only through capital, public infrastructure, skills and employment.",
    limits: [
      "Not modelled in v0.1: housing affordability, food security, social mobility, environmental sustainability, underemployment and supply chains between sectors.",
      "The population is fixed: no births, deaths or migration. There is no inflation.",
      "There is no default, inflation spiral or financial crisis. If debt or interest climbs too high, the run stops and says so instead of showing numbers outside the model's valid range.",
      "Investment projects in the virtual market are described by their own assumptions; they don't yet feed the model.",
    ],
    roadmap: "Planned next",
    roadmapItems: [
      { version: "v0.2", text: "Food and sector links, a demand block for downturns, housing, carbon and emissions, competition policy, investment projects that feed the model" },
      { version: "v0.3", text: "Social mobility, regional policies, underemployment, care time and part-time work" },
      { version: "v0.4", text: "Collective-planning alternatives for the collective-ownership model, trade policy" },
    ],
    levers: "Policy levers (you control these)",
    structural: "Structural parameters (uncertain, drawn in every run)",
    columns: { parameter: "Parameter", baseline: "Verdania today", range: "Range", central: "Central", evidence: "Evidence" },
    crossesZero: "range crosses zero",
    noParameters: "The parameter registry isn't reachable right now. Nothing is shown rather than a guess.",
    uncertainty: [
      "Each run draws every structural parameter 40 times from a triangular distribution over its range, most likely at the central value. Your policy levers are never randomised.",
      "The baseline and your scenario share the same draws, so a range measures the effect of your policy, not random noise.",
      "Results show the central value with the 10th to 90th percentile range of the draws. Every run also reports the share of draws that left the model's valid range.",
    ],
    checks: [
      "Wages plus profits equal output.",
      "Household wages and dividends add up to the national totals.",
      "Consumption, investment, public spending and net exports add up to GDP.",
      "What households, firms and government save, minus investment, equals the balance with the rest of the world.",
      "Public debt changes by exactly the deficit plus any compensation bonds.",
      "Household wealth adds up to the national total.",
      "Identical inputs give byte-identical results.",
      "With no policy change, the baseline stays on its growth path.",
      "Year 0 is identical in every scenario.",
      "Each of the four economic systems pays for itself: a deficit within 3% of output in year 10.",
      "In the virtual market, unallocated plus allocated units always equal the grant.",
    ],
    checksNote:
      "Behaviour tests check limits only (for example, a 0% VAT raises no VAT). They never check the direction of a contested effect.",
    data: (rows: number) =>
      `All people, places and figures in Verdania are synthetic, and every figure in the database is labelled synthetic or empirical. Empirical figures in use today: ${rows}. Where a parameter's range draws on published research, the source is named in the table above.`,
    sources:
      "Cited sources: Bom & Ligthart (2014), Journal of Economic Surveys; Cengiz, Dube, Lindner & Zipperer (2019), Quarterly Journal of Economics; OECD (2019), Negotiating Our Way Up; Saez, Slemrod & Giertz (2012), Journal of Economic Literature.",
    current: "current",
    reproduceLead: "Every saved scenario keeps a complete record of its run:",
    record: [
      "the model version and the engine build (its git commit)",
      "the population seed and the random seed for the draws",
      "the horizon and every policy lever",
      "input fingerprint: SHA-256 of the inputs in canonical form",
      "output fingerprint: SHA-256 of everything the run reports, except the build id",
    ],
    reproduceSteps: [
      "Open any saved or published scenario and press \"Re-run and verify\". The engine recomputes it and compares both fingerprints.",
      "Or run the open-source engine yourself and send it the scenario's levers and horizon: the same model version gives the same fingerprints.",
    ],
  },
  people: {
    eyebrow: "People and Society",
    title: "Who lives in Verdania?",
    lead: "Two million synthetic people, made by a generator from a published random seed, so anyone can recreate exactly the same population. Nobody here is real, and every figure on this page comes from the generator.",
    age: "Age and sex",
    ageLead: "Women and men are equal in number in every region and age group, by design.",
    ageCaption: "People by age group and sex",
    group: "Age group",
    women: "Women",
    men: "Men",
    share: "Share of all people",
    bands: { "0-14": "Children (0–14)", "15-64": "Working age (15–64)", "65+": "Older people (65+)" } as Record<string, string>,
    education: "Education",
    educationLead: "Highest level completed, people aged 15 and over.",
    educationCaption: "Highest education level completed, by age group",
    level: "Level",
    levels: { primary: "Primary", lower_secondary: "Lower secondary", upper_secondary: "Upper secondary", tertiary: "Tertiary" } as Record<string, string>,
    work: "Work",
    workLead: (pct: string) => `${pct} of working-age people are in the labour force (working or looking for work). Where they work:`,
    regions: "By region",
    regionsCaption: "The synthetic population of each region",
    cols: { region: "Region", people: "People", children: "Children", older: "65+", tertiary: "Tertiary education (15+)", participation: "In the labour force (15–64)" },
    discover: "See the regions on the map",
    notYet: "Not modelled yet",
    notYetItems: [
      "Births, deaths and migration: the population is fixed in model v0.1.",
      "Social mobility between parents and children (planned for v0.3).",
      "Care work and part-time work, possible sources of a gender pay gap (planned for v0.3).",
      "Underemployment (planned for v0.3).",
    ],
    footnote: (generator: string, seed: string) =>
      `Synthetic population · generator ${generator}, seed ${seed} · recorded with every simulation run. Not real people and not real-world data.`,
    error: "The population data isn't reachable right now. Nothing is shown rather than a guess.",
  },
  systemsPage: {
    eyebrow: "Economic systems",
    title: "Same country. Four sets of rules.",
    lead: "Each system is a complete bundle of taxes, wages, public services and ownership, applied to the same country and the same people. The name is only a label: the equations are identical for all four, and every value can be changed in the Lab.",
    families: {
      A: "Lower taxes and transfers, narrower collective bargaining, a lower minimum wage and mostly private ownership.",
      B: "Somewhat higher taxes than today, wider collective bargaining, stronger unemployment benefits and a higher minimum wage, with mostly private ownership.",
      C: "Higher, more progressive taxes, bargaining that covers most workers, generous benefits and public services, and larger public and cooperative stakes.",
      D: "Large public (45%) and worker-cooperative (35%) shares of capital, near-universal bargaining and the highest health and education spending.",
    } as Record<string, string>,
    rules: "The rules side by side",
    rulesLead: "Every policy setting in each system, next to Verdania today. Arrows mark settings above or below today's.",
    rulesCaption: "Policy settings of the four economic systems compared with Verdania today",
    policy: "Policy",
    today: "Verdania today",
    higher: "higher than today",
    lower: "lower than today",
    outcomes: "The economy after ten years",
    outcomesCaption: (h: number) => `The economy after ten years: year ${h}, compared with today's policies`,
    outcomesLead: (h: number) =>
      `Engine results for year ${h}, each compared with keeping today's policies, with the range across uncertain assumptions.`,
    justice: "Who gains and who loses: compare them on social justice",
    open: "Open in the Lab",
  },
  justice: {
    eyebrow: "Social justice",
    title: "Who gets what in Verdania?",
    lead: "Inequality, poverty and access to health care, one measure at a time and never folded into a single score. Then the same yardstick for the four economic systems.",
    today: "Verdania today",
    todayLead: "The shared starting point of every experiment (year 0).",
    explain: {
      gini_market: "Before taxes and transfers. 0 means everyone earns the same; 1 means one person earns everything.",
      gini_disposable: "After taxes and transfers. The gap from the market figure is what redistribution does.",
      poverty_relative: "People living on less than 60% of the median income.",
      wealth_top10: "Share of all household wealth owned by the richest tenth.",
      wealth_top1: "Share of all household wealth owned by the richest hundredth.",
      labour_share: "Share of national income paid as wages rather than profits.",
      catastrophic_health: "People whose out-of-pocket health costs exceed 10% of their household's income.",
      regional_ratio: "Mean income in the richest region divided by the poorest.",
    } as Record<string, string>,
    redistribution: "Before and after taxes and transfers",
    redistributionLead: (year: number) =>
      `Income per person by tenth of the population: what the market pays, and what people keep after taxes, benefits and pensions. Year ${year} with today's policies.`,
    market: "Market income",
    disposable: "Disposable income",
    systems: "Four economic systems, one yardstick",
    systemsCaption: (h: number) => `Four economic systems, one yardstick: year ${h}, compared with today's policies`,
    systemsLead: (h: number) =>
      `Each system is a complete policy bundle that keeps its deficit within 3% of output. Figures are for year ${h}, each compared with keeping today's policies, with the range across uncertain assumptions.`,
    keepToday: "Today's policies",
    measure: "Measure",
    range: "Range",
    open: "Open in the Lab",
    caveat:
      "These results depend on assumptions that economists dispute, such as how unemployment responds to the minimum wage. The methodology page shows each assumption and its evidence; the Lab lets you change any policy and see the difference.",
    gender:
      "The gender pay gap is zero by construction in model v0.1, because women and men are modelled identically. Mechanisms that could open a gap are planned for v0.3.",
    error: "The simulation engine isn't reachable right now. Nothing is shown rather than a guess.",
  },
} as const;


export type Messages = Widen<typeof en>;
