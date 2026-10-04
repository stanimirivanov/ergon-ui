export interface GuideStep {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly expected: string;
}

export interface GuideChapter {
  readonly schemaVersion: 2;
  readonly order: number;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly verification: 'simulated-bff';
  readonly presentation: 'workflow' | 'state-comparison';
  readonly audience: string;
  readonly overview: readonly string[];
  readonly prerequisites: readonly string[];
  readonly steps: readonly GuideStep[];
  readonly troubleshooting: readonly {
    readonly symptom: string;
    readonly guidance: string;
  }[];
  readonly limitations: readonly string[];
}
