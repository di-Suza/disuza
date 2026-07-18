FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY api/package*.json ./api/
RUN npm --prefix api install

FROM deps AS development
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["npm", "--prefix", "api", "run", "dev"]

FROM deps AS build
WORKDIR /app
COPY api ./api
RUN npm --prefix api run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY api/package.json ./api/package.json
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY --from=build /app/api/dist ./api/dist
EXPOSE 8080
CMD ["npm", "--prefix", "api", "run", "start"]
