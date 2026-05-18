@echo off
title Kafeel System Graphify Updater
echo ====================================================
echo   تحديث ورسم خريطة منظومة كفيل السحابية
echo ====================================================
echo.
echo جاري تحديث وتحليل الكود المصدري للمنظومة...
call graphify update .
echo.
if exist "graphify-out\graph.html" (
    echo تم التحديث بنجاح! جاري فتح المخطط التفاعلي في المتصفح...
    start graphify-out\graph.html
) else (
    echo خطأ: لم يتم العثور على ملف المخطط التفاعلي.
)
echo.
echo ====================================================
pause
