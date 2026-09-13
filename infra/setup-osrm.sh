#!/usr/bin/env bash
# =====================================================================
# Sets up a self-hosted OSRM (routing engine) instance for Greece on a
# fresh Ubuntu VM (built for Oracle Cloud's Always Free Ampere A1 ARM
# shape, but works on any Ubuntu 22.04+ box with enough RAM).
#
# Run this ON THE VM itself (over SSH), as the default user (ubuntu).
# It installs Docker, downloads the Greece OSM extract, preprocesses it
# for OSRM's MLD algorithm, and runs osrm-routed on port 5000.
# =====================================================================
set -euo pipefail

REGION_URL="https://download.geofabrik.de/europe/greece-latest.osm.pbf"
WORKDIR="$HOME/osrm"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend"

echo "==> Installing Docker..."
sudo apt-get update -y
sudo apt-get install -y docker.io curl
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

echo "==> Opening port 5000 on this VM's own firewall (Oracle images filter inbound by default)..."
sudo iptables -I INPUT 1 -p tcp --dport 5000 -j ACCEPT
sudo apt-get install -y iptables-persistent || true
sudo netfilter-persistent save || true

echo "==> Downloading Greece OSM extract..."
mkdir -p "$WORKDIR"
cd "$WORKDIR"
curl -L -o greece-latest.osm.pbf "$REGION_URL"

echo "==> Preprocessing for OSRM (MLD algorithm)..."
sudo docker run -t -v "$WORKDIR:/data" "$OSRM_IMAGE" osrm-extract -p /opt/car.lua /data/greece-latest.osm.pbf
sudo docker run -t -v "$WORKDIR:/data" "$OSRM_IMAGE" osrm-partition /data/greece-latest.osrm
sudo docker run -t -v "$WORKDIR:/data" "$OSRM_IMAGE" osrm-customize /data/greece-latest.osrm

echo "==> Starting osrm-routed on port 5000..."
sudo docker rm -f osrm 2>/dev/null || true
sudo docker run -d --name osrm --restart unless-stopped \
  -p 5000:5000 -v "$WORKDIR:/data" \
  "$OSRM_IMAGE" osrm-routed --algorithm mld /data/greece-latest.osrm

sleep 3
echo "==> Smoke test (Athens -> Piraeus distance/time table):"
curl -s "http://localhost:5000/table/v1/driving/23.7275,37.9838;23.6483,37.9475" | head -c 500
echo
echo "==> Done. If you see a JSON response above with 'code':'Ok', OSRM is working."
echo "==> Your OSRM_BASE_URL for solver/.env is: http://<THIS_VM_PUBLIC_IP>:5000"
