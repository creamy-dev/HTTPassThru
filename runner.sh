#!/bin/bash
echo HTTPassThru Auto-Updater.
cp httpassthru/config.json . > /dev/null 2> /dev/null
rm -rf httpassthru > /dev/null 2> /dev/null
git clone https://github.com/creamy-dev/HTTPassThru.git
rm -rf httpassthru/config.json
mv config.json httpassthru/ 2> /dev/null > /dev/null
echo Finished updating. Starting.
cd HTTPassThru
npm .
echo Exiting...
cd ..
