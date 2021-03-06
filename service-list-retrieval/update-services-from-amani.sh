#!/usr/bin/env bash

cd $( dirname "${BASH_SOURCE[0]}" )

#echo "Copying old versions of services_AR.json and services_EN.json to services_AR.json.bak and services_EN.json.bak"
#cp ../js/services_AR.json ../js/services_AR.json.bak
#cp ../js/services_EN.json ../js/services_EN.json.bak

echo "Getting latest service data and writing to services.json"
node getJSONFromAmani.js

echo "Transforming JSON"
node transformJSONFromAmani.js

echo "Finishing translations in services_AR.json"
node FinishEn_AR_JSON.js

echo "Done!"
