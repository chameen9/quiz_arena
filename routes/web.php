<?php

use Illuminate\Support\Facades\Route;

// Serve the single-page app. Any non-API route returns the SPA shell so the
// client-side router (in app.jsx) can take over.
Route::view('/', 'app');
Route::view('/{any}', 'app')->where('any', '^(?!api).*$');
