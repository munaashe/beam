# Beam Backend (C++)

Simple C++ REST API bootstrap that returns plain text.

## Endpoint

- `GET /` -> `here we go again`

Default port: `8080`

## Build

```bash
cmake -S . -B build
cmake --build build
```

## Run

```bash
./build/beam_api
```

## Test

```bash
curl http://localhost:8080
```
