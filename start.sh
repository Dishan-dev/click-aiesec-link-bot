#!/bin/bash
/usr/bin/xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24' /usr/bin/node src/index.js
