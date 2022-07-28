PORT=3000
PGHOST='postgres'
PGUSER='postgres'
PGPASSWORD='secret'
PGPORT=5432
PGDATABASE='tower'
# SDK_KEY='myToken'
NATS_SERVER='nats://nats:4222'
NATS_STREAM_NAME='flags_ruleset'

REDIS_SERVER='{"socket":{"host":"redis"}}'

REACT_APP_NATS_WS_SERVER='ws://0.0.0.0:8080'
REACT_APP_SDK_KEY='myToken'

NATS_AEROBAT_SUBJECT="apps.\*.update.manual"
REDIS_POLL_RATE=4000