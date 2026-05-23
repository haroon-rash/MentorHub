FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_AUTH_API_BASE_URL=http://localhost:8080
ARG VITE_CORE_API_BASE_URL=http://localhost:8080
ARG VITE_USER_API_BASE_URL=http://localhost:8080
ENV VITE_AUTH_API_BASE_URL=${VITE_AUTH_API_BASE_URL}
ENV VITE_CORE_API_BASE_URL=${VITE_CORE_API_BASE_URL}
ENV VITE_USER_API_BASE_URL=${VITE_USER_API_BASE_URL}
RUN npm run build

FROM nginx:alpine
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3005
CMD ["nginx", "-g", "daemon off;"]
