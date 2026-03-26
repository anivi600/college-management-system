require("dotenv").config();
const app = require("./app");

const { PORT } = process.env;

app.listen(PORT || 3001, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT || 3001}`);
});
