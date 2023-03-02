# cloudwatch-producer

[![NPM downloads](https://img.shields.io/npm/dm/cloudwatch-producer.svg?style=flat)](https://npmjs.org/package/cloudwatch-producer)
[![Build Status](https://github.com/bbc/cloudwatch-producer/actions/workflows/test.yml/badge.svg)](https://github.com/bbc/cloudwatch-producer/actions/workflows/test.yml)

Simple scaffolding for applications that produce batched CloudWatch metrics

## Installation

```
npm install cloudwatch-producer
```

## Usage

```js
import { Producer } from 'cloudwatch-producer';

// create simple producer
const producer = Producer.create({
  region: 'eu-west-1'
});
```

### Credentials

By default the consumer will look for AWS credentials in the places [specified by the AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_AWS_Credentials). The simplest option is to export your credentials as environment variables:

```bash
export AWS_SECRET_ACCESS_KEY=...
export AWS_ACCESS_KEY_ID=...
```

If you need to specify your credentials manually, you can use a pre-configured instance of the [CloudWatch Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch/index.html).

```js
import { Producer } from 'cloudwatch-producer';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

// create simple producer
const producer = Producer.create({
  region: 'eu-west-1',
  cloudwatch: new CloudWatchClient({
    region: 'eu-west-1',
    credentials: {
      accessKeyId: 'yourAccessKey',
      secretAccessKey: 'yourSecret'
    }
  })
});
```

### Sending Metrics

To send a metric, you just need to call the `.collect()` method with your metric and value, as in the example below.

```js
import { Producer } from 'cloudwatch-producer';

// create simple producer
const producer = Producer.create({
  region: 'eu-west-1'
});

producer.collect(
  {
    MetricName: 'My Awesome Metric',
    Unit: 'Seconds',
    Dimensions: [
      {
        Name: 'dimension-one',
        Value: 'dimension-one-value'
      }
    ]
  },
  2
);
```

Please note that if you have not started the producer, this metric will be sent instantly, rather than in a batch. You can find out how to start batching below.

### Batching Metrics

By default, CloudWatch Producer will not send metrics in batches until the producer has been started, to start it, just call the `.start()` method like so:

```js
producer.start();
```

### Stop Batching Metrics

If you would like to stop sending metrics in batches and go back to instantly sending metrics, just call the `.stop()` method like so:

```js
producer.stop();
```

### What gets sent to CloudWatch?

CloudWatch Producer will send the following via the API when a metric batch is triggered or a metric is instantly dispatched:

```js
{
  MetricName: "My Awesome Metric",
  Dimensions: [
    {
      Name: 'dimension-one',
      Value: 'dimension-one-value'
    }
  ],
  StatisticValues: {
    Maximum: 2,
    Minimum: 2,
    SampleCount: 1,
    Sum: 2
  },
  Timestamp: "Thu Mar 02 2023 22:26:20 GMT+0000 (Greenwich Mean Time)",
  Unit: "Seconds"
}
```

- If no `Dimensions` were supplied when the metric was collected, it will be sent as `[]`
- If a `Unit` was not supplied when the metric was collected, it will be sent as `None`
- Timestamp is automatically set as the date and time that the metric collection was triggered
- If you are batching requests, the metric will be updated
  - The values within `StatisticValues` will be incremented like so:
    - `Maximum` will either be the previously stored value or the provided value if the provided value is higher
    - `Minimum` will either be the previously stored value or the provided value if the provided value is lower
    - `SampleCount` will be incremented each time the metric is updated
    - `Sum` will be the previously stored value plus the provided value

## Development

### Test

```
npm test
```

### Coverage

For coverage report, run the command:

```
npm run coverage
```

### Lint

To check for problems using ESLint

```
npm run lint
```

## Contributing

See [contributing guidelines](./.github/CONTRIBUTING.md)
