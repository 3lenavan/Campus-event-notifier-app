@echo off
cd /d "%~dp0"
if "%EXPO_PUBLIC_SUPABASE_URL%"=="" set EXPO_PUBLIC_DEMO_MODE=true
if "%EXPO_PUBLIC_SUPABASE_ANON_KEY%"=="" set EXPO_PUBLIC_DEMO_MODE=true
npx expo start --web --port 8082 --max-workers 1
