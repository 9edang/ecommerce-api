const hlp = require("./helper");

const transactionExistByID = async (db, id) => {
  if (isNaN(parseInt(id))) return false;
  const {
    rows: [exist],
  } = await db.query(`SELECT 1 AS one FROM "transactions" WHERE "id" = $1 LIMIT 1`, [id]);

  return !!exist;
};

module.exports = (server, db) => {
  server.route({
    method: "GET",
    path: "/transactions",
    handler: async function (request, h) {
      const { limit, offset } = hlp.prePaginate(request);

      const { rows: transactions } = await db.query(
        `SELECT t.id, t.qty, t.sku, p.price * t.qty AS amount FROM "transactions" AS t INNER JOIN "products" AS p ON t.sku = p.sku LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const resCount = await db.query(`SELECT COUNT("id") FROM "transactions"`);
      const totalData = resCount.rows[0].count;
      return { results: transactions, meta: hlp.buildMeta(request, totalData) };
    },
  });

  server.route({
    method: "GET",
    path: "/transactions/{id}",
    handler: async function (request, h) {
      const exist = await transactionExistByID(db, request.params.id);
      if (!exist) return h.response({ message: `transaction not found` }).code(404);

      const {
        rows: [transaction],
      } = await db.query(
        `SELECT t.id, t.qty, t.sku, p.price * t.qty AS amount FROM "transactions" AS t INNER JOIN "products" AS p ON t.sku = p.sku WHERE t.id = $1 LIMIT 1`,
        [request.params.id],
      );
      return { results: transaction };
    },
  });

  server.route({
    method: "POST",
    path: "/transactions",
    handler: async function (request, h) {
      const payload = request.payload;

      if (!payload.sku) return h.response({ message: `sku is required` }).code(400);
      const sku = payload.sku.trim();
      if (!payload.sku.trim()) return h.response({ message: `sku is blank` }).code(400);

      const exist = await hlp.productExistBySKU(db, sku);
      if (!exist) return h.response({ message: `sku not found` }).code(404);

      let qty = parseInt(payload.qty);
      if (isNaN(qty) || qty === 0) return h.response({ message: `qty is invalid` }).code(400);

      const stock = await hlp.countProductQty(db, sku);

      if (stock.total_qty + qty < 0) return h.response({ message: `stock is smaller than demand` }).code(400);

      await db.query(`INSERT INTO "transactions"(sku, qty) VALUES ($1, $2)`, [sku, qty]);

      return { message: "successfully create transaction" };
    },
  });

  server.route({
    method: "PATCH",
    path: "/transactions/{id}",
    handler: async function (request, h) {
      const id = request.params.id;
      const exist = await transactionExistByID(db, id);
      if (!exist) return h.response({ message: `transaction not found` }).code(404);

      const payload = request.payload;

      let qty = parseInt(payload.qty);
      if (isNaN(qty) || qty === 0) return h.response({ message: `qty is invalid` }).code(400);

      const {
        rows: [transaction],
      } = await db.query(`SELECT id, qty, sku FROM "transactions" WHERE id = $1 LIMIT 1`, [id]);

      const stock = await hlp.countProductQty(db, transaction.sku, id);

      if (qty < 0 && stock.total_qty + qty < 0) return h.response({ message: `stock is smaller than demand` }).code(400);

      await db.query(`UPDATE "transactions" SET qty = $1 WHERE id = $2`, [qty, id]);

      return { message: "successfully create transaction" };
    },
  });

  server.route({
    method: "DELETE",
    path: "/transactions/{id}",
    handler: async function (request, h) {
      const id = request.params.id;
      const exist = await transactionExistByID(db, id);
      if (!exist) return h.response({ message: `transaction not found` }).code(404);

      await db.query(`DELETE FROM "transactions" WHERE id = $1`, [id]);

      return { message: "successfully delete transaction" };
    },
  });
};
