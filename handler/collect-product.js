const axios = require("axios");
const hlp = require("./helper");

module.exports = (server, db) => {
  server.route({
    method: "GET",
    path: "/collect-products",
    handler: async function (request, h) {
      try {
        let index = 1;
        while (true) {
          const { data } = await axios.get(`https://codetesting.jubelio.store/wp-json/wc/v3/products?page=${index}`, {
            auth: {
              password: "cs_7be10f0328c5b1d6a1a3077165b226af71d8b9dc",
              username: "ck_1cbb2c1902d56b629cd9a555cc032c4b478b26ce",
            },
          });

          if (data.length === 0) break;

          await db.query("BEGIN");

          for (let product of data) {
            if (!product.sku && product.sku === "") continue;
            const exist = await hlp.productExistBySKU(db, product.sku);
            if (exist) continue;

            let image = "";
            if (product.images[0] && product.images[0].src) image = product.images[0].src;

            const args = [product.name, image, Number(product.price), product.description, product.sku];

            await db.query(`INSERT INTO "products"(name, image, price, description, sku) VALUES ($1, $2, $3, $4, $5)`, args);
          }

          await db.query("COMMIT");

          index++;
        }
        return { message: "successfully collect product" };
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    },
  });
};
