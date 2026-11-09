#!/bin/sh
# Fetch OSM extracts for the Sector V -> Sealdah corridors. Polite: 4 queries, sequential, pause between.
# Map data (c) OpenStreetMap contributors, ODbL.
set -e
OUT=$(dirname "$0")/..
UA="ghar-jabo-map/1.0 (+https://boogles.dev)"
EP=${EP:-https://overpass-api.de/api/interpreter}
BB="22.552,88.360,22.602,88.442"
q() { curl -sS -A "$UA" --data-urlencode "data=$2" "$EP" -o "$OUT/$1.tmp" && mv "$OUT/$1.tmp" "$OUT/$1"; echo "$1 $(wc -c < "$OUT/$1")"; sleep 8; }
q osm-roads.json "[out:json][timeout:180];way[highway~\"^(motorway|trunk|primary|secondary|tertiary)(_link)?\$\"]($BB);out tags geom;"
q osm-minor-roads.json "[out:json][timeout:180];way[highway~\"^(residential|unclassified|living_street|service)\$\"][service!~\"parking_aisle|driveway\"]($BB);out tags geom qt;"
q osm-rail-water.json "[out:json][timeout:180];(way[railway~\"^(rail|subway|tram|light_rail|construction|abandoned|disused|platform)\$\"]($BB);way[waterway~\"^(canal|river|drain|stream)\$\"]($BB);way[natural=water][name]($BB);relation[natural=water][name]($BB);way[\"bridge\"][\"railway\"]($BB););out tags geom;"
q osm-landmarks.json "[out:json][timeout:180];(nwr[railway~\"^(station|halt)\$\"]($BB);nwr[public_transport=station]($BB);nwr[amenity~\"^(hospital|marketplace|bus_station|college|university|police|cinema|taxi|fuel)\$\"][name]($BB);nwr[shop~\"^(mall|department_store)\$\"]($BB);nwr[leisure~\"^(stadium|park|sports_centre)\$\"][name]($BB);node[highway=traffic_signals][name]($BB);node[junction][name]($BB);node[place]($BB);nwr[tourism][name]($BB);nwr[highway=bus_stop]($BB);nwr[public_transport=platform][bus=yes]($BB);way[building=train_station]($BB);nwr[amenity=place_of_worship][name]($BB);nwr[historic][name]($BB););out tags center;"
# 5. Sealdah forecourt detail: every highway/area within 300 m of the station.
q osm-sealdah-forecourt.json "[out:json][timeout:120];(way[highway](around:300,22.5678,88.3712);way[\"area:highway\"](around:300,22.5678,88.3712);nwr[amenity~\"^(taxi|parking|bus_station|marketplace)\$\"](around:400,22.5678,88.3712);nwr[railway~\"^(station|platform|subway_entrance|train_station_entrance)\$\"](around:400,22.5678,88.3712);nwr[entrance](around:300,22.5678,88.3712);way[building](around:120,22.5678,88.3712););out tags geom;"
# 6. Canal/river polygons without names (Beliaghata/Circular canal banks are mapped this way in places).
q osm-water-polygons.json "[out:json][timeout:120];(way[natural=water][water~\"^(canal|river|stream|ditch|drain)\$\"]($BB);way[waterway=riverbank]($BB);way[natural=water][!name]($BB);relation[natural=water][water~\"canal|river\"]($BB););out tags geom;"
