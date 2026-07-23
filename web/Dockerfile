FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY web/package*.json ./web/
RUN npm --prefix web install
RUN npm --prefix web install @rollup/rollup-linux-x64-musl@4.62.2 --no-save

FROM deps AS development
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "--prefix", "web", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:8081/api
ARG VITE_SOCKET_URL=http://localhost:8081
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
COPY web ./web
RUN npm --prefix web run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY web/package.json ./web/package.json
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=build /app/web/dist ./web/dist
EXPOSE 5173
CMD ["npm", "--prefix", "web", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
