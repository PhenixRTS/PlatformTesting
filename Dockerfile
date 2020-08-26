FROM node:10.15.3-stretch-slim

LABEL maintainer="ops@phenixrts.com"

RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
	&& apt-get update -y \
	&& apt-get -y install ./google-chrome-stable_current_amd64.deb \
	&& rm google-chrome-stable_current_amd64.deb \
	&& apt-get clean

RUN	mkdir -p /usr/src/app

COPY	. /usr/src/app

RUN	cd /usr/src/app \
	&& npm install

WORKDIR /usr/src/app
