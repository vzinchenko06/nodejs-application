# nodejs-application

Node.js application server

## Available Scripts

In the project directory, you can run:

### `npm start`

Starts server.\
Please, see Docker and API part below to start services before run server and get additional information about Environment Variables.

### `npm run dev`

Starts server in the development mode.\
The server will reload if you make edits.

## Docker

In the project uses `docker-compose.yml` for configure and start databases and other services.\

### `docker-compose -f ./docker-compose.yml up -d`

Start docker services

### `docker-compose -f ./docker-compose.yml down`

Stops docker services

For more details, please, see [https://docs.docker.com/compose/reference](https://docs.docker.com/compose/reference)

## API

### JSON-RPC

For an API request is used JSON-RPC over WebSocket (HTTP). More details here: [https://www.jsonrpc.org/specification](https://www.jsonrpc.org/specification)

All available API methods are located in the `/api` folder.\
Api method is a file fis a special structure. It has to export default function which is method callback.\
Function accepts 2 arguments: context - application context with creates on application start, params - JSON-RPS request params.\
The full method name is mapped from its location: `/api/auth/user.js` -> 'auth.user'.

For example, when you make next request:

```
{
    "id": "..."
    "jsonrpc": "2.0"
    "method": "auth.user",
    "params": {...},
}
```

It calls api function which located in `api/auth/user.js` and pass params as second argument.
Result will be returned according JSON-RPC specification on the same transport (WebSocket or HTTP).

### Environment Variables

For a put environment variables locally just copy `.env.example` file to `.env` and variables pull up automatically into application.\
On the test environment (and production) that variables push to instance during the deployment process from AWS S3.

### Application directories

`/api` - JSON-RPC methods, for more details, please, see above;

`/config` - application configuration files

`/core` - application core files

`/services` - third pastry services providers (AWS services, Fetching data services from governments sites, etc.)
