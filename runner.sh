#!/bin/bash
echo HTTPassThru Auto-Updater.
cp HTTPassThru/config.json . > /dev/null 2> /dev/null
rm -rf HTTPassThru > /dev/null 2> /dev/null
git clone https://github.com/creamy-dev/HTTPassThru.git
rm -rf HTTPassThru/config.json
mv config.json HTTPassThru/ 2> /dev/null > /dev/null
cd HTTPassThru
npm install
echo Finished updating. Starting.
npm start
echo Exiting...
cd ..
