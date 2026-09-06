# weserv image-resize/delivery for L&T on Fly. Bakes the nginx configs that the
# compose bind-mounts (Fly has no bind mounts). Keep these two files in sync
# with the repo-root delivery-*.conf.
FROM ghcr.io/weserv/images:5.x
COPY delivery-nginx.conf /etc/nginx/nginx.conf
COPY delivery-imagesweserv.conf /etc/nginx/imagesweserv.conf
