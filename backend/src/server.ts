const Fastify = require("fastify");
const cors = require("@fastify/cors");

const app = Fastify({
  logger: true,
});

async function start() {
  await app.register(cors, { origin: true });

  app.get("/", async () => {
    return { message: "API do CIS Simulado funcionando" };
  });

  await app.listen({ port: 3333, host: "0.0.0.0" });
  console.log("Servidor rodando em http://localhost:3333");
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});