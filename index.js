"use strict";

const Hapi = require("@hapi/hapi");
const client = require("./db");
const handler = require("./handler");

let db;
const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: "localhost",
  });

  db = await client.connect();

  handler(server, db);

  server.ext({
    type: "onPreResponse",
    method: (request, h) => {
      if (request.response.isBoom) {
        console.log(request.response.message);
        return h.response({ message: "something wrong" }).code(500);
      }

      return h.continue;
    },
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

init().finally(() => {
  db.release();
});
