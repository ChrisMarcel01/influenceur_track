import React, { useMemo, useState, useContext, createContext, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Platform, platforms, platformOptions as platformChoices, getPlatformLabel } from "@/lib/platforms";
import { DEFAULT_SEARCH_PLATFORMS } from "@/api/influencerSearch";
import { useInfluencerSearch } from "@/hooks/useInfluencerSearch";
import {
  fetchInfluencerProfile,
  InfluencerProfileResponse,
  PlatformMetrics as ApiPlatformMetrics,
  PostSummary,
} from "@/api/socialMetrics";
import {
  Download,
  Bell,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Star,
  Trophy,
  AlertTriangle,
  Calendar,
  BarChart2,
  LineChart as LineIcon,
  FileSpreadsheet,
  FileText,
  Share2,
  Plus,
  Sun,
  Moon,
  Languages,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const weeks = ["W-11","W-10","W-9","W-8","W-7","W-6","W-5","W-4","W-3","W-2","W-1","W0"];
const defaultEngagementFormats = ["Photo", "Vidéo", "Story", "Live"] as const;

type PlatformAccount = { handle: string; displayName?: string };

type InfluencerMeta = {
  name: string;
  accounts: Partial<Record<Platform, PlatformAccount>>;
};

type Post = PostSummary;

function normalizeSeries(series?: number[]): number[] {
  if (!series || series.length === 0) {
    return weeks.map(() => 0);
  }
  if (series.length === weeks.length) {
    return [...series];
  }
  if (series.length > weeks.length) {
    return series.slice(series.length - weeks.length);
  }
  const padValue = series[0] ?? 0;
  const padding = Array.from({ length: weeks.length - series.length }, () => padValue);
  return [...padding, ...series];
}

function score({ weeklyDelta, avgEngagement, posts7d }:{ weeklyDelta:number; avgEngagement:number; posts7d:number }){
  const growth = Math.min(Math.max((weeklyDelta + 5)/10, 0), 1);
  const engage = Math.min(avgEngagement/6, 1);
  const volume = Math.min(posts7d/7, 1);
  return Math.round((0.4*growth + 0.4*engage + 0.2*volume)*100);
}

const solidColor = (name:string) => { let h=0; for(let i=0;i<name.length;i++){ h=(h*31+name.charCodeAt(i))>>>0; } h%=360; return `hsl(${h}, 70%, 50%)`; };
const softColor = (name:string, a=0.08) => { let h=0; for(let i=0;i<name.length;i++){ h=(h*31+name.charCodeAt(i))>>>0; } h%=360; return `hsla(${h}, 70%, 50%, ${a})`; };

type ThemeMode = "light" | "dark";
type Language = "fr" | "en";

interface PreferencesContextValue {
  theme: ThemeMode;
  setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>;
  toggleTheme: () => void;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  toggleLanguage: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme-mode");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem("language");
  return stored === "en" ? "en" : "fr";
};

function PreferencesProvider({ children }:{ children:React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme-mode", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("language", language);
    }
  }, [language]);

  const toggleTheme = useCallback(() => setTheme(prev => prev === "dark" ? "light" : "dark"), []);
  const toggleLanguage = useCallback(() => setLanguage(prev => prev === "fr" ? "en" : "fr"), []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, language, setLanguage, toggleLanguage }), [theme, language, toggleTheme, toggleLanguage]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

