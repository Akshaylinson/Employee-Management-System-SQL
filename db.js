
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
