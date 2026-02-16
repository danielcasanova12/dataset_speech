export interface DatasetInfo {
  frontendId: number;
  backendId: number;
  name: string;
  csvFile: string;
}

export const DATASETS: DatasetInfo[] = [
  { frontendId: 11, backendId: 1, name: "Voz Geral 10 min", csvFile: "11_voz_geral_10m.csv" },
  { frontendId: 21, backendId: 3, name: "Emoção 10 min", csvFile: "21_emocao_10m.csv" },
  { frontendId: 23, backendId: 3, name: "Emoção 30 min", csvFile: "23_emocao_30m.csv" },
];

export const findByFrontendId = (id: number): DatasetInfo | undefined => 
  DATASETS.find(d => d.frontendId === id);

// Retorna a primeira correspondência. Funciona para ID 1, mas pode ser ambíguo para outros.
export const findByBackendId = (id: number): DatasetInfo | undefined => 
  DATASETS.find(d => d.backendId === id);
