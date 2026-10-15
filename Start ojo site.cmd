@echo off
rem Runs the ojo website locally and opens it in your browser.
cd /d "%~dp0"
start "" http://localhost:5180
python -m http.server 5180 --bind 127.0.0.1 --directory site
