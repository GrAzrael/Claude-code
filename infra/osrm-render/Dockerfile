# Builds a small OSRM routing instance for East Macedonia & Thrace
# (Kavala, Drama, Xanthi, Rodopi/Komotini, Evros/Alexandroupoli-Orestiada,
# Thasos) and serves it on Render's free tier (512MB RAM), which is too
# small to hold all of Greece. Widen the bounding box below once this
# outgrows the free plan.

FROM ghcr.io/project-osrm/osrm-backend:latest AS builder
WORKDIR /data

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl osmium-tool ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN curl -L -o greece.osm.pbf https://download.geofabrik.de/europe/greece-latest.osm.pbf

# Bounding box: west,south,east,north (East Macedonia & Thrace)
RUN osmium extract -b 23.7,40.7,26.6,41.8 greece.osm.pbf -o region.osm.pbf --overwrite

RUN osrm-extract -p /opt/car.lua region.osm.pbf && \
    osrm-partition region.osrm && \
    osrm-customize region.osrm

FROM ghcr.io/project-osrm/osrm-backend:latest
WORKDIR /data
COPY --from=builder /data/region.osrm* /data/

# Render injects $PORT; default to 5000 for local/other hosts.
CMD ["/bin/sh", "-c", "osrm-routed --algorithm mld -p ${PORT:-5000} /data/region.osrm"]
