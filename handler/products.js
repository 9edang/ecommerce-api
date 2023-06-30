const hlp = require("./helper");

module.exports = (server, db) => {
  server.route({
    method: "GET",
    path: "/products",
    handler: async function (request, h) {
      const { limit, offset } = hlp.prePaginate(request);

      const query = `SELECT p.name, p.image, p.price, p.sku, COALESCE(SUM(t.qty), 0) AS stock FROM products p LEFT JOIN transactions t on p.sku = t.sku GROUP BY p.name, p.image, p.price, p.sku LIMIT $1 OFFSET $2`;

      const { rows: products } = await db.query(query, [limit, offset]);
      const resCount = await db.query(`SELECT COUNT("id") FROM "products"`);
      const totalData = resCount.rows[0].count;
      return { results: products, meta: hlp.buildMeta(request, totalData) };
    },
  });

  server.route({
    method: "GET",
    path: "/products/{sku}",
    handler: async function (request, h) {
      const exist = await hlp.productExistBySKU(db, request.params.sku);
      if (!exist) return h.response({ message: `product not found` }).code(404);

      const query = `SELECT p.name, p.image, p.price, p.sku, COALESCE(SUM(t.qty), 0) AS stock FROM products p LEFT JOIN transactions t on p.sku = t.sku WHERE p.sku = $1 GROUP BY p.name, p.image, p.price, p.sku LIMIT 1`;

      const {
        rows: [product],
      } = await db.query(query, [request.params.sku]);

      return { results: product };
    },
  });

  server.route({
    method: "POST",
    path: "/products",
    handler: async function (request, h) {
      try {
        const payload = request.payload;

        const strAttrs = ["name", "image", "sku"];

        for (let attr of strAttrs) {
          if (!payload[attr]) return h.response({ message: `${attr} is required` }).code(400);
          if (!payload[attr].trim()) return h.response({ message: `${attr} is blank` }).code(400);
        }

        if (!payload.price) h.response({ message: `price is required` }).code(400);

        const price = Number(payload.price);
        if (isNaN(price) || price <= 1) return h.response({ message: `price must be valid number` }).code(400);

        const exist = await hlp.productExistBySKU(db, payload.sku);

        if (exist) return h.response({ message: "sku is already exists" }).code(400);

        const args = [payload.name, payload.image, price, payload.description, payload.sku];

        await db.query(`INSERT INTO "products"(name, image, price, description, sku) VALUES ($1, $2, $3, $4, $5)`, args);

        return { message: "successfully create product" };
      } catch {
        return h.response({ message: "something wrong" }).code(500);
      }
    },
  });

  server.route({
    method: "PATCH",
    path: "/products/{sku}",
    handler: async function (request, h) {
      const payload = request.payload;

      const exist = await hlp.productExistBySKU(db, request.params.sku);

      if (!exist) return h.response({ message: "product not found" }).code(404);

      const {
        rows: [product],
      } = await db.query(`SELECT "name", "image", "price", "sku", "description" FROM "products" WHERE "sku" = $1 LIMIT 1`, [
        request.params.sku,
      ]);

      const strAttrs = ["name", "image"];

      for (let attr of strAttrs) {
        if (!payload[attr]) {
          payload[attr] = product[attr];
        } else if (payload[attr].trim() === "") return h.response({ message: `${attr} is blank` }).code(400);
      }

      if (!payload.price) {
        payload.price = product.price;
      } else {
        const price = Number(payload.price);
        if (isNaN(price) || price <= 0) return h.response({ message: `price must be valid number` }).code(400);
        payload.price = price;
      }

      if (!payload.description) payload.description = product.description;

      const args = [payload.name, payload.image, payload.price, payload.description, request.params.sku];

      await db.query(`UPDATE "products" SET name = $1, image = $2, price = $3, description = $4 WHERE sku = $5`, args);

      return { message: "successfully update product" };
    },
  });

  server.route({
    method: "DELETE",
    path: "/products/{sku}",
    handler: async function (request, h) {
      try {
        const sku = request.params.sku;
        const exist = await hlp.productExistBySKU(db, sku);
        if (!exist) return h.response({ message: "product not found" }).code(404);

        await db.query("BEGIN");

        await db.query(`DELETE FROM "transactions" WHERE sku = $1`, [sku]);

        await db.query(`DELETE FROM "products" WHERE sku = $1`, [sku]);

        await db.query("COMMIT");

        return { message: "successfully delete product" };
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    },
  });
};
