FROM ghcr.io/freegle/freegle-base:latest

WORKDIR /app

COPY . .

# Install root deps and generate /app/.nuxt/tsconfig.json so the OXC
# transformer can resolve tsconfig for parent-layer files when running
# the lat/ dev server.
RUN npm install --legacy-peer-deps && npx nuxi prepare

WORKDIR /app/lat

RUN npm install --legacy-peer-deps

EXPOSE 4002

CMD export NODE_OPTIONS=--max-old-space-size=8192 && \
    rm -rf /tmp/nitro/worker-* && \
    if [ "$NUXT_DEV_MODE" = "true" ]; then \
        export HOST=0 && npm run dev; \
    else \
        npm run build && export HOST=0 && npm run start; \
    fi
