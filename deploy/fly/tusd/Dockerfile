# tusd upload server for L&T on Fly. Bakes the same flags the compose sets
# (bind-mounts aren't available on Fly, so config is baked, not mounted).
FROM tusproject/tusd:latest
# Uploads persist to /srv/tusd-data (the Fly volume mount) — tusd's default dir.
# -disable-termination: uploads are public by id (the id is in every photo's
# delivery URL), so tus DELETE would let anyone remove any member's photo.
# Nothing in L&T terminates uploads.
CMD ["-base-path=/files/", "-cors-allow-headers=baggage,sentry-trace,authorization,x-token", "-disable-termination"]
