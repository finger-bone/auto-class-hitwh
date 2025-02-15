fmt:
	deno fmt

compile:
	deno compile --target x86_64-unknown-linux-gnu -o ./dist/auto-class-linux -A ./main.ts
	deno compile --target x86_64-apple-darwin -o ./dist/auto-class-macos -A ./main.ts
	deno compile --target x86_64-pc-windows-msvc -o ./dist/auto-class-windows.exe -A ./main.ts