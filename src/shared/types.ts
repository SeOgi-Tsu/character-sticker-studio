export interface Character {
  name: string; description: string; identity: string; outfit: string; personality: string;
  referenceAssetId?: string; anchorAssetId?: string;
}
export interface Caption { text: string; enabled: boolean; color: string; stroke: string; position: 'top' | 'bottom'; fontSize: number; }
export interface Reaction {
  id: string; name: string; caption: string; category: string; action: string;
  tags: string[]; emoji: string; recommended?: boolean; sourceIds?: string[];
}
export interface Style { id: string; name: string; description: string; prompt: string; color: string; }
export interface Pack { id: string; name: string; description: string; reactionIds: string[]; }
export interface Source { id: string; title: string; url: string; checkedAt: string; evidence: string; }
export interface Project {
  id: string; name: string; character: Character; styleId: string; selectedIds: string[];
  customReactions: Reaction[]; overrides: Record<string, Partial<Reaction>>;
  captions: Record<string, Caption>; createdAt: string; updatedAt: string;
}
export interface Asset { id: string; url: string; filename: string; width: number; height: number; hasAlpha: boolean; provenance?: string; }
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'unknown';
export interface Job {
  id: string; projectId: string; kind: 'sticker' | 'anchor' | 'character';
  reactionId?: string; name: string; prompt: string; status: JobStatus;
  asset?: Asset; error?: string; createdAt: string; updatedAt: string; model: string; provider: string;
}
export interface ProviderSettings {
  provider: 'openai' | 'gemini'; baseUrl: string; model: string; apiKey?: string;
  hasApiKey?: boolean; size: string; concurrency: number;
}
export interface Catalog { reactions: Reaction[]; styles: Style[]; packs: Pack[]; sources: Source[]; }
export interface Bootstrap {
  projects: Project[]; catalog: Catalog; settings: ProviderSettings;
  assets: Asset[]; jobs: Job[];
}
