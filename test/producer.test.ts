import {
  CloudWatchClient,
} from '@aws-sdk/client-cloudwatch';
import * as sinon from 'sinon';
import { Producer } from '../src/producer';

const sandbox = sinon.createSandbox();

describe('Producer', () => {
  const queueUrl = 'https://dummy-queue';
  let producer;
  let cloudwatch;

  beforeEach(() => {
    cloudwatch = sinon.createStubInstance(CloudWatchClient);

    producer = new Producer({
      cloudwatch
    });
  });

  afterEach(() => {
    sandbox.restore();
  });
});
