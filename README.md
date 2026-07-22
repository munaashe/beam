# Beam

Analysis and design of rectangular reinforced concrete beams, to Eurocode 2
or SANS 10100. A C++ backend does the structural analysis and code checks;
a React frontend provides a visual beam builder and free body diagram.

## Prerequisites

- CMake and a C++17 compiler
- Node.js and Yarn

## Backend

```bash
cd backend
cmake -S . -B build
cmake --build build
./build/beam_api        # serves the API on http://localhost:8080
```

Run the test suite:

```bash
cd backend/build
ctest --output-on-failure
```

## Frontend

```bash
cd user-interface
yarn install
yarn dev                 # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8080`, so start the
backend first.

## Configuration

- **Backend**: reads the port to listen on from the `PORT` env var, falling
  back to `8080` if unset.
- **Frontend**: reads the API base URL from `VITE_API_URL` (see
  `user-interface/.env.example`). Unset in dev, so requests go through the
  `/api` proxy above; set it to your deployed backend's URL (including the
  `/api` prefix) for a production build.

## Deployment

**Backend (Google Cloud Run)**: `backend/Dockerfile` builds the API with no
external dependencies beyond libstdc++. With the
[gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated against
your project:

```bash
cd backend
gcloud run deploy beam-api --source . --region <your-region> --allow-unauthenticated
```

This builds the Dockerfile via Cloud Build and deploys in one step. Cloud Run
injects `PORT` automatically, which the server already reads. Note the
deployed URL - it ends in `/`, so the frontend's `VITE_API_URL` should be that
URL plus `/api` (e.g. `https://beam-api-xyz.run.app/api`).

**Frontend (Netlify)**: connect the repo with base directory
`user-interface`, build command `yarn build`, publish directory `dist`. Set
`VITE_API_URL` in the site's environment variables to the Cloud Run URL above.

## Scope

The solver only covers statically **determinate** single-span beams:

- Simply supported (pin/roller at both ends)
- Cantilever (fixed at one end, free at the other)

It does not solve statically indeterminate cases - propped cantilevers,
fixed-fixed beams, continuous multi-span beams, etc. The UI's "Add support"
flow only accepts combinations that map onto the two cases above.
