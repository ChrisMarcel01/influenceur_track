import React, { useMemo, useState, useContext, createContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
const engagementFormats = ["Photo", "Vidéo", "Story", "Live"] as const;
const platforms = ["Instagram", "TikTok", "YouTube", "X"] as const;

type Platform = typeof platforms[number];

type PlatformAccount = { handle: string; displayName?: string };

type InfluencerMeta = {
  name: string;
  accounts: Partial<Record<Platform, PlatformAccount>>;
};

type Post = { id: string; platform: Platform; title: string; likes: number; comments: number; date: string };

function seedFrom(s: string) { let v = 1; for (let i=0;i<s.length;i++) v = (v*31 + s.charCodeAt(i)) % 1_000_003; return v; }
function rand(seed: number) { let _s = seed; return (min=0, max=1) => { _s = (_s*1103515245 + 12345) % 2147483648; const t = _s/2147483648; return min + t*(max-min); }; }

function pad2(n:number){ return n<10?`0${n}`:`${n}`; }
function dateMinusDays(days:number){ const d = new Date(); d.setDate(d.getDate()-days); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

function generatePosts(rf:(a?:number,b?:number)=>number, baseHandle:string): Record<Platform, Post[]>{
  const titlesIG = ["Unboxing", "OOTD", "Behind the scene", "Collab", "Giveaway", "Routine", "Sneak peek", "Drop", "Q&A", "Lookbook"];
  const titlesTT = ["Dance", "GRWM", "Trend", "Lifehack", "Storytime", "Before/After", "Challenge", "Mini vlog", "Recipe", "Tutorial"];
  const titlesYT = ["VLOG", "Review", "How-To", "Podcast", "Travel", "Live replay", "Interview", "Top 10", "Haul", "Collab"];
  const titlesX  = ["Teaser", "Thread", "Poll", "Hot take", "Event", "Shoutout", "AMA", "Launch", "Update", "Recap"];
  const build = (platform:Platform, pool:string[]): Post[] => Array.from({length:10}).map((_,i)=>{
    const likes = Math.round(rf(800, 30000));
    const comments = Math.round(rf(30, 1200));
    const title = `${pool[i%pool.length]} ${i+1}`;
    return { id: `${platform}-${baseHandle}-${i}`, platform, title, likes, comments, date: dateMinusDays(i*2 + Math.round(rf(0,2))) };
  });
  return {
    Instagram: build("Instagram", titlesIG),
    TikTok: build("TikTok", titlesTT),
    YouTube: build("YouTube", titlesYT),
    X: build("X", titlesX),
  };
}

function generateInfluencerData(keyHandle: string) {
  const r = rand(seedFrom(keyHandle));
  const base = Math.round(r(30000, 90000));
  const inc = Math.round(r(800, 2000));
  const series = weeks.map((_, i) => base + i*inc + Math.round((i%3)*r(300, 900)));
  const engagement: Record<string, number> = {
    Photo: Math.round(r(1.2, 4.5)*10)/10,
    Vidéo: Math.round(r(2.0, 6.0)*10)/10,
    Story: Math.round(r(0.8, 2.5)*10)/10,
    Live: Math.round(r(1.5, 4.0)*10)/10,
  };
  const ratios = [r(0.2, 0.5), r(0.1, 0.4), r(0.05, 0.25), r(0.05, 0.2)];
  const sum = ratios.reduce((a,b)=>a+b,0);
  const last = series[series.length-1];
  const mk = (f:number, d1:number, d2:number, p1:number, p2:number) => ({ followers: Math.round(last*f), weeklyDelta: Math.round(r(d1, d2)*10)/10, avgEngagement: Math.round(r(p1, p2)*10)/10, posts7d: Math.round(r(0, 4)) });
  return {
    series,
    engagement,
    platform: {
      Instagram: mk(ratios[0]/sum, 0.6, 4.8, 2.0, 6.0),
      TikTok:    mk(ratios[1]/sum, 0.6, 4.8, 2.5, 6.0),
      YouTube:   mk(ratios[2]/sum, 0.4, 2.0, 1.0, 3.0),
      X:         mk(ratios[3]/sum, 0.2, 1.5, 0.8, 2.0),
    } as Record<Platform, { followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number }>,
    posts: generatePosts(r, keyHandle)
  };
}

const initialEntities: InfluencerMeta[] = [
  { name: "Amelia", accounts: { Instagram: { handle: "@amelia" }, TikTok: { handle: "@amelia" }, YouTube: { handle: "@amelia" }, X: { handle: "@amelia" } } },
  { name: "Nathan", accounts: { Instagram: { handle: "@nathan" }, TikTok: { handle: "@nathan" }, YouTube: { handle: "@nathan" }, X: { handle: "@nathan" } } },
  { name: "Leah",   accounts: { Instagram: { handle: "@leah" }, TikTok: { handle: "@leah" }, YouTube: { handle: "@leah" }, X: { handle: "@leah" } } },
  { name: "Sasha",  accounts: { Instagram: { handle: "@sasha" }, TikTok: { handle: "@sasha" }, YouTube: { handle: "@sasha" }, X: { handle: "@sasha" } } },
  { name: "Iris",   accounts: { Instagram: { handle: "@iris_ig" }, TikTok: { handle: "@iris" }, YouTube: { handle: "@iris" }, X: { handle: "@iris" } } },
  { name: "Victor", accounts: { Instagram: { handle: "@victor" }, TikTok: { handle: "@victor" }, YouTube: { handle: "@victor" }, X: { handle: "@victor" } } },
];

const initialGrowth: Record<string, number[]> = {};
const initialEngagement: Record<string, Record<string, number>> = {};
const initialPlatformMetrics: Record<string, Record<Platform, { followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number }>> = {};
const initialPosts: Record<string, Record<Platform, Post[]>> = {};
for (const e of initialEntities) {
  const anyAccount = e.accounts.Instagram?.handle || Object.values(e.accounts)[0]?.handle || e.name;
  const d = generateInfluencerData(anyAccount);
  initialGrowth[e.name] = d.series;
  initialEngagement[e.name] = d.engagement;
  initialPlatformMetrics[e.name] = d.platform;
  initialPosts[e.name] = d.posts;
}

if (initialPlatformMetrics["Iris"]) {
  initialPlatformMetrics["Iris"].Instagram.posts7d = 12;
  initialPlatformMetrics["Iris"].Instagram.avgEngagement = Math.max(initialPlatformMetrics["Iris"].Instagram.avgEngagement, 4.5);
}
if (initialGrowth["Victor"]) {
  const volSeries = weeks.map((_, i) => {
    const base = 55000 + i*300;
    const wave = Math.round(7000 * Math.sin(i * 0.9));
    const noise = (i % 2 === 0 ? 2500 : -3000);
    return Math.max(10000, base + wave + noise);
  });
  initialGrowth["Victor"] = volSeries;
  if (initialPlatformMetrics["Victor"]) {
    initialPlatformMetrics["Victor"].Instagram.weeklyDelta = -1.2;
    initialPlatformMetrics["Victor"].TikTok.weeklyDelta = 3.5;
    initialPlatformMetrics["Victor"].YouTube.weeklyDelta = -0.8;
    initialPlatformMetrics["Victor"].X.weeklyDelta = 0.5;
  }
}

const topPosts = [
  { id: "1", platform: "Instagram", title: "Giveaway Back-to-school", likes: 12840, comments: 640, date: "2025-09-01" },
  { id: "2", platform: "TikTok", title: "GRWM – Routine de rentrée", likes: 22450, comments: 1020, date: "2025-09-03" },
  { id: "3", platform: "YouTube", title: "VLOG Paris Fashion Week", likes: 18430, comments: 320, date: "2025-09-05" },
  { id: "4", platform: "X", title: "Teaser collab ✨", likes: 6200, comments: 180, date: "2025-09-07" },
  { id: "5", platform: "Instagram", title: "Unboxing nouvelle gamme", likes: 15210, comments: 410, date: "2025-09-09" },
];

function score({ weeklyDelta, avgEngagement, posts7d }:{ weeklyDelta:number; avgEngagement:number; posts7d:number }){
  const growth = Math.min(Math.max((weeklyDelta + 5)/10, 0), 1);
  const engage = Math.min(avgEngagement/6, 1);
  const volume = Math.min(posts7d/7, 1);
  return Math.round((0.4*growth + 0.4*engage + 0.2*volume)*100);
}

const solidColor = (name:string) => { let h=0; for(let i=0;i<name.length;i++){ h=(h*31+name.charCodeAt(i))>>>0; } h%=360; return `hsl(${h}, 70%, 50%)`; };
const softColor = (name:string, a=0.08) => { let h=0; for(let i=0;i<name.length;i++){ h=(h*31+name.charCodeAt(i))>>>0; } h%=360; return `hsla(${h}, 70%, 50%, ${a})`; };

interface AppState {
  entities: InfluencerMeta[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  toggleEntity: (name: string) => void;
  addOrLinkInfluencer: (params: { platform: Platform; handle: string; displayName?: string }) => void;
  growth: Record<string, number[]>;
  engagement: Record<string, Record<string, number>>;
  platformMetrics: Record<string, Record<Platform, { followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number }>>;
  posts: Record<string, Record<Platform, Post[]>>;
}

const AppStateContext = createContext<AppState | null>(null);
function useAppState(){ const ctx = useContext(AppStateContext); if(!ctx) throw new Error("AppStateContext missing"); return ctx; }

function titleCaseFromHandle(cleanHandle: string){
  const raw = cleanHandle.replace(/^@/, "");
  const spaced = raw.replace(/[_\.\-]+/g, " ");
  return spaced.split(" ").filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

function AppStateProvider({ children }:{ children:React.ReactNode }){
  const [entities, setEntities] = useState<InfluencerMeta[]>(initialEntities);
  const [selected, setSelected] = useState<string[]>(["Amelia", "Nathan"]);
  const [growth, setGrowth] = useState<Record<string, number[]>>({...initialGrowth});
  const [engagement, setEngagement] = useState<Record<string, Record<string, number>>>({...initialEngagement});
  const [platformMetrics, setPlatformMetrics] = useState<Record<string, Record<Platform, { followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number }>>>({...initialPlatformMetrics});
  const [posts, setPosts] = useState<Record<string, Record<Platform, Post[]>>>({
    ...initialPosts,
    Iris: { ...initialPosts["Iris"], Instagram: initialPosts["Iris"]?.Instagram?.map((p,i)=>({ ...p, title: p.title, likes: p.likes, comments: p.comments })) }
  });

  const toggleEntity = (name:string) => setSelected(prev => prev.includes(name)? prev.filter(n=>n!==name) : [...prev, name]);

  const addOrLinkInfluencer = ({ platform, handle, displayName }: { platform:Platform; handle:string; displayName?:string }) => {
    const cleanHandle = handle.trim().replace(/^@*/, "@");
    const name = (displayName && displayName.trim()) || titleCaseFromHandle(cleanHandle);

    const exists = entities.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (exists){
      const updated = entities.map(e => e.name===exists.name ? ({ ...e, accounts: { ...e.accounts, [platform]: { handle: cleanHandle, displayName: name }}}) : e);
      setEntities(updated);
      if (!selected.includes(exists.name)) setSelected(prev=>[...prev, exists.name]);
      return;
    }

    const d = generateInfluencerData(cleanHandle);
    const newEntity: InfluencerMeta = { name, accounts: { [platform]: { handle: cleanHandle, displayName: name } } };
    setEntities(prev => [...prev, newEntity]);
    setGrowth(prev => ({ ...prev, [name]: d.series }));
    setEngagement(prev => ({ ...prev, [name]: d.engagement }));
    setPlatformMetrics(prev => ({ ...prev, [name]: d.platform }));
    setPosts(prev => ({ ...prev, [name]: d.posts }));
    setSelected(prev => [...prev, name]);
  };

  const value: AppState = { entities, selected, setSelected, toggleEntity, addOrLinkInfluencer, growth, engagement, platformMetrics, posts };
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
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  return (
    <div className={`flex ${inline?"items-center":"items-stretch"} gap-2 flex-wrap`}>
      <div className="relative grow min-w-[220px]">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input value={handle} onChange={(e)=>setHandle(e.target.value)} placeholder="@handle (ex: @nom_sur_tiktok)" className="pl-8"/>
      </div>
      <select className="rounded-xl border p-2" value={platform} onChange={(e)=>setPlatform(e.target.value as Platform)}>
        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <Input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Nom affiché (ex: Amelia)" className="min-w-[180px]"/>
      <Button onClick={()=>{ if(handle.trim()){ addOrLinkInfluencer({ platform, handle, displayName }); setHandle(""); } }} className="gap-2"><Plus className="h-4 w-4"/>Ajouter/Lier</Button>
    </div>
  );
}

function Dashboard(){
  const { selected, growth, engagement, platformMetrics } = useAppState();

  const growthCombined = useMemo(()=> weeks.map((w, i)=>{ const row:any = { week:w }; selected.forEach(n=> row[n] = (growth[n]?.[i] ?? 0)); return row; }), [selected, growth]);
  const engagementCombined = useMemo(()=> engagementFormats.map(fmt=>{ const row:any = { name:fmt }; selected.forEach(n=> row[n] = (engagement[n]?.[fmt] ?? 0)); return row; }), [selected, engagement]);

  const lastFollowersSum = selected.reduce((a,n)=> a + (growth[n]?.[weeks.length-1]||0), 0);
  const prevFollowersSum = selected.reduce((a,n)=> a + (growth[n]?.[weeks.length-2]||0), 0);
  const delta = lastFollowersSum - prevFollowersSum;
  const deltaPct = prevFollowersSum ? Math.round((delta/prevFollowersSum)*1000)/10 : 0;
  const posts7dTotal = selected.reduce((acc, name) => acc + platforms.reduce((s, pl)=> s + (platformMetrics[name]?.[pl]?.posts7d || 0), 0), 0);
  const avgLikes = Math.round(topPosts.reduce((a,p)=>a+p.likes,0)/topPosts.length);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <SectionTitle icon={Users} title="Influenceurs à visualiser" actions={<span className="text-xs text-muted-foreground">Ajoute un @handle et lie-le à un nom</span>} />
        </CardHeader>
        <CardContent className="space-y-3">
          <AddInfluencerControl />
          <EntityChips />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Abonnés (sélection)" value={lastFollowersSum.toLocaleString()} trend={deltaPct} />
        <Stat label="Δ hebdo (sélection)" value={`${delta>0?"+":""}${delta.toLocaleString()}`} trend={deltaPct} />
        <Stat label="Posts (7j)" value={posts7dTotal.toString()} />
        <Stat label="Likes moyens (10 posts)" value={avgLikes.toLocaleString()} trend={1.2} />
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <SectionTitle icon={LineIcon} title="Évolution des abonnés (12 semaines)" actions={<div className="flex items-center gap-2"><Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2"/>12 sem.</Button><Button size="sm" className="gap-2"><Download className="h-4 w-4"/>Exporter</Button></div>} />
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
          <CardHeader><SectionTitle icon={BarChart2} title="Engagement moyen par format (sélection)"/></CardHeader>
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
            <SectionTitle icon={Trophy} title="Top posts récents" actions={<Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4"/>Filtrer</Button>}/>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPosts.map(p => (
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
                    <Button variant="ghost" size="sm" className="gap-2"><Share2 className="h-4 w-4"/>Partager</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfluencerDetail(){
  const { entities, growth, engagement, platformMetrics, posts } = useAppState();
  const [selectedName, setSelectedName] = useState(entities[0]?.name || "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<Platform, boolean>>({ Instagram:true, TikTok:true, YouTube:true, X:true });
  const entity = entities.find(e => e.name===selectedName);

  const followersLast = growth[selectedName]?.[weeks.length-1] || 0;
  const followersPrev = growth[selectedName]?.[weeks.length-2] || 0;
  const delta = followersLast - followersPrev;
  const deltaPct = followersPrev ? Math.round((delta/followersPrev)*1000)/10 : 0;
  const engagementAvg = (()=>{ const m = engagement[selectedName] || { Photo:0, Vidéo:0, Story:0, Live:0 }; const vals = Object.values(m); return vals.length? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : 0; })();

  const postsCount = platforms.reduce((acc, pl)=> acc + (selectedPlatforms[pl] ? (platformMetrics[selectedName]?.[pl]?.posts7d || 0) : 0), 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader><SectionTitle icon={Users} title="Sélection"/></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Influenceur</Label>
              <select className="mt-2 w-full rounded-xl border p-2" value={selectedName} onChange={(e)=>setSelectedName(e.target.value)}>
                {entities.map(e => (
                  <option key={e.name} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Réseaux sociaux</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {platforms.map(pl => (
                  <label key={pl} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!selectedPlatforms[pl]} onChange={()=>setSelectedPlatforms(prev => ({...prev, [pl]: !prev[pl]}))}/>
                    {pl}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md">
        <CardHeader><CardTitle className="text-base">Alias / handles par réseau</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          {platforms.map(pl => {
            const acct = entity?.accounts[pl];
            return (
              <div key={pl} className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">{pl}</div>
                <div className="font-medium">{acct?.displayName || entity?.name}</div>
                <div className="text-muted-foreground">{acct?.handle || "—"}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Abonnés" value={followersLast.toLocaleString()} trend={deltaPct} />
        <Stat label="Δ hebdo" value={`${delta>0?"+":""}${delta.toLocaleString()}`} trend={deltaPct} />
        <Stat label="Posts (7j)" value={postsCount.toString()} />
        <Stat label="Engagement moyen" value={`${engagementAvg}%`} trend={0.4} />
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader><SectionTitle icon={LineIcon} title={`Évolution (12 semaines) — ${selectedName}`}/></CardHeader>
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
              <CardHeader><SectionTitle icon={Trophy} title={`10 derniers posts — ${pl}`}/></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.slice(0,10).map(p => (
                    <div key={p.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <Badge className="rounded-full">{pl}</Badge>
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
  const [platform, setPlatform] = useState<"Tous"|Platform>("Tous");

  const rows = useMemo(()=>{
    if (selected.length===0) return [] as { name:string; followers:number; weeklyDelta:number; avgEngagement:number; posts7d:number; score:number }[];
    if (platform === "Tous"){
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

  const platformOptions: ("Tous" | Platform)[] = ["Tous", ...platforms];

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader><SectionTitle icon={Users} title="Ajouter / lier des comptes (par @handle)"/></CardHeader>
        <CardContent><AddInfluencerControl inline/></CardContent>
      </Card>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Comparateur (par réseau social)</h3>
          <p className="text-sm text-muted-foreground">Croissance 40% · Engagement 40% · Volume 20%</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="outline" className="gap-2"><Download className="h-4 w-4"/>Exporter</Button></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {platformOptions.map(pl => (
          <button key={pl} onClick={()=>setPlatform(pl)} className={`px-3 py-1 rounded-full border text-sm ${platform===pl?"bg-primary text-primary-foreground":"bg-background"}`}>{pl}</button>
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
          <div className="p-6 text-sm text-muted-foreground">Ajoute au moins un influenceur dans le Dashboard ou ici.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Influenceur</th>
                <th className="text-left p-3">Abonnés{platform!=="Tous"?` (${platform})`:" (total)"}</th>
                <th className="text-left p-3">Δ hebdo</th>
                <th className="text-left p-3">Engagement moyen</th>
                <th className="text-left p-3">Posts (7j)</th>
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">Conseil</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-t" style={{ backgroundColor: softColor(r.name, 0.06) }}>
                  <td className="p-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: solidColor(r.name) }} />
                      {platform === "Tous" ? r.name : (<span>{r.name} <span className="text-muted-foreground">({handleFor(r.name, platform as Platform)})</span></span>)}
                    </span>
                  </td>
                  <td className="p-3">{r.followers.toLocaleString()}</td>
                  <td className="p-3 flex items-center gap-1">{r.weeklyDelta}% {r.weeklyDelta>=0? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownRight className="h-4 w-4"/>}</td>
                  <td className="p-3">{r.avgEngagement}%</td>
                  <td className="p-3">{r.posts7d}</td>
                  <td className="p-3 font-semibold">{r.score}</td>
                  <td className="p-3">{top && r.name===top.name ? (<Badge className="bg-emerald-500 hover:bg-emerald-500">Recommandé</Badge>) : (<Badge variant="outline">OK</Badge>)}</td>
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
  return (
    <div className="space-y-6">
      <SectionTitle icon={FileText} title="Rapports automatiques" actions={<Button className="gap-2"><FileText className="h-4 w-4"/>Générer un PDF (démo)</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Hebdomadaire","Mensuel","Comparatif"].map(type => (
          <Card key={type} className="rounded-2xl shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4"/>{type}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">Modèle marque blanche incluant sommaire, KPIs, graphiques, top posts.</div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2"><FileSpreadsheet className="h-4 w-4"/>Exporter Excel</Button>
                <Button className="gap-2"><Download className="h-4 w-4"/>Télécharger PDF</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Alerts(){
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Bell} title="Notifications & alertes" />
        <div className="flex items-center gap-2"><Label htmlFor="push">Notifications push</Label><Switch id="push" defaultChecked/></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>Perte d’abonnés</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Seuil (Δ hebdo)</Label><Input defaultValue={-2} type="number"/></div>
              <div><Label>Destinataires</Label><Input defaultValue="marketing@exemple.com"/></div>
            </div>
            <Button className="w-full">Enregistrer</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/>Post performant</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantile</Label><Input defaultValue={90} type="number"/></div>
              <div><Label>Fenêtre (h)</Label><Input defaultValue={24} type="number"/></div>
            </div>
            <Button className="w-full">Enregistrer</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4"/>Baisse d’engagement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Quantile de référence</Label><Input defaultValue={25} type="number"/></div>
            <div><Label>Période (sem.)</Label><Input defaultValue={8} type="number"/></div>
            <div><Label>Destinataires</Label><Input defaultValue="ops@exemple.com"/></div>
          </div>
          <Button className="w-full">Enregistrer</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App(){
  const [active, setActive] = useState("dashboard");
  return (
    <AppStateProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border bg-card shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500" />
                <div>
                  <div className="text-xl font-semibold">InfluenceTrack</div>
                  <div className="text-xs text-muted-foreground">MVP • Alias par réseau • Maquettes interactives</div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:items-center md:gap-3 w-full md:w-auto">
                <AddInfluencerControl inline/>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4"/>Exporter</Button>
                  <Button variant="outline" size="sm" className="gap-2"><Bell className="h-4 w-4"/>Notifications</Button>
                </div>
              </div>
            </div>
            <Separator/>
            <div className="p-4 md:p-6">
              <Tabs value={active} onValueChange={setActive}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="detail">Détail influenceur</TabsTrigger>
                  <TabsTrigger value="compare">Comparateur</TabsTrigger>
                  <TabsTrigger value="reports">Rapports</TabsTrigger>
                  <TabsTrigger value="alerts">Alertes</TabsTrigger>
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
    </AppStateProvider>
  );
}
