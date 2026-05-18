@echo off
title Kafeel System Graphify Updater
echo ====================================================
echo   تحديث ورسم خريطة منظومة كفيل السحابية
echo ====================================================
echo.
echo 1. تحديث فوري شامل لمرة واحدة (One-shot Update)
echo 2. تشغيل المزامنة التلقائية واللحظية المستمرة عند تعديل أي كود (Live Hot-Watch Sync)
echo ====================================================
set /p opt="اختر رقم الخيار المناسب (1 أو 2): "

if "%opt%"=="2" (
    echo.
    echo ====================================================
    echo   [نشط] جاري تشغيل وضع المزامنة اللحظية المستمرة...
    echo   سيتم تحديث المخطط تلقائياً بمجرد حفظ أي ملف كود.
    echo   لإيقاف التشغيل في أي وقت، اضغط Ctrl + C
    echo ====================================================
    echo.
    if exist "graphify-out\graph.html" (
        start graphify-out\graph.html
    )
    call graphify watch .
    goto end
)

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
echo ====================================================
pause

:end
