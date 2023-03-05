import {
  CloudWatchClient,
  PutMetricDataCommand
} from '@aws-sdk/client-cloudwatch';
import { z } from 'zod';

import { ProducerOptions, Metrics } from './types';

export class Producer {
  static create: (options: ProducerOptions) => Producer;

  cloudwatch: CloudWatchClient;
  region?: string;
  batchSize?: number;
  reportFrequency?: number;
  namespace?: string;
  metrics?: Metrics;

  constructor(options: ProducerOptions) {
    this.metrics = options.metrics || undefined;
    this.batchSize = options.batchSize || 20;
    this.reportFrequency = options.reportFrequency || 30000;
    this.namespace = options.namespace || 'EC2';
    this.cloudwatch =
      options.cloudwatch ||
      new CloudWatchClient({
        ...options,
        region: options.region || 'eu-west-1'
      });
  }

  private reporterTimeoutId: NodeJS.Timeout | undefined = undefined;

  public isRunning = false;

  private createMetric({ MetricName, Unit, Dimensions }) {
    const result = {
      MetricName,
      Dimensions: Dimensions || [],
      StatisticValues: {
        Maximum: 0.0,
        Minimum: 0.0,
        SampleCount: 0.0,
        Sum: 0.0
      },
      Timestamp: new Date(),
      Unit: Unit || 'None'
    };

    return result;
  }

  private getMetric({ MetricName, Unit, Dimensions }) {
    if (!this.metrics[MetricName]) {
      this.metrics[MetricName] = this.createMetric({
        MetricName,
        Unit,
        Dimensions
      });
    }

    return this.metrics[MetricName];
  }

  private createOrUpdateMetric({ MetricName, Unit, Dimensions, value }) {
    value = Number.isFinite(value) ? value : 0;

    const metric = this.getMetric({ MetricName, Unit, Dimensions });

    const newMetric = metric;

    if (metric) {
      const stats = newMetric.StatisticValues;
      if (stats.SampleCount) {
        stats.Maximum = Math.max(stats.Maximum, value);
        stats.Minimum = Math.min(stats.Minimum, value);
        stats.SampleCount += 1;
        stats.Sum = stats.Sum + value;
      } else {
        stats.Maximum = value;
        stats.Minimum = value;
        stats.SampleCount = 1;
        stats.Sum = value;
      }
    }

    this.metrics[MetricName] = newMetric;
  }

  private validate(metric) {
    if (!metric) {
      throw new Error('No metric was supplied.');
    }

    const validCloudwatchUnit =
      /^(Seconds|Microseconds|Milliseconds|Bytes|Kilobytes|Megabytes|Gigabytes|Terabytes|Bits|Kilobits|Megabits|Gigabits|Terabits|Percent|Count|Bytes\/Second|Kilobytes\/Second|Megabytes\/Second|Gigabytes\/Second|Terabytes\/Second|Bits\/Second|Kilobits\/Second|Megabits\/Second|Gigabits\/Second|Terabits\/Second|Count\/Second|None)$/;
    const validMetricConfig = z.object({
      MetricName: z.string().regex(/^[A-z\d]+$/),
      Dimensions: z.string().array().max(10),
      Unit: z.string().regex(validCloudwatchUnit)
    });

    const result = validMetricConfig.safeParse(metric);

    if (!result.success) {
      throw new Error(`The metric '${metric}' config could not be validated.`);
    }
  }

  private async sendMetrics(metricsList) {
    if (metricsList.length > 0) {
      const queuedMetrics = {
        MetricData: metricsList,
        Namespace: this.namespace
      };

      const command = new PutMetricDataCommand(queuedMetrics);
      const response = await this.cloudwatch.send(command);

      if (response?.['$metadata']?.httpStatusCode === 200) {
        this.metrics = {};

        return response;
      } else {
        return null;
      }
    }
  }

  public collect(metric, value) {
    this.validate(metric);

    const { MetricName, Dimensions, Unit } = metric;

    this.createOrUpdateMetric({ MetricName, Unit, Dimensions, value });

    if (!this.isRunning) {
      this.sendMetrics(this.metrics);
    }
  }

  public start() {
    this.isRunning = true;

    if (this.reporterTimeoutId) {
      clearTimeout(this.reporterTimeoutId);
    }

    this.reporterTimeoutId = setTimeout(this.poll, this.reportFrequency);
  }

  public stop() {
    this.isRunning = false;

    if (this.reporterTimeoutId) {
      clearTimeout(this.reporterTimeoutId);
    }
  }

  private poll() {
    this.validate(this.metrics);

    const metricList = Object.keys(this.metrics).map(
      (key) => this.metrics[key]
    );

    const batches = [];

    while (metricList.length > 0) {
      batches.push(
        metricList.splice(0, Math.min(this.batchSize, metricList.length))
      );
    }

    Promise.all(batches.map(this.sendMetrics));

    return this.start();
  }
}

Producer.create = (options: ProducerOptions): Producer => {
  return new Producer(options);
};