function usePreferences(){
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("PreferencesContext missing");
  return ctx;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {},
  en: {
    "Alertes": "Alerts",
    "Alias / handles par réseau": "Aliases / handles per network",
    "Ajoute au moins un influenceur dans le Dashboard ou ici.": "Add at least one influencer in the Dashboard or here.",
    "Ajoute un @handle et lie-le à un nom": "Add a @handle and link it to a name",
    "Ajouter / lier des comptes (par @handle)": "Add / link accounts (by @handle)",
    "Ajouter/Lier": "Add/Link",
    "Baisse d’engagement": "Engagement drop",
    "Comparateur": "Comparator",
    "Comparateur (par réseau social)": "Comparator (by social network)",
    "Comparatif": "Comparative",
    "Conseil": "Advice",
    "Croissance 40% · Engagement 40% · Volume 20%": "Growth 40% · Engagement 40% · Volume 20%",
    "Dashboard": "Dashboard",
    "Destinataires": "Recipients",
    "Détail influenceur": "Influencer detail",
    "Engagement moyen": "Average engagement",
    "Engagement moyen par format (sélection)": "Average engagement by format (selection)",
    "Enregistrer": "Save",
    "Évolution (12 semaines)": "Evolution (12 weeks)",
    "Évolution des abonnés (12 semaines)": "Followers evolution (12 weeks)",
    "Exporter": "Export",
    "Exporter Excel": "Export Excel",
    "Fenêtre (h)": "Window (h)",
    "Filtrer": "Filter",
    "Générer un PDF (démo)": "Generate a PDF (demo)",
    "Hebdomadaire": "Weekly",
    "InfluenceTrack": "InfluenceTrack",
    "Influenceur": "Influencer",
    "Influenceurs à visualiser": "Influencers to display",
    "Likes moyens (10 posts)": "Average likes (10 posts)",
    "Mode clair": "Light mode",
    "Mode sombre": "Dark mode",
    "Langue": "Language",
    "MVP • Alias par réseau • Maquettes interactives": "MVP • Alias per network • Interactive mockups",
    "Mensuel": "Monthly",
    "Modèle marque blanche incluant sommaire, KPIs, graphiques, top posts.": "White-label template including summary, KPIs, charts, top posts.",
    "Nom affiché (ex: Amelia)": "Display name (e.g. Amelia)",
    "Notifications": "Notifications",
    "Notifications & alertes": "Notifications & alerts",
    "Notifications push": "Push notifications",
    "OK": "OK",
    "Perte d’abonnés": "Followers loss",
    "Période (sem.)": "Period (wks)",
    "Post performant": "High-performing post",
    "Posts (7j)": "Posts (7d)",
    "Quantile": "Quantile",
    "Quantile de référence": "Reference quantile",
    "Rapports": "Reports",
    "Rapports automatiques": "Automated reports",
    "Recommandé": "Recommended",
    "Réseaux interrogés": "Queried networks",
    "Réseaux sociaux": "Social networks",
    "Score": "Score",
    "Seuil (Δ hebdo)": "Threshold (weekly Δ)",
    "Sélection": "Selection",
    "Télécharger PDF": "Download PDF",
    "Top posts récents": "Recent top posts",
    "Tous": "All",
    "Voir le profil": "Open profile",
    "Vérifié": "Verified",
    "@handle (ex: @nom_sur_tiktok)": "@handle (e.g. @name_on_tiktok)",
    "Δ hebdo": "Weekly Δ",
    "Δ hebdo (sélection)": "Weekly Δ (selection)",
    "Abonnés": "Followers",
    "Abonnés (sélection)": "Followers (selection)",
    "Partager": "Share",
    "12 sem.": "12 wks",
    "Suggestions d’influenceurs": "Influencer suggestions",
    "Aucun résultat trouvé": "No results found",
    "Engagement": "Engagement",
    "Thématiques": "Topics",
    "Chargement des données en cours...": "Loading data...",
    "Actualiser": "Refresh",
    "Tapez au moins 2 caractères pour afficher des suggestions": "Type at least 2 characters to show suggestions",
  },
};

function useTranslation(){
  const { language } = usePreferences();
  const t = useCallback((text: string) => {
    if (language === "fr") return text;
    return translations.en[text] ?? text;
  }, [language]);
  return { t, language };
}

