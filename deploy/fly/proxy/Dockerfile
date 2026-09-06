# Public path-routing proxy for L&T on Fly.io.
# Fly terminates TLS; Caddy just routes paths to the private backend apps.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
