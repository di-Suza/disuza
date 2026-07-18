# DevLoopFeed

DevLoopFeed is a TypeScript-first real-time social platform with a modular Express API and React web app.

## Documentation

- [Architecture guide](./DevLoopFeed-Architecture-Guide.md)
- [Architecture decision register](./ARCHITECTURE-DECISIONS.md)
- [Debugging guide](./DEBUGGING-GUIDE.md)
- [API contracts](./contracts/README.md)
- [Testing strategy](./tests/README.md)
- [Deployment guide](./DEPLOYMENT.md)
- [Future plan](./FUTUREPLAN.md)
- [Development journey](./docs.md)

## Structure

```txt
devloopfeed/
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
