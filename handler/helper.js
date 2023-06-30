exports.productExistBySKU = async (db, sku) => {
  const {
    rows: [exist],
  } = await db.query(`SELECT 1 AS one FROM "products" WHERE "sku" = $1 LIMIT 1`, [sku]);

  return !!exist;
};

exports.countProductQty = async (db, sku, except = null) => {
  const args = [sku];
  let query = `SELECT "sku", SUM("qty") AS total_qty  FROM "transactions" WHERE "sku" = $1 GROUP BY "sku"`;

  if (except) {
    query = `SELECT "sku", SUM("qty") AS total_qty  FROM "transactions" WHERE "sku" = $1 AND "id" != $2 GROUP BY "sku"`;
    args.push(except);
  }

  const {
    rows: [product],
  } = await db.query(query, args);
  if (!product) return { total_qty: 0 };
  product.total_qty = parseInt(product.total_qty);
  return product;
};

exports.prePaginate = (request) => {
  let page = parseInt(request.query.page);
  let limit = parseInt(request.query.per_page);

  if (isNaN(page) || page < 1) page = 1;

  if (isNaN(limit) || limit < 1) limit = 10;

  const offset = (page - 1) * limit;
  request.query.page = page;
  request.query.per_page = limit;
  return { limit, offset };
};

exports.buildMeta = (request, totalData) => {
  const { per_page, page } = request.query;
  return { total_data: totalData, total_page: parseInt(Math.ceil(totalData / per_page)), page: page, per_page: per_page };
};
