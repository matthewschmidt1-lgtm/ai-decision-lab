#!/bin/sh
# Serve only the public website in production; tooling, tests and notes stay private.
set -e
rm -rf dist && mkdir -p dist
cp -R index.html robots.txt serve.json css js dist/
exec npx serve -s dist -l "${PORT:-3000}"
