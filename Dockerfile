FROM node:alpine

LABEL maintainer="Cyrano Chen <cyrano@arsenalcn.com>"

# nodejs client
WORKDIR /home/code
COPY ./package.json /home/code
RUN  npm install
COPY . /home/code/