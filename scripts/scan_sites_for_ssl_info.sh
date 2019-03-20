#!/bin/bash

sites=("development-gtfs.trilliumtransit.com" "maps.trilliumtransit.com" "jump.trilliumtransit.com")
for site in "${sites[@]}"
do
    openssl s_client -showcerts -connect gtfs.trilliumtransit.com:443 </dev/null | awk 'BEGIN {a=0} /BEGIN CERT/ {a=1} (a>0) {print} /END CERT/ {a=0}' | openssl x509 -noout -subject -issuer -dates 2>/dev/null|grep notAfter
done
echo All done
