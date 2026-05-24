FROM ghcr.io/freegle/freegle-base:latest

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps && npx nuxi prepare

WORKDIR /app/modtools-lat

RUN npm install --legacy-peer-deps

EXPOSE 4003

CMD export NODE_OPTIONS=--max-old-space-size=4096 && \
    rm -rf /tmp/nitro/worker-* && \
    if [ "$NUXT_DEV_MODE" = "true" ]; then \
        export HOST=0 && npm run dev; \
    else \
        npm run build && export HOST=0 && npm run start; \
    fi
