export interface BlockDefinition {
  blockId: number;
  phrase_count: number;
}

export interface PackageConfig {
  total_phrases: number;
  proportions: Record<string, number>;
  blocks_sequence: BlockDefinition[];
}

export interface DatasetConfig {
  name: string;
  slug: string;
  csv_path: string;
  packages: Record<string, PackageConfig>;
}

export interface OrchestratorConfig {
  version: string;
  datasets: Record<string, DatasetConfig>;
}

export interface Phrase {
  id: number;
  text: string;
  blockId: number;
  videoSrc?: string;
  audioSize: string;
}

export class DatasetOrchestrator {
  private config: DatasetConfig;
  private phrases: Phrase[] = [];
  private buckets: Record<number, Record<string, Phrase[]>> = {};
  private selectedPackage: string;

  constructor(config: DatasetConfig, phrases: Phrase[], selectedPackage: string = '10M') {
    this.config = config;
    this.phrases = phrases;
    this.selectedPackage = selectedPackage;
    this.initializeBuckets();
  }

  private initializeBuckets() {
    // 1. Agrupa todas as frases do CSV por BlockID e depois por Tamanho (P, M, G)
    this.phrases.forEach(p => {
      if (!this.buckets[p.blockId]) this.buckets[p.blockId] = {};
      const size = p.audioSize.toLowerCase();
      if (!this.buckets[p.blockId][size]) this.buckets[p.blockId][size] = [];
      this.buckets[p.blockId][size].push(p);
    });

    // 2. Embaralha as frases em cada balde para não entregar sempre na mesma ordem
    Object.keys(this.buckets).forEach(bId => {
      Object.keys(this.buckets[bId as unknown as number]).forEach(size => {
        this.buckets[bId as unknown as number][size].sort(() => Math.random() - 0.5);
      });
    });
  }

  // Gera TODA a lista de frases que o usuário vai ler na sessão baseada na configuração
  public generateSessionPhrases(): Phrase[] {
    const pkgConfig = this.config.packages[this.selectedPackage];
    if (!pkgConfig) return [];
    
    const seq = pkgConfig.blocks_sequence;
    const sessionPhrases: Phrase[] = [];

    seq.forEach(def => {
      const blockSize = def.phrase_count;
      const blockId = def.blockId;
      const proportions = pkgConfig.proportions;

      // Hare-Niemeyer para decidir exatamente quantos P, M, G usar neste bloco
      const counts: Record<string, number> = {};
      const remainders: { size: string; rem: number }[] = [];
      
      Object.entries(proportions).forEach(([size, prop]) => {
        const target = blockSize * prop;
        counts[size] = Math.floor(target);
        remainders.push({ size, rem: target - counts[size] });
      });
      
      const currentTotal = Object.values(counts).reduce((a, b) => a + b, 0);
      let diff = blockSize - currentTotal;
      remainders.sort((a, b) => b.rem - a.rem);
      
      for (let i = 0; i < diff; i++) {
        counts[remainders[i].size]++;
      }

      const blockPhrases: Phrase[] = [];
      Object.entries(counts).forEach(([size, count]) => {
        for (let i = 0; i < count; i++) {
          const phrase = this.getPhraseFromBucket(blockId, size);
          if (phrase) blockPhrases.push(phrase);
        }
      });

      // Embaralha para que os tamanhos dentro do mesmo bloco venham misturados (ex: p, g, p, m, m)
      blockPhrases.sort(() => Math.random() - 0.5);
      sessionPhrases.push(...blockPhrases);
    });

    return sessionPhrases;
  }

  // Retira uma frase do balde correto ou tenta um fallback circular se esgotar
  private getPhraseFromBucket(blockId: number, size: string): Phrase | null {
    const b = this.buckets[blockId];
    if (!b) return null;

    // Ordem de prioridade para o fallback:
    // Se pede 'g': tenta 'g', depois 'm', depois 'p'
    // Se pede 'm': tenta 'm', depois 'p', depois 'g'
    // Se pede 'p': tenta 'p', depois 'm', depois 'g'
    const fallbackOrder: Record<string, string[]> = {
      "g": ["g", "m", "p"],
      "m": ["m", "p", "g"],
      "p": ["p", "m", "g"]
    };

    const order = fallbackOrder[size];
    if (!order) return null;

    for (const currentSize of order) {
      if (b[currentSize] && b[currentSize].length > 0) {
        return b[currentSize].shift() || null;
      }
    }

    return null;
  }

  // Utilizado pelo botão de pular!
  public getReplacementPhrase(blockId: number, size: string): Phrase | null {
    return this.getPhraseFromBucket(blockId, size);
  }

  public getProgress(recordedCount: number) {
    const pkgConfig = this.config.packages[this.selectedPackage];
    const total = pkgConfig ? pkgConfig.total_phrases : 100;
    return {
      total,
      recorded: recordedCount,
      percentage: Math.min((recordedCount / total) * 100, 100)
    };
  }
}
