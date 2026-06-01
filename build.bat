@echo off
title Build in progress...

set "root=%~dp0"
set "sourceFolder=%root%src"

set "keyFile=%root%secret\key.pem"

set "chromeOutputFolder=%root%target"
set "chromeOutputFile=%root%src.crx"
set "chromeTargetFile=%chromeOutputFolder%\better-jira.crx"

set "firefoxOutputFolder=%root%target"
set "firefoxTargetFile=%firefoxOutputFolder%\better-jira.xpi"

where chrome >nul 2>nul

if errorlevel 1 (
    echo chrome.exe not in PATH
    pause
) else (
    where web-ext >nul 2>nul

    if errorlevel 1 (
        echo web-ext not in PATH
        echo Run: npm install --global web-ext
        pause
    ) else (
        if not exist "%chromeOutputFolder%" (
            mkdir "%chromeOutputFolder%"
        )
        if not exist "%firefoxOutputFolder%" (
            mkdir "%firefoxOutputFolder%"
        )
        chrome --pack-extension="%sourceFolder%" --pack-extension-key="%keyFile%" --no-message-box

        if errorlevel 1 (
            echo.
            echo Chrome build failed
            pause
        ) else (
            if exist "%chromeOutputFile%" (
                move /Y "%chromeOutputFile%" "%chromeTargetFile%" >nul

                if errorlevel 1 (
                    echo.
                    echo Chrome build succeeded, but moving the CRX failed
                    pause
                ) else (
                    if exist "%firefoxTargetFile%" (
                        del "%firefoxTargetFile%"
                    )
                    web-ext build --source-dir="%sourceFolder%" --artifacts-dir="%firefoxOutputFolder%" --filename="better-jira.xpi" --overwrite-dest

                    if errorlevel 1 (
                        echo.
                        echo Firefox build failed
                        pause
                    ) else (
                        echo Build successful!
                    )
                )
            ) else (
                echo.
                echo Chrome build may have succeeded, but the CRX was not found:
                echo "%chromeOutputFile%"
                pause
            )
        )
    )
)
