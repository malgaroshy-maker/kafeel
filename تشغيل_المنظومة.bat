@echo off
title Kafeel System Launcher

if not exist "node_modules" (
    echo Installing dependencies, please wait...
    call npm install
)

echo Starting the system in your browser...
call npm run dev -- --open
