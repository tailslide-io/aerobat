# Ensure the following files are in your current active repository:
  # init.sql
  # nats.conf
  # tailslide.yaml
  # .env (use the same variables as shown in env.md)

# Execute the command:
  # SDK_KEY=myToken docker-compose -f tailslide.yaml up
  # you can pass in whatever you want for 'myToken'

# Navigate to localhost:3000 and you should see the Tower Front-end

# Changes made to Aerobat

# Ensure the following files are in your current active repository:
  # init.sql
  # nats.conf
  # tailslide.yaml

# Execute the command:
  # SDK_KEY=myToken docker-compose -f tailslide.yaml up
  # you can pass in whatever you want for 'myToken'

# created a Docker File for the Server - see Docker file

# see updated .env file

# removed test.js and PEDAC.md

# Updated circuitConfig in aerobat.js
<!-- const circuitConfig = {
  stream: process.env.NATS_STREAM_NAME,
  server: process.env.NATS_SERVER,
  appId,
  redisAddress: JSON.parse(process.env.REDIS_SERVER),
  sdkKey: process.env.SDK_KEY,
  timeWindow: process.env.REDIS_TIME_WINDOW,
}; -->

# Updated NatsConfig in aerobat.js
<!-- 
const NatsConfig = {
  stream: process.env.NATS_STREAM_NAME,
  server: process.env.NATS_SERVER,
  subject: process.env.NATS_AEROBAT_SUBJECT,
  token: process.env.SDK_KEY,
  callback: trackCircuitManagers,
}; -->


# Removed the 'if this.callback' from decodeReceivedMessages
<!-- 
  async decodeReceivedMessages(messageSource) {
    for await (const message of messageSource) {
      let decodedData;
      try {
        decodedData = this.jsonCoder.decode(message.data);
      } catch (e) {
        decodedData = this.stringCoder.decode(message.data);
      }
      console.log('got decodedData from decodeReceivedMessages', decodedData);
      this.callback(decodedData, message.subject);
    }
  }
   -->