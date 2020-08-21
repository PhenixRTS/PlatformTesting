FROM node:10.15.3-stretch-slim

LABEL maintainer="ops@phenixrts.com"

RUN	mkdir -p /usr/src/app

COPY	. /usr/src/app

RUN	cd /usr/src/app \
  && npm install

WORKDIR /usr/src/app