interface AppState {
  entities: InfluencerMeta[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  toggleEntity: (name: string) => void;
  addOrLinkInfluencer: (params: { platform: Platform; handle: string; displayName?: string }) => Promise<void>;
  refreshInfluencer: (name: string) => Promise<void>;
  growth: Record<string, number[]>;
  engagement: Record<string, Record<string, number>>;
  platformMetrics: Record<string, Record<Platform, { followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number }>>;
  posts: Record<string, Record<Platform, Post[]>>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

const AppStateContext = createContext<AppState | null>(null);
function useAppState(){ const ctx = useContext(AppStateContext); if(!ctx) throw new Error("AppStateContext missing"); return ctx; }

function titleCaseFromHandle(cleanHandle: string){
  const raw = cleanHandle.replace(/^@/, "");
  const spaced = raw.replace(/[_\.\-]+/g, " ");
  return spaced.split(" ").filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

function AppStateProvider({ children }:{ children:React.ReactNode }){
  const [entities, setEntities] = useState<InfluencerMeta[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [growth, setGrowth] = useState<Record<string, number[]>>({});
  const [engagement, setEngagement] = useState<Record<string, Record<string, number>>>({});
  const [platformMetrics, setPlatformMetrics] = useState<Record<string, Record<Platform, ApiPlatformMetrics>>>({});
  const [posts, setPosts] = useState<Record<string, Record<Platform, Post[]>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const toggleEntity = (name:string) => setSelected(prev => prev.includes(name)? prev.filter(n=>n!==name) : [...prev, name]);

  const applyProfile = useCallback((name: string, profile: InfluencerProfileResponse) => {
    const accountsFromProfile: Partial<Record<Platform, PlatformAccount>> = profile.accounts
      ? Object.fromEntries(
          Object.entries(profile.accounts).map(([key, account]) => {
            if (!account) return [key, account];
            const normalizedHandle = account.handle?.startsWith("@") ? account.handle : account.handle ? `@${account.handle}` : account.handle;
            return [key, { ...account, handle: normalizedHandle }];
          }),
        ) as Partial<Record<Platform, PlatformAccount>>
      : {};

    setEntities(prev => prev.map(entity => entity.name === name ? ({
      ...entity,
      accounts: {
        ...entity.accounts,
        ...accountsFromProfile,
      },
    }) : entity));

    const normalizedGrowth = normalizeSeries(profile.summary?.growthSeries);
    setGrowth(prev => ({ ...prev, [name]: normalizedGrowth }));

    const engagementMap = profile.summary?.engagementByFormat ?? {};
    const formats = new Set<string>([...Object.keys(engagementMap), ...defaultEngagementFormats]);
    const normalizedEngagement: Record<string, number> = {};
    formats.forEach(fmt => { normalizedEngagement[fmt] = engagementMap[fmt] ?? 0; });
    setEngagement(prev => ({ ...prev, [name]: normalizedEngagement }));

    setPlatformMetrics(prev => {
      const current = { ...(prev[name] ?? {}) } as Record<Platform, ApiPlatformMetrics>;
      const platformEntries = profile.platforms ? Object.entries(profile.platforms) as [Platform, { metrics: ApiPlatformMetrics; posts?: Post[] }][] : [];
      for (const [platformKey, platformData] of platformEntries) {
        if (platformData?.metrics) {
          current[platformKey] = platformData.metrics;
        }
      }
      return { ...prev, [name]: current };
    });

    setPosts(prev => {
      const current = { ...(prev[name] ?? {}) } as Record<Platform, Post[]>;
      const platformEntries = profile.platforms ? Object.entries(profile.platforms) as [Platform, { posts?: Post[] }][] : [];
      for (const [platformKey, platformData] of platformEntries) {
        if (platformData?.posts) {
          current[platformKey] = platformData.posts;
        }
      }
      return { ...prev, [name]: current };
    });
  }, []);

  const loadProfile = useCallback(async (name: string, platform: Platform, handle: string) => {
    const normalizedHandle = handle.replace(/^@+/, "").trim();
    if (!normalizedHandle) return;

    setLoading(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: null }));

    try {
      const profile = await fetchInfluencerProfile({ platform, handle: normalizedHandle });
      applyProfile(name, profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to fetch influencer data";
      setErrors(prev => ({ ...prev, [name]: message }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  }, [applyProfile]);

  const addOrLinkInfluencer = useCallback(async ({ platform, handle, displayName }: { platform:Platform; handle:string; displayName?:string }) => {
    const trimmed = handle.trim();
    const sanitized = trimmed.replace(/^@+/, "");
    if (!sanitized) return;
    const handleWithAt = `@${sanitized}`;
    const baseName = displayName?.trim() || titleCaseFromHandle(handleWithAt);

    let finalName = baseName;
    setEntities(prev => {
      const match = prev.find(e => e.name.toLowerCase() === baseName.toLowerCase());
      if (match) {
        finalName = match.name;
        return prev.map(entity => entity.name === match.name ? ({
          ...entity,
          accounts: {
            ...entity.accounts,
            [platform]: { handle: handleWithAt, displayName: baseName },
          },
        }) : entity);
      }
      return [...prev, {
        name: baseName,
        accounts: {
          [platform]: { handle: handleWithAt, displayName: baseName },
        },
      }];
    });

    setSelected(prev => prev.includes(finalName) ? prev : [...prev, finalName]);

    await loadProfile(finalName, platform, sanitized);
  }, [loadProfile]);

  const refreshInfluencer = useCallback(async (name: string) => {
    const entity = entities.find(e => e.name === name);
    if (!entity) return;
    for (const platform of platforms) {
      const handle = entity.accounts[platform]?.handle?.replace(/^@+/, "");
      if (handle) {
        await loadProfile(name, platform, handle);
        break;
      }
    }
  }, [entities, loadProfile]);

  const value: AppState = {
    entities,
    selected,
    setSelected,
    toggleEntity,
    addOrLinkInfluencer,
    refreshInfluencer,
    growth,
    engagement,
    platformMetrics,
    posts,
    loading,
    errors,
  };
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

const Stat = ({ label, value, trend }:{ label:string; value:string; trend?:number }) => (
  <Card className="rounded-2xl shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent className="pt-0 flex items-end justify-between gap-2">
      <span className="text-3xl font-semibold">{value}</span>
      {typeof trend === "number" && (
        <Badge variant={trend>=0?"default":"destructive"} className="flex items-center gap-1 text-xs">
          {trend>=0? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownRight className="h-4 w-4"/>} {trend}%
        </Badge>
      )}
    </CardContent>
  </Card>
);

const SectionTitle = ({ icon:Icon, title, actions }:{ icon:any; title:string; actions?:React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center"><Icon className="h-4 w-4"/></div>
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
);

function ChatBubble(){
  return (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>);
}

function EntityChips(){
  const { entities, selected, toggleEntity } = useAppState();
  return (
    <div className="flex flex-wrap gap-2">
      {entities.map(e => {
        const active = selected.includes(e.name);
        return (
          <button
            key={e.name}
            onClick={()=>toggleEntity(e.name)}
            className={`px-3 py-1 rounded-full border text-sm`}
            style={{ borderColor: solidColor(e.name), backgroundColor: active ? softColor(e.name, 0.18) : undefined }}
            aria-pressed={active}
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: solidColor(e.name) }} />
              {e.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AddInfluencerControl({ inline=false }:{ inline?:boolean }){
  const { addOrLinkInfluencer } = useAppState();
  const { t } = useTranslation();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [platform, setPlatform] = useState<Platform>(DEFAULT_SEARCH_PLATFORMS[0] ?? platformChoices[0].id);
  const [searchPlatforms, setSearchPlatforms] = useState<Platform[]>(() => [...DEFAULT_SEARCH_PLATFORMS]);
  const { results, issues, isLoading, error, hasQuery } = useInfluencerSearch({ platforms: searchPlatforms, query: handle, limit: 6 });
  const canSubmit = handle.trim().length > 0;
  const shouldShowSuggestions = hasQuery && (isLoading || results.length > 0 || issues.length > 0 || !!error);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedHandle = handle.trim().replace(/^@+/, "");
  const needsMoreCharacters = normalizedHandle.length > 0 && !hasQuery;

  const toggleSearchPlatform = useCallback((value: Platform) => {
    setSearchPlatforms((prev) => {
      if (prev.includes(value)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (!handle.trim()) return;
    setIsSubmitting(true);
    try {
      await addOrLinkInfluencer({ platform, handle, displayName });
      setHandle("");
      setDisplayName("");
    } finally {
      setIsSubmitting(false);
    }
  }, [addOrLinkInfluencer, platform, handle, displayName]);

  return (
    <div className={`flex ${inline?"items-center":"items-stretch"} gap-2 flex-wrap`}>
      <div className="flex grow min-w-[220px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{t("Réseaux interrogés")}</span>
          {platformChoices.map(({ id, label }) => {
            const value = id as Platform;
            const active = searchPlatforms.includes(value);
            const isLastActive = active && searchPlatforms.length === 1;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleSearchPlatform(value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                } ${isLastActive ? "cursor-not-allowed opacity-70" : ""}`}
                aria-pressed={active}
                aria-disabled={isLastActive}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
            value={handle}
            onChange={(e)=>setHandle(e.target.value)}
            placeholder={t("@handle (ex: @nom_sur_tiktok)")}
            className="pl-8"
          />
          {needsMoreCharacters && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Tapez au moins 2 caractères pour afficher des suggestions")}
            </p>
          )}
          {shouldShowSuggestions && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border bg-popover text-popover-foreground shadow-xl">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t("Suggestions d’influenceurs")}</span>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              </div>
              <div className="px-3">
                <Separator />
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {!isLoading && results.length === 0 && issues.length === 0 && !error && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">{t("Aucun résultat trouvé")}</div>
                )}
                {results.map(result => {
                  const initial = (result.name || result.handle || "?").trim().charAt(0).toUpperCase();
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(evt) => evt.preventDefault()}
                      onClick={() => {
                        if (result.handle) {
                          setHandle(result.handle);
                        }
                        setDisplayName(result.name);
                        setPlatform(result.platform);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border bg-background text-sm font-medium">
                        {result.avatar ? (
                          <img src={result.avatar} alt={result.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{initial || "?"}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium leading-tight">{result.name}</div>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          {result.handle && <span>{result.handle}</span>}
                          {result.handle && <span>•</span>}
                          <span>{getPlatformLabel(result.platform)}</span>
                        </div>
                        {result.note && (
                          <p className="mt-1 text-xs text-muted-foreground">{result.note}</p>
                        )}
                        {result.profileUrl && (
                          <a
                            href={result.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(evt) => evt.stopPropagation()}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline"
                          >
                            {t("Voir le profil")}
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-right text-xs leading-tight text-muted-foreground">
                        {typeof result.followers === "number" && (
                          <div>{result.followers.toLocaleString()} {t("Abonnés")}</div>
                        )}
                        {result.verified && <div>{t("Vérifié")}</div>}
                      </div>
                    </button>
                  );
                })}
                {issues.map((issue, index) => (
                  <div key={`${issue.platform}-${index}`} className="flex items-start gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" aria-hidden="true" />
                    <span>{issue.message}</span>
                  </div>
                ))}
                {error && (
                  <div className="px-3 py-2 text-sm text-destructive">{error}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <select className="rounded-xl border p-2" value={platform} onChange={(e)=>setPlatform(e.target.value as Platform)}>
        {platformChoices.map(({ id, label }) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
      <Input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder={t("Nom affiché (ex: Amelia)")} className="min-w-[180px]"/>
      <Button
        onClick={onSubmit}
        className="gap-2"
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4"/>}
        {t("Ajouter/Lier")}
      </Button>
    </div>
  );
}

function Dashboard(){
  const { selected, growth, engagement, platformMetrics, posts } = useAppState();
  const { t } = useTranslation();

  const engagementFormats = useMemo(() => {
    const formatSet = new Set<string>();
    selected.forEach(name => {
      Object.keys(engagement[name] ?? {}).forEach(fmt => formatSet.add(fmt));
    });
    if (formatSet.size === 0) {
      defaultEngagementFormats.forEach(fmt => formatSet.add(fmt));
    }
    return Array.from(formatSet);
  }, [selected, engagement]);

  const growthCombined = useMemo(()=> weeks.map((w, i)=>{ const row:any = { week:w }; selected.forEach(n=> row[n] = (growth[n]?.[i] ?? 0)); return row; }), [selected, growth]);
  const engagementCombined = useMemo(()=> engagementFormats.map(fmt=>{ const row:any = { name:fmt }; selected.forEach(n=> row[n] = (engagement[n]?.[fmt] ?? 0)); return row; }), [selected, engagement, engagementFormats]);

  const lastFollowersSum = selected.reduce((a,n)=> a + (growth[n]?.[weeks.length-1]||0), 0);
  const prevFollowersSum = selected.reduce((a,n)=> a + (growth[n]?.[weeks.length-2]||0), 0);
  const delta = lastFollowersSum - prevFollowersSum;
  const deltaPct = prevFollowersSum ? Math.round((delta/prevFollowersSum)*1000)/10 : 0;
  const posts7dTotal = selected.reduce((acc, name) => acc + platforms.reduce((s, pl)=> s + (platformMetrics[name]?.[pl]?.posts7d || 0), 0), 0);
  const topPosts = useMemo(() => {
    const combined: Post[] = [];
    selected.forEach(name => {
      const perPlatform = posts[name] ?? {};
      platforms.forEach(platform => {
        const list = perPlatform[platform];
        if (list?.length) {
          combined.push(...list);
        }
      });
    });
    return combined
      .slice()
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);
  }, [selected, posts]);
  const avgLikes = topPosts.length ? Math.round(topPosts.reduce((a,p)=>a+p.likes,0)/topPosts.length) : 0;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <SectionTitle icon={Users} title={t("Influenceurs à visualiser")} actions={<span className="text-xs text-muted-foreground">{t("Ajoute un @handle et lie-le à un nom")}</span>} />
        </CardHeader>
        <CardContent className="space-y-3">
          <AddInfluencerControl />
          <EntityChips />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label={t("Abonnés (sélection)")} value={lastFollowersSum.toLocaleString()} trend={deltaPct} />
        <Stat label={t("Δ hebdo (sélection)")} value={`${delta>0?"+":""}${delta.toLocaleString()}`} trend={deltaPct} />
        <Stat label={t("Posts (7j)")} value={posts7dTotal.toString()} />
        <Stat label={t("Likes moyens (10 posts)")} value={avgLikes.toLocaleString()} trend={1.2} />
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <SectionTitle icon={LineIcon} title={t("Évolution des abonnés (12 semaines)")} actions={<div className="flex items-center gap-2"><Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2"/>{t("12 sem.")}</Button><Button size="sm" className="gap-2"><Download className="h-4 w-4"/>{t("Exporter")}</Button></div>} />
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthCombined} margin={{ left:8, right:8 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="week"/>
                <YAxis/>
                <Tooltip/>
                <Legend/>
                {selected.map(n => <Line key={n} type="monotone" dataKey={n} dot={false} stroke={solidColor(n)}/>) }
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-md lg:col-span-1">
          <CardHeader><SectionTitle icon={BarChart2} title={t("Engagement moyen par format (sélection)")}/></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementCombined} margin={{ left:8, right:8 }}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="name"/>
                  <YAxis unit="%"/>
                  <Tooltip/>
                  <Legend/>
                  {selected.map(n => <Bar key={n} dataKey={n} fill={solidColor(n)}/>) }
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-md lg:col-span-2">
          <CardHeader>
            <SectionTitle icon={Trophy} title={t("Top posts récents")} actions={<Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4"/>{t("Filtrer")}</Button>}/>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t("Ajoute au moins un influenceur dans le Dashboard ou ici.")}
                </div>
              ) : (
                topPosts.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <Badge className="rounded-full">{p.platform}</Badge>
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1"><Star className="h-4 w-4"/> {p.likes.toLocaleString()}</div>
                      <div className="flex items-center gap-1"><ChatBubble/> {p.comments.toLocaleString()}</div>
                      <Button variant="ghost" size="sm" className="gap-2"><Share2 className="h-4 w-4"/>{t("Partager")}</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfluencerDetail(){
  const { entities, growth, engagement, platformMetrics, posts, loading, errors, refreshInfluencer } = useAppState();
  const { t } = useTranslation();
  const [selectedName, setSelectedName] = useState(entities[0]?.name || "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<Platform, boolean>>(
    () => Object.fromEntries(platforms.map((pl) => [pl, true])) as Record<Platform, boolean>,
  );
  useEffect(() => {
    if (!entities.length) {
      setSelectedName("");
      return;
    }
    if (!selectedName || !entities.some(e => e.name === selectedName)) {
      setSelectedName(entities[0]?.name || "");
    }
  }, [entities, selectedName]);

  const entity = entities.find(e => e.name===selectedName);
  const isLoading = selectedName ? !!loading[selectedName] : false;
  const errorMessage = selectedName ? errors[selectedName] : null;
  const onRefresh = useCallback(() => {
    if (selectedName) {
      refreshInfluencer(selectedName);
    }
  }, [refreshInfluencer, selectedName]);

  const followersLast = growth[selectedName]?.[weeks.length-1] || 0;
  const followersPrev = growth[selectedName]?.[weeks.length-2] || 0;
  const delta = followersLast - followersPrev;
  const deltaPct = followersPrev ? Math.round((delta/followersPrev)*1000)/10 : 0;
  const engagementAvg = (()=>{ const m = engagement[selectedName] || { Photo:0, Vidéo:0, Story:0, Live:0 }; const vals = Object.values(m); return vals.length? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : 0; })();

  const postsCount = platforms.reduce((acc, pl)=> acc + (selectedPlatforms[pl] ? (platformMetrics[selectedName]?.[pl]?.posts7d || 0) : 0), 0);

  if (!entity) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-md">
          <CardHeader><SectionTitle icon={Users} title={t("Sélection")} /></CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("Ajoute au moins un influenceur dans le Dashboard ou ici.")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader><SectionTitle icon={Users} title={t("Sélection")} actions={selectedName ? <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={isLoading}><RefreshCcw className="h-4 w-4"/>{t("Actualiser")}</Button> : null}/></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t("Influenceur")}</Label>
              <select className="mt-2 w-full rounded-xl border p-2" value={selectedName} onChange={(e)=>setSelectedName(e.target.value)}>
                {entities.map(e => (
                  <option key={e.name} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>{t("Réseaux sociaux")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {platforms.map(pl => (
                  <label key={pl} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!selectedPlatforms[pl]} onChange={()=>setSelectedPlatforms(prev => ({...prev, [pl]: !prev[pl]}))}/>
                    {getPlatformLabel(pl)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("Chargement des données en cours...")}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md">
        <CardHeader><CardTitle className="text-base">{t("Alias / handles par réseau")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          {platforms.map(pl => {
            const acct = entity?.accounts[pl];
            return (
              <div key={pl} className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">{getPlatformLabel(pl)}</div>
                <div className="font-medium">{acct?.displayName || entity?.name}</div>
                <div className="text-muted-foreground">{acct?.handle || "—"}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label={t("Abonnés")} value={followersLast.toLocaleString()} trend={deltaPct} />
        <Stat label={t("Δ hebdo")} value={`${delta>0?"+":""}${delta.toLocaleString()}`} trend={deltaPct} />
        <Stat label={t("Posts (7j)")} value={postsCount.toString()} />
        <Stat label={t("Engagement moyen")} value={`${engagementAvg}%`} trend={0.4} />
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader><SectionTitle icon={LineIcon} title={`${t("Évolution (12 semaines)")} — ${selectedName}`}/></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks.map((w,i)=>({ week:w, followers: growth[selectedName]?.[i] || 0 }))} margin={{ left:8, right:8 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="week"/>
                <YAxis/>
                <Tooltip/>
                <Line type="monotone" dataKey="followers" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {platforms.filter(pl => selectedPlatforms[pl]).map(pl => {
          const list = posts[selectedName]?.[pl] || [];
          return (
            <Card key={pl} className="rounded-2xl shadow-md">
              <CardHeader><SectionTitle icon={Trophy} title={`${t("10 derniers posts")} — ${getPlatformLabel(pl)}`}/></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.slice(0,10).map(p => (
                    <div key={p.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <Badge className="rounded-full">{getPlatformLabel(pl)}</Badge>
                        <div className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString()}</div>
                      </div>
                      <div className="mt-2 font-medium line-clamp-2">{p.title}</div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1"><Star className="h-4 w-4"/> {p.likes.toLocaleString()}</div>
                        <div className="flex items-center gap-1"><ChatBubble/> {p.comments.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Compare(){
  const { entities, selected, platformMetrics } = useAppState();
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<"all"|Platform>("all");

  const rows = useMemo(()=>{
    if (selected.length===0) return [] as { name:string; followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number; score:number }[];
    if (platform === "all"){
      return selected.map(name => {
        const pm = platformMetrics[name];
        const followers = platforms.reduce((a,pl)=>a + (pm?.[pl]?.followers ?? 0), 0);
        const weeklyDelta = Math.round((platforms.reduce((a,pl)=>a + (pm?.[pl]?.weeklyDelta ?? 0), 0)/platforms.length)*10)/10;
        const avgEngagement = Math.round((platforms.reduce((a,pl)=>a + (pm?.[pl]?.avgEngagement ?? 0), 0)/platforms.length)*10)/10;
        const posts7d = platforms.reduce((a,pl)=>a + (pm?.[pl]?.posts7d ?? 0), 0);
        return { name, followers, weeklyDelta, avgEngagement, posts7d };
      }).map(c=>({ ...c, score: score(c) })).sort((a,b)=>b.score-a.score);
    }
    return selected.map(name => {
      const pm = platformMetrics[name]?.[platform];
      return { name, followers: pm?.followers ?? 0, weeklyDelta: pm?.weeklyDelta ?? 0, avgEngagement: pm?.avgEngagement ?? 0, posts7d: pm?.posts7d ?? 0 };
    }).map(c=>({ ...c, score: score(c) })).sort((a,b)=>b.score - a.score);
  }, [platform, selected, platformMetrics]);

  const top = rows[0];

  const handleFor = (name:string, pl:Platform) => {
    const e = entities.find(x=>x.name===name);
    return e?.accounts[pl]?.handle || "";
  };

  const platformFilters: { value: "all" | Platform; label: string }[] = [
    { value: "all", label: t("Tous") },
    ...platforms.map((pl) => ({ value: pl, label: getPlatformLabel(pl) })),
  ];
  const followersHeader = platform === "all"
    ? `${t("Abonnés")} (${t("Tous")})`
    : `${t("Abonnés")} (${getPlatformLabel(platform)})`;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader><SectionTitle icon={Users} title={t("Ajouter / lier des comptes (par @handle)")}/></CardHeader>
        <CardContent><AddInfluencerControl inline/></CardContent>
      </Card>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{t("Comparateur (par réseau social)")}</h3>
          <p className="text-sm text-muted-foreground">{t("Croissance 40% · Engagement 40% · Volume 20%")}</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="outline" className="gap-2"><Download className="h-4 w-4"/>{t("Exporter")}</Button></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {platformFilters.map(option => (
          <button key={option.value} onClick={()=>setPlatform(option.value)} className={`px-3 py-1 rounded-full border text-sm ${platform===option.value?"bg-primary text-primary-foreground":"bg-background"}`}>{option.label}</button>
        ))}
      </div>

      {rows.length>0 && (
        <div className="flex flex-wrap gap-2">
          {rows.map(r => (
            <span key={`legend-${r.name}`} className="inline-flex items-center gap-2 px-2 py-1 rounded-full border" style={{ borderColor: solidColor(r.name), backgroundColor: softColor(r.name, 0.12) }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: solidColor(r.name) }} />
              <span className="text-sm">{r.name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-auto rounded-2xl border">
        {rows.length===0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("Ajoute au moins un influenceur dans le Dashboard ou ici.")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">{t("Influenceur")}</th>
                <th className="text-left p-3">{followersHeader}</th>
                <th className="text-left p-3">{t("Δ hebdo")}</th>
                <th className="text-left p-3">{t("Engagement moyen")}</th>
                <th className="text-left p-3">{t("Posts (7j)")}</th>
                <th className="text-left p-3">{t("Score")}</th>
                <th className="text-left p-3">{t("Conseil")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-t" style={{ backgroundColor: softColor(r.name, 0.06) }}>
                  <td className="p-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: solidColor(r.name) }} />
                      {platform === "all" ? r.name : (<span>{r.name} <span className="text-muted-foreground">({handleFor(r.name, platform)})</span></span>)}
                    </span>
                  </td>
                  <td className="p-3">{r.followers.toLocaleString()}</td>
                  <td className="p-3 flex items-center gap-1">{r.weeklyDelta}% {r.weeklyDelta>=0? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownRight className="h-4 w-4"/>}</td>
                  <td className="p-3">{r.avgEngagement}%</td>
                  <td className="p-3">{r.posts7d}</td>
                  <td className="p-3 font-semibold">{r.score}</td>
                  <td className="p-3">{top && r.name===top.name ? (<Badge className="bg-emerald-500 hover:bg-emerald-500">{t("Recommandé")}</Badge>) : (<Badge variant="outline">{t("OK")}</Badge>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Reports(){
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <SectionTitle icon={FileText} title={t("Rapports automatiques")} actions={<Button className="gap-2"><FileText className="h-4 w-4"/>{t("Générer un PDF (démo)")}</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Hebdomadaire","Mensuel","Comparatif"].map(type => (
          <Card key={type} className="rounded-2xl shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4"/>{t(type)}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">{t("Modèle marque blanche incluant sommaire, KPIs, graphiques, top posts.")}</div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2"><FileSpreadsheet className="h-4 w-4"/>{t("Exporter Excel")}</Button>
                <Button className="gap-2"><Download className="h-4 w-4"/>{t("Télécharger PDF")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Alerts(){
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Bell} title={t("Notifications & alertes")} />
        <div className="flex items-center gap-2"><Label htmlFor="push">{t("Notifications push")}</Label><Switch id="push" defaultChecked/></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>{t("Perte d’abonnés")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("Seuil (Δ hebdo)")}</Label><Input defaultValue={-2} type="number"/></div>
              <div><Label>{t("Destinataires")}</Label><Input defaultValue="marketing@exemple.com"/></div>
            </div>
            <Button className="w-full">{t("Enregistrer")}</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/>{t("Post performant")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("Quantile")}</Label><Input defaultValue={90} type="number"/></div>
              <div><Label>{t("Fenêtre (h)")}</Label><Input defaultValue={24} type="number"/></div>
            </div>
            <Button className="w-full">{t("Enregistrer")}</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4"/>{t("Baisse d’engagement")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{t("Quantile de référence")}</Label><Input defaultValue={25} type="number"/></div>
            <div><Label>{t("Période (sem.)")}</Label><Input defaultValue={8} type="number"/></div>
            <div><Label>{t("Destinataires")}</Label><Input defaultValue="ops@exemple.com"/></div>
          </div>
          <Button className="w-full">{t("Enregistrer")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AppShell(){
  const { t } = useTranslation();
  const { theme, toggleTheme, toggleLanguage, language } = usePreferences();
  const [active, setActive] = useState("dashboard");
  const isDark = theme === "dark";
  const languageLabel = language === "fr" ? "FR → EN" : "EN → FR";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500" />
              <div>
                <div className="text-xl font-semibold">{t("InfluenceTrack")}</div>
                <div className="text-xs text-muted-foreground">{t("MVP • Alias par réseau • Maquettes interactives")}</div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:items-center md:gap-3 w-full md:w-auto">
              <AddInfluencerControl inline/>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={toggleTheme} aria-label={isDark ? t("Mode clair") : t("Mode sombre")}>
                  {isDark ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
                  {isDark ? t("Mode clair") : t("Mode sombre")}
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={toggleLanguage} aria-label={t("Langue")}>
                  <Languages className="h-4 w-4"/>
                  {languageLabel}
                </Button>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4"/>{t("Exporter")}</Button>
                <Button variant="outline" size="sm" className="gap-2"><Bell className="h-4 w-4"/>{t("Notifications")}</Button>
              </div>
            </div>
          </div>
          <Separator/>
          <div className="p-4 md:p-6">
            <Tabs value={active} onValueChange={setActive}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="dashboard">{t("Dashboard")}</TabsTrigger>
                <TabsTrigger value="detail">{t("Détail influenceur")}</TabsTrigger>
                <TabsTrigger value="compare">{t("Comparateur")}</TabsTrigger>
                <TabsTrigger value="reports">{t("Rapports")}</TabsTrigger>
                <TabsTrigger value="alerts">{t("Alertes")}</TabsTrigger>
              </TabsList>
              <div className="mt-6"/>
              <TabsContent value="dashboard"><Dashboard/></TabsContent>
              <TabsContent value="detail"><InfluencerDetail/></TabsContent>
              <TabsContent value="compare"><Compare/></TabsContent>
              <TabsContent value="reports"><Reports/></TabsContent>
              <TabsContent value="alerts"><Alerts/></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  return (
    <PreferencesProvider>
      <AppStateProvider>
        <AppShell/>
      </AppStateProvider>
    </PreferencesProvider>
  );
}
