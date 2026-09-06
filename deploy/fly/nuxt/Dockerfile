# Fly-optimized Nuxt SSR. Build context is the iznik-nuxt3 repo. Same as
# lat/Dockerfile EXCEPT `npm run build` runs at BUILD time (on Fly's remote
# builder) instead of at container start, so cold starts are seconds and the
# app can scale to zero. iznik-nuxt3/lat/Dockerfile is left untouched (Katapult
# uses it as-is).
FROM ghcr.io/freegle/freegle-base:latest

WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps && npx nuxi prepare

WORKDIR /app/lat
RUN npm install --legacy-peer-deps

# lat/nuxt.config.ts evaluates runtimeConfig.public from process.env at BUILD
# time (e.g. APIv2 = process.env.IZNIK_API_V2). Pass those as build args so the
# baked bundle matches the runtime [env]. SECRETS are NOT baked: the server
# routes (contact/checkout/stripe-webhook) read SMTP_*/STRIPE_* from process.env
# at request time, so they stay runtime-only. (If client-side Sentry is wanted,
# add LAT_SENTRY_DSN as a build arg — it's public runtimeConfig, baked here.)
ARG NODE_ENV=production
ARG IZNIK_API_V2
ARG NUXT_PUBLIC_API_URL
ARG USER_SITE
ARG LAT_USER_SITE
ARG FREEGLE_USER_SITE
ARG LAT_WORLD_GROUPID
ARG LAT_TUS_PUBLIC_URL
ARG LAT_DELIVERY_PUBLIC_URL
ARG LAT_MODERATION_ENABLED
ARG LAT_USE_FREEGLE_GEOCODER
ENV NODE_ENV=$NODE_ENV \
    IZNIK_API_V2=$IZNIK_API_V2 \
    NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL \
    USER_SITE=$USER_SITE \
    LAT_USER_SITE=$LAT_USER_SITE \
    FREEGLE_USER_SITE=$FREEGLE_USER_SITE \
    LAT_WORLD_GROUPID=$LAT_WORLD_GROUPID \
    LAT_TUS_PUBLIC_URL=$LAT_TUS_PUBLIC_URL \
    LAT_DELIVERY_PUBLIC_URL=$LAT_DELIVERY_PUBLIC_URL \
    LAT_MODERATION_ENABLED=$LAT_MODERATION_ENABLED \
    LAT_USE_FREEGLE_GEOCODER=$LAT_USE_FREEGLE_GEOCODER

RUN export NODE_OPTIONS=--max-old-space-size=4096 && npm run build

EXPOSE 4002

# .output is already built — just boot the node server (seconds).
CMD rm -rf /tmp/nitro/worker-* && export HOST=0 && npm run start
