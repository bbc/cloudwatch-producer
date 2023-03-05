const { Producer } = require('../../../dist/producer');

const { cloudwatch } = require('../cloudwatch');

const producer = Producer.create({
  cloudwatch
});

exports.producer = producer;
