import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

export interface Metric {
  MetricName: string;
  Dimensions?: string[];
  Unit?: string;
  StatisticValues?: {
    Maximum?: number;
    Minimum?: number;
    SampleCount?: number;
    Sum?: number;
  };
  Timestamp?: Date;
}

export interface Metrics {
  [key: string]: Metric;
}

export interface ProducerOptions {
  cloudwatch?: CloudWatchClient;
  region?: string;
  batchSize?: number;
  reportFrequency?: number;
  namespace?: string;
  metrics: Metrics;
}
