import {
  CloudWatchClient,
  PutMetricDataCommand
} from '@aws-sdk/client-cloudwatch';
import * as sinon from 'sinon';
import { Producer } from '../../src/producer';
import { assert } from 'chai';

const sandbox = sinon.createSandbox();

const mockPutMetrics = sinon.match.instanceOf(PutMetricDataCommand);

describe('Producer', () => {
  let producer;
  let cloudwatch;

  beforeEach(() => {
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
    sandbox.restore();
  });

  describe('isRunning', () => {
    it('returns false by default', () => {
      const status = producer.isRunning;

      assert.strictEqual(status, false);
    });
  });
});
