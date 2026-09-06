# Percona 8.0 for L&T on Fly — matches the lat-percona container's image.
# Private-only (Fly private network); connections are cleartext over Fly's
# encrypted WireGuard mesh. Root/user passwords come from Fly secrets.
FROM percona:8.0.43-34

# Tuning + mysql_native_password default (see the .cnf for why the Go apiv2
# driver needs it). Mirrors Katapult's mounted conf/lat-percona-my.cnf.
COPY lat-percona-my.cnf /etc/my.cnf.d/lat-custom.cnf

# One-time grants on a fresh volume: create lat_test and let `lat` use it,
# so the batch container's entrypoint can provision its test database.
COPY initdb/ /docker-entrypoint-initdb.d/

EXPOSE 3306

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s \
  CMD mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" || exit 1
