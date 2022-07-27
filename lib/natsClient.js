const {
  JSONCodec,
  StringCodec,
  connect,
  consumerOpts,
  createInbox,
} = require('nats');

class NatsClient {
  constructor({ stream, server, subject, callback, token }) {
    // config provided when a new NatsClient is instantiated
    this.natsConnection = null; // Create Nats Connection
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
      await this.fetchLatestMessage();
      this.fetchOngoingEventMessages();
    }
  }

  async connect() {
    this.natsConnection = await connect(this.natsConfig);
    this.jetStreamManager = await this.natsConnection.jetstreamManager();
    this.jetStream = await this.natsConnection.jetstream(); // Creating JetStream Connections (publish to subjects on stream, subscribe to subjects on stream)
  }

  async disconnect() {
    await this.subscribedStream?.unsubscribe(); // Unsubscribe will typically terminate regardless of whether there are messages in flight for the client
    await this.natsConnection?.close();
    // const err = await this.done;
    // if (err) {
    //   console.log(`error closing:`, err);
    // }
  }

  async fetchLatestMessage() {
    try {
      const lastMessage = await this.jetStreamManager?.streams.getMessage(
        this.stream,
        { last_by_subj: this.subject }
      );
      await this.decodeReceivedMessages([lastMessage]);
    } catch (error) {
      console.error(error);
    }
  }

  async fetchOngoingEventMessages() {
    const options = consumerOpts(); // creates a Consumer Options Object
    options.deliverNew(); // ensures that the newest message on the stream is delivered to the consumer when it comes online
    options.ackAll(); // acknowledges all previous messages
    options.deliverTo(createInbox()); // ensures that the Consumer listens to a specific Subject
    (async () => {
      this.subscribedStream = await this.jetStream?.subscribe(
        this.subject,
        options
      );
      this.decodeReceivedMessages(this.subscribedStream);
    })();
  }

  async fetchLastMessagesPerSubject() {
    console.log('delivering last per subject');
    const options = consumerOpts(); // creates a Consumer Options Object
    options.deliverLastPerSubject(); // ensures that the newest message on the stream is delivered to the consumer when it comes online
    options.ackAll(); // acknowledges all previous messages
    options.deliverTo(createInbox()); // ensures that the Consumer listens to a specific Subject
    (async () => {
      this.subscribedStream = await this.jetStream?.subscribe(
        this.subject,
        options
      );
      const unsubscribe = true;
      this.decodeReceivedMessages(this.subscribedStream, unsubscribe);
    })();
  }

  publish() {
    return this._publish.bind(this);
  }

  async decodeReceivedMessages(messageSource, unsubscribe) {
    for await (const message of messageSource) {
      console.log('within decodeReceivedMessages');
      let decodedData;
      try {
        decodedData = this.jsonCoder.decode(message.data);
      } catch (e) {
        decodedData = this.stringCoder.decode(message.data);
      }
      console.log('got decodedData from fetchStreamMessage', decodedData);
      if (this.callback) {
        this.callback(decodedData, message.subject);
      }
      // if (unsubscribe) {
      //   await messageSource.unsubscribe();
      //   break;
      // }
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
