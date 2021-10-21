FROM alpine

RUN apk add --update nodejs
COPY openapi/api.yaml openapi/api.yaml
COPY dist/app.js dist/app.js
EXPOSE 8080
CMD ["node", "dist/app.js"]
