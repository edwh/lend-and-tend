FROM ghcr.io/freegle/freegle-base:latest

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps && npx nuxi prepare

# modtools-lat extends ../lat, whose server routes import lat's own deps
# (stripe, nodemailer), so lat needs its node_modules in the image too.
WORKDIR /app/lat
# `nuxi prepare` writes lat/.nuxt/tsconfig.json, which the TypeScript transform
# of lat's pages needs when lat is an extended layer rather than the project.
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
