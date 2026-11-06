FROM node:24-bookworm-slim AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY scripts/prepare-assets.js scripts/prepare-assets.js
RUN node scripts/prepare-assets.js

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
WORKDIR /app
COPY --chown=node:node package.json server.js index.html ./
COPY --chown=node:node css ./css
COPY --chown=node:node js/script.js ./js/script.js
COPY --from=assets --chown=node:node /app/js/vendor ./js/vendor
COPY --from=assets --chown=node:node /app/assets/fonts ./assets/fonts
COPY --chown=node:node assets/profile.jpg assets/favicon.svg assets/social-card.png ./assets/
COPY --chown=node:node scripts/public-files.js scripts/inbox.js ./scripts/
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
