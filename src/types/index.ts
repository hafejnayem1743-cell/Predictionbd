export type GameModeKey = 'wingo_30s' | 'wingo_1m' | 'wingo_3m' | 'wingo_5m';

export interface GameModeInfo {
  key: GameModeKey;
  name: string;
  shortName: string;
  intervalSec: number;
  typeId: number;
}

export interface NextSignal {
  currentPeriod: string;
  targetPeriod: string;
  generatedAt: string;
  lockStatus: 'LOCKED';
  size: 'BIG' | 'SMALL' | null;
  color: 'GREEN' | 'RED' | null;
  number: number | null;
  status: 'VALID ESTIMATE' | 'INSUFFICIENT DATA';
  estimatedProbability: string;
  probabilityPercent: number;
  longTermTrend?: string;
  fiveHourTrend?: string;
  uncertaintyNote?: string;
  reasoning: string;
}

export interface WindowAnalysis {
  periodsAnalyzed: number;
  windowLabel: string;
  bigCount: number;
  bigPercentage: number;
  smallCount: number;
  smallPercentage: number;
  redCount: number;
  redPercentage: number;
  greenCount: number;
  greenPercentage: number;
  numberFrequency: Record<number, number>;
  mostFrequent: { number: number; count: number };
  leastFrequent: { number: number; count: number };
  dataStatus: string;
}

export interface CompactAnalysisData {
  gameMode: string;
  last1000: WindowAnalysis;
  last5Hours: WindowAnalysis;
  updatedAt: string;
}

export interface RoundIssue {
  gameMode: string;
  typeId: number;
  issueNumber: string;
  nextIssueNumber?: string;
  clockDriftMs?: number;
  startTime: string;
  endTime: string;
  serverTime: string;
  intervalSeconds: number;
  remainingSeconds: number;
  serverTimestampMs?: number;
  serverNowTimestampMs?: number;
  endTimestampMs?: number;
  nextSignal?: NextSignal;
  compactAnalysis?: CompactAnalysisData;
  status: string;
  dataSource: string;
  isLive: boolean;
  lastSynced: string;
}

export interface DrawRecord {
  issueNumber: string;
  number: number;
  colour: string;
  colors: string[];
  size: 'Big' | 'Small';
  premium?: string;
  createdAt?: string;
  resultTime?: string;
}

export interface AnalysisData {
  gameMode: string;
  totalRoundsAnalyzed: number;
  analysisStatus: string;
  sampleWindow: string;
  educationalDisclaimer: string;
  numberFrequency: number[];
  numberPercentages: number[];
  sizeDistribution: {
    Big: number;
    Small: number;
  };
  sizePercentages: {
    Big: number;
    Small: number;
  };
  colorDistribution: {
    green: number;
    red: number;
    violet: number;
  };
  colorPercentages: {
    green: number;
    red: number;
    violet: number;
  };
  hotNumbers: number[];
  coldNumbers: number[];
  currentSizeStreak: {
    size: string;
    count: number;
  };
  currentColorStreak: {
    color: string;
    count: number;
  };
  streakRecords: {
    maxBig: number;
    maxSmall: number;
    maxGreen: number;
    maxRed: number;
  };
  statisticalEntropy: number;
}

export interface TelemetryData {
  apiConnected: boolean;
  upstreamGateway: string;
  lastSyncTimestamp: string;
  serverClockDriftMs: number;
  supportedModes: string[];
  telemetry: {
    totalCalls: number;
    avgLatencyMs: number;
    recentErrors: number;
  };
}
