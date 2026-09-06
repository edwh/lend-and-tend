# tusd upload server for L&T on Fly. Bakes the same flags the compose sets
# (bind-mounts aren't available on Fly, so config is baked, not mounted).
FROM tusproject/tusd:latest
# Uploads persist to /srv/tusd-data (the Fly volume mount) — tusd's default dir.
CMD ["-base-path=/files/", "-cors-allow-headers=baggage,sentry-trace,authorization,x-token"]
