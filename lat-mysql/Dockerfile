# Percona 8.0 MySQL — matches the local dev container in docker-compose.lat.yml
FROM percona:8.0

# Set up the same defaults the dev container uses. Connections via Fly's
# private network use cleartext over the encrypted Wireguard mesh, so we don't
# enable TLS here. MYSQL_ROOT_PASSWORD and MYSQL_USER/PASSWORD come from
# Fly secrets at runtime.

EXPOSE 3306

# Healthcheck via mysqladmin
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s \
  CMD mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" || exit 1
