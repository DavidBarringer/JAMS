#!/bin/bash
_term(){
  echo
  echo "Shutting down server"
  pkill node
  pkill vlc
  rm configActive.json
  rm tmp/* &>/dev/null
  rm list/buckets.lock &>/dev/null
  echo "Done"
}

trap _term SIGINT SIGTERM

echo "Starting server, may God have mercy on our souls."
npm start &>/dev/null
echo "Server is now running, memes incoming."
node server/server.js
