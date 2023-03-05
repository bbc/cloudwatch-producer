import {
  CloudWatchClient,
  PutMetricDataCommand
} from '@aws-sdk/client-cloudwatch';
import * as sinon from 'sinon';
import { Producer } from '../../src/producer';
import { assert, expect } from 'chai';

const sandbox = sinon.createSandbox();

const mockPutMetrics = sinon.match.instanceOf(PutMetricDataCommand);

describe('Producer', () => {
  let clock;
  let producer;
  let cloudwatch;

  beforeEach(() => {
    clock = sinon.useFakeTimers({
      now: 1678033664086
    });
    cloudwatch = sinon.createStubInstance(CloudWatchClient);
    cloudwatch.send = sinon.stub();
    cloudwatch.send.withArgs(mockPutMetrics).resolves({
      $metadata: {
        httpStatusCode: 200
      }
    });

    producer = new Producer({
      cloudwatch
    });
  });

  afterEach(() => {
    clock.restore();
    sandbox.restore();
  });

  describe('.isRunning', () => {
    it('returns false by default', () => {
      assert.strictEqual(producer.isRunning, false);
    });

    it('returns true when the poll is running', () => {
      producer.start();
      assert.strictEqual(producer.isRunning, true);
    });

    it('returns false when the poll is stopped', () => {
      producer.start();
      assert.strictEqual(producer.isRunning, true);

      producer.stop();
      assert.strictEqual(producer.isRunning, false);
    });
  });

  describe('.collect()', () => {
    it('throws an error if no metric is provided', () => {
      expect(() => producer.collect()).to.throw('No metric was supplied.');
    });

    it('throws an error if no MetricName is provided', () => {
      expect(() => producer.collect({})).to.throw(
        `The metric 'undefined' could not be validated.`
      );
    });

    it('does not throw if only a MetricName is supplied', () => {
      expect(() => producer.collect({ MetricName: 'test' })).not.to.throw();
    });

    it('throws an error if more than 30 dimensions are passed', () => {
      const dimensions = Array.from(Array(31).keys()).map((key) => {
        return { Name: `test${key}`, Value: 'test' };
      });

      expect(() =>
        producer.collect({ MetricName: 'test', Dimensions: dimensions })
      ).to.throw(`The metric 'test' could not be validated.`);
    });

    it(`throws an error if the unit provided is not valid`, () => {
      expect(() =>
        producer.collect({ MetricName: 'test', Unit: 'Something' })
      ).to.throw(`The metric 'test' could not be validated.`);
    });

    it('creates a new metric on collection', () => {
      producer.collect(
        {
          MetricName: 'test',
          Dimensions: [{ Name: 'TestDimension', Value: 'SomethingCool' }],
          Unit: 'Milliseconds'
        },
        650
      );

      assert.strictEqual(producer.metrics, {
        test: {
          MetricName: 'test',
          Dimensions: [{ Name: 'TestDimension', Value: 'SomethingCool' }],
          StatisticValues: {
            Maximum: 650,
            Minimum: 650,
            SampleCount: 1,
            Sum: 650
          },
          Timestamp: `2023-03-05T16:27:44.086Z`,
          Unit: 'Milliseconds'
        }
      });
    });

    it('sends the metric to CloudWatch instantly', () => {
      producer.collect(
        {
          MetricName: 'test',
          Dimensions: [{ Name: 'TestDimension', Value: 'SomethingCool' }],
          Unit: 'Milliseconds'
        },
        650
      );

      sandbox.assert.calledOnce(cloudwatch.send);
      sandbox.assert.calledWithMatch(cloudwatch.send.firstCall, [
        {
          MetricName: 'test',
          Dimensions: [{ Name: 'TestDimension', Value: 'SomethingCool' }],
          StatisticValues: {
            Maximum: 650,
            Minimum: 650,
            SampleCount: 1,
            Sum: 650
          },
          Timestamp: `2023-03-05T16:27:44.086Z`,
          Unit: 'Milliseconds'
        }
      ]);
    });
  });
});
