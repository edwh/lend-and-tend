# Fly-optimized modtools-lat (moderator console). Build context is the
# iznik-nuxt3 repo. Same as modtools-lat/Dockerfile EXCEPT `npm run build` runs
# at IMAGE-build time so cold starts are seconds and the app scales to zero.
# modtools-lat/Dockerfile is left untouched (Katapult uses it as-is).
FROM ghcr.io/freegle/freegle-base:latest

WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps && npx nuxi prepare

WORKDIR /app/modtools-lat
RUN npm install --legacy-peer-deps

# modtools-lat/nuxt.config.ts reads these from process.env at build time.
ARG NODE_ENV=production
ARG IZNIK_API_V2
ARG LAT_WORLD_GROUPID
ENV NODE_ENV=$NODE_ENV \
    IZNIK_API_V2=$IZNIK_API_V2 \
    LAT_WORLD_GROUPID=$LAT_WORLD_GROUPID

RUN export NODE_OPTIONS=--max-old-space-size=4096 && npm run build

EXPOSE 4003

CMD rm -rf /tmp/nitro/worker-* && export HOST=0 && npm run start
