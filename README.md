# Aerobat for Tailslide

## Usage

Aerobat is responsible for querying the Redis Timeseries database for each live circuit within an application, to evaluate current error rates against developer-configured error thresholds.

Tailslide’s SDK clients (installed in the user application) will record successful and failed operation attempts to the Redis Timeseries database.

Aerobat will poll the Redis Timeseries database at a developer-defined interval in order to calculate the error rate percentage in each feature flag over a developer-defined window of time. It will compare that percentage to a user-defined error threshold percentage. If the error rate percentage is larger than specified, the circuit is tripped open.

Once a circuit is tripped open, Aerobat will wait a developer-defined amount of time before attempting to expose users to the feature again. Once that time has passed, users will be directed to the feature at a developer-defined ‘Recovery Increment’ percentage until the feature is available to the desired number of users.

Note: all developer-defined variables can be specified via `Tower` front-end

## Run the app individually

Clone main branch of repository

Add .env file into the root directory  

```javascript


SDK_KEY='myToken'
NATS_SERVER='nats://127.0.0.1:4222' 
NATS_STREAM_NAME='flags_ruleset'

REDIS_SERVER='{"socket":{"host":"redis"}}'

REACT_APP_NATS_WS_SERVER='ws://0.0.0.0:8080' 
REACT_APP_SDK_KEY='myToken'

NATS_AEROBAT_SUBJECT="apps.*.update.manual" 
REDIS_POLL_RATE=4000
```


Within the root directory run `npm install`

`npm start`


## NATS JetStream and Redis Timeseries Database

Both a NATS JetStream and a Redis Timeseries Database will need to be running. See instructions in Tailslide `Tower` README for how to start each.
