const {
  JSONCodec,
  StringCodec,
  connect,
  consumerOpts,
  createInbox,
} = require('nats');

class NatsClient {
  constructor({ stream, server, subject, callback, token }) {
    this.natsConnection = null;
    this.jetStreamManager = null;
    this.jetStream = null;
    this.subscribedStream = null;
    this.natsConfig = { servers: server, token };
    this.stream = stream;
    this.subject = subject;
    this.callback = callback;
    this.jsonCoder = JSONCodec();
    this.stringCoder = StringCodec();
  }

  async initializeFlags(allSubjects = false) {
    await this.connect();
    if (allSubjects) {
      await this.fetchLastMessagesPerSubject();
    } else {
      this.fetchOngoingEventMessages();
    }
  }

  async connect() {
    this.natsConnection = await connect(this.natsConfig);
    this.jetStreamManager = await this.natsConnection.jetstreamManager();
    this.jetStream = await this.natsConnection.jetstream();
  }

  async disconnect() {
    await this.subscribedStream?.unsubscribe();
    await this.natsConnection?.close();
  }

  async fetchOngoingEventMessages() {
    const options = consumerOpts(); 
    options.deliverNew();
    options.ackAll();
    options.deliverTo(createInbox());
    (async () => {
      this.subscribedStream = await this.jetStream?.subscribe(
        this.subject,
        options
      );
      this.decodeReceivedMessages(this.subscribedStream);
    })();
  }

  async fetchLastMessagesPerSubject() {
    const options = consumerOpts();
    options.deliverLastPerSubject();
    options.ackAll();
    options.deliverTo(createInbox());
    (async () => {
      this.subscribedStream = await this.jetStream?.subscribe(
        this.subject,
        options
      );
      this.decodeReceivedMessages(this.subscribedStream);
    })();
  }

  publish() {
    return this._publish.bind(this);
  }

  async decodeReceivedMessages(messageSource) {
    for await (const message of messageSource) {
      let decodedData;
      try {
        decodedData = this.jsonCoder.decode(message.data);
      } catch (e) {
        decodedData = this.stringCoder.decode(message.data);
      }

      if (this.callback) {
        this.callback(decodedData, message.subject);
      }
    }
  }

  async _publish(subject, message) {
    this._addMissingSubjectInStream(subject);

    if (typeof message === 'object') {
      message = this.jsonCoder.encode(message);
    } else {
      message = this.stringCoder.encode(message);
    }

    await this.jetStream?.publish(subject, message);
  }

  async _addMissingSubjectInStream(subject) {
    const flagsStreamInfo = await this.jetStreamManager?.streams.info(
      this.stream
    );
    if (!flagsStreamInfo?.config.subjects.includes(subject)) {
      flagsStreamInfo?.config.subjects?.push(subject);
      await this.jetStreamManager?.streams.update(
        this.stream,
        flagsStreamInfo?.config
      );
    }
  }
}

module.exports = NatsClient;
