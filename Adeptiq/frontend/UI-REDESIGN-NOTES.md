# UI refresh notes

The existing Adeptiq React routes, API calls, authentication flow, and component logic were retained. The visual layer now uses a restrained Microsoft Learn-inspired system: Segoe UI typography, Microsoft blue accents, white surfaces, light-gray page backgrounds, clearer borders, consistent buttons, and responsive layouts.

## Run frontend
1. Open a terminal in `frontend`.
2. Run `npm install`.
3. Run `npm run dev`.
4. For a production build, run `npm run build`.

Backend environment variables were not bundled; recreate `backend/.env` locally from your own configuration before running the backend.
