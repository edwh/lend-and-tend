# Playwright runner for the Lend & Tend e2e suite, isolated from the host's
# network namespace. Running Chromium on the host makes it see every veth that
# other Docker projects create or restart, and each change aborts in-flight
# loads (ERR_NETWORK_CHANGED, pages that never hydrate). Inside a container the
# browser sees only its own eth0. socat forwards the localhost ports the tests
# and the app's baked runtime config use to the compose services, so specs run
# unmodified.
FROM mcr.microsoft.com/playwright:v1.56.1-noble
RUN apt-get update && apt-get install -y --no-install-recommends socat && rm -rf /var/lib/apt/lists/*
COPY entrypoint.sh /usr/local/bin/lat-e2e-entrypoint
RUN chmod +x /usr/local/bin/lat-e2e-entrypoint
ENTRYPOINT ["/usr/local/bin/lat-e2e-entrypoint"]
