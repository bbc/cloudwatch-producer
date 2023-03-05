import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

const config = {
  region: 'eu-west-1',
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'key',
    secretAccessKey: 'secret'
  }
};

exports.cloudwatch = new CloudWatchClient(config);
exports.config = config;
