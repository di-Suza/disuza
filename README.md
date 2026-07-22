# Disuza

Disuza is a TypeScript-first real-time social platform with a modular Express API and React web app.

## Documentation

- [Architecture guide](./Disuza-Architecture-Guide.md)
- [Architecture decision register](./ARCHITECTURE-DECISIONS.md)
- [Debugging guide](./DEBUGGING-GUIDE.md)
- [API contracts](./contracts/README.md)
- [Testing strategy](./tests/README.md)
- [Deployment guide](./DEPLOYMENT.md)
- [Future plan](./FUTUREPLAN.md)
- [Development journey](./docs.md)

## Current Demo Limitation

Collaborative room code execution is architecturally integrated through the API adapter and room UI, but the hosted demo should be treated as best-effort until a reliable paid or self-hosted sandbox runner is configured. For production-grade execution, set `PISTON_API_URL` to a maintained Piston-compatible runner with stable runtime availability, timeout controls, and operational monitoring.

## Structure

```txt
disuza/
  api/        TypeScript Express backend
  web/        TypeScript React frontend
  contracts/  REST/OpenAPI contract baseline
  tests/      Test strategy and future test layout
```

## Scripts

```bash
npm run dev:api
npm run dev:web
npm test
npm run check
npm run verify
```
