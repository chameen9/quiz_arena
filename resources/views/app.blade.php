<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuizArena - Codeverse</title>
    <link rel="icon" href="https://emcgalle.online/img/favicon.ico" type="image/x-icon">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />
    @php $cv = max(array_map('filemtime', glob(public_path('app/*.css')) ?: [0])); @endphp
    <link rel="stylesheet" href="/app/styles.css?v={{ $cv }}" />
    <link rel="stylesheet" href="/app/rooms.css?v={{ $cv }}" />
    <link rel="stylesheet" href="/app/admin.css?v={{ $cv }}" />
    <script>
        // Play entrance animations only while the tab is visible; lock content
        // visible shortly after load so a non-compositing context never shows blank.
        (function () {
            function sync() { document.documentElement.classList.toggle("anim-on", !document.hidden); }
            sync();
            document.addEventListener("visibilitychange", sync);
            function settle() { document.documentElement.classList.add("anim-settled"); }
            window.addEventListener("load", function () {
                requestAnimationFrame(function () { setTimeout(settle, 1000); });
            });
            setTimeout(settle, 2500);
        })();
    </script>
</head>
<body>
    <div id="root"></div>

    <!-- React + Babel (pinned) -->
    <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
    <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
    <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>

    <!-- SheetJS — Excel file import in BulkImportModal -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>

    <!-- real API client (plain JS, must run before the babel app scripts) -->
    <script src="/app/api-client.js"></script>

    <!-- app scripts — ?v= busts browser cache when any jsx file changes -->
    @php $v = max(array_map('filemtime', glob(public_path('app/*.jsx')) ?: [0])); @endphp
    <script type="text/babel" src="/app/tweaks-panel.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/common.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/screen-auth.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/screen-roommap.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/screen-room.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/screen-leaderboard.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/screen-admin.jsx?v={{ $v }}"></script>
    <script type="text/babel" src="/app/app.jsx?v={{ $v }}"></script>
</body>
</html>
