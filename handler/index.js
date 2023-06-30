const productHandler = require("./products");
const transactionHandler = require("./transactions");
const collectProductHanlder = require("./collect-product");

module.exports = (server, db) => {
  productHandler(server, db);
  transactionHandler(server, db);
  collectProductHanlder(server, db);
};
