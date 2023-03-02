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
  metrics: Metrics;

  private validate(metrics) {
    if (!metrics) {
      throw new Error('No metrics were supplied.');
    }

    const validCloudwatchUnit =
      /^(Seconds|Microseconds|Milliseconds|Bytes|Kilobytes|Megabytes|Gigabytes|Terabytes|Bits|Kilobits|Megabits|Gigabits|Terabits|Percent|Count|Bytes\/Second|Kilobytes\/Second|Megabytes\/Second|Gigabytes\/Second|Terabytes\/Second|Bits\/Second|Kilobits\/Second|Megabits\/Second|Gigabits\/Second|Terabits\/Second|Count\/Second|None)$/;
    const validMetricConfig = z.object({
      metricName: z.string().regex(/^[A-z\d]+$/),
      dimensions: z.string().array().max(10),
      unit: z.string().regex(validCloudwatchUnit)
    });

    Object.keys(metrics).forEach((metric) => {
      const result = validMetricConfig.safeParse(metrics[metric]);

      if (!result.success) {
        throw new Error(
          `The metric '${metric}' config could not be validated.`
        );
      }
    });
  }

  constructor(options: ProducerOptions) {
    this.validate(options.metrics);

    this.metrics = options.metrics;
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

  private getMetric({ metricName, unit, dimensions }) {
    if (!this.metrics[metricName]) {
      this.metrics[metricName] = this.createMetric({
        metricName,
        unit,
        dimensions
      });
    }

    return this.metrics[metricName];
  }

  private createMetric({ metricName, unit, dimensions }) {
    const result = {
      MetricName: metricName,
      Dimensions: [],
      StatisticValues: {
        Maximum: 0.0,
        Minimum: 0.0,
        SampleCount: 0.0,
        Sum: 0.0
      },
      Timestamp: new Date(),
      Unit: unit
    };

    if (dimensions) {
      Object.keys(dimensions).forEach((key) => {
        result.Dimensions.push({
          Name: key,
          Value: dimensions[key]
        });
      });
    }

    return result;
  }

  private updateMetric({ metricName, unit, dimensions, value }) {
    value = Number.isFinite(value) ? value : 0;

    const metric = this.getMetric({ metricName, unit, dimensions });

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

    this.metrics[metricName] = newMetric;
  }

  public collect(metric) {
    const { typeId, result, dimensions, value } = metric;
    const metricPatternConfig =
      this.metrics[typeId] && this.metrics[typeId][result];

    if (!metricPatternConfig) {
      return;
    }

    const { metricName, unit } = metricPatternConfig;
    const validDimensions = metricPatternConfig.dimensions || [];
    const suppliedDimensions = dimensions ? Object.keys(dimensions) : [];

    if (
      validDimensions.length !== suppliedDimensions.length ||
      suppliedDimensions.filter((key) => !validDimensions.includes(key))
        .length > 0
    ) {
      return;
    }

    this.updateMetric({ metricName, unit, dimensions, value });
  }

  public start() {
    if (this.reporterTimeoutId) {
      clearTimeout(this.reporterTimeoutId);
    }

    this.reporterTimeoutId = setTimeout(this.poll, this.reportFrequency);
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

    Promise.all(batches.map(this.sendBatch));

    return this.start();
  }

  private async sendBatch(metricsList) {
    if (metricsList.length > 0) {
      const queuedMetrics = {
        MetricData: metricsList,
        Namespace: this.namespace
      };

      const command = new PutMetricDataCommand(queuedMetrics);
      const response = await this.cloudwatch.send(command);

      console.log(response);

      return response;
    }
  }
}

Producer.create = (options: ProducerOptions): Producer => {
  return new Producer(options);
};
