https://stackoverflow.com/questions/18862214/start-another-node-application-using-node-js

if property in object
object[property] = truthy/falsey

Circuit Organizer -> aerobat.js

- AppProcessTracker => {appID: childProcess}
- Subject => apps.\*.update.manual

  - Start Up
    -> CircuitOrganizer should be subscribed to apps.\*.update.manual

  - Creating & Deleting a New Process to run Circuit Manager
    -> for each last message on the individual app.\*.update.manual subjects and all ongoing new messages
    -> if the flag_ruleset has a length greater than 0
    -> check to see if the Process already exists, if it does, don't do anything  
     -> otherwise, spin up a new process to run a Circuit Manager
    -> add the appId and childProcess to the AppProcessTracker
    -> if the flag_ruleset has a length equal to 0
    -> check to see if the Process exists, if it does delete it
    -> set the appID key from the AppProcessTracker to null

  - Clean Up
    -> on SIGINT/SIGINT
    -> for each Key that has a value
    -> kill all the processes

Circuit Managers (Other Node Processes -> needs a File to Run Off Of) -> index.js

- Subject => apps.1.> or apps.2.> etc.
  -> obtain the config variables from the environment files
  -> instantiate a new Circuit Manager, with the corresponding subject (AppId)

SDK_KEY="myToken"
NATS_SERVER="nats://localhost:4222"
NATS_STREAM="flag_ruleset"
NATS_SUBJECT="apps.\*.update.manual"
REDIS_POLL_RATE=4000
