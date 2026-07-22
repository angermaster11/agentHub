const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;



app.get("/", (req, res) => {
  res.json({
    ip : req.ip,
    message: "RangamAI is responding to your request!"

  })
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

