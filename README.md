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
