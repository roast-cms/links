import * as express from "express";
import * as dotenv from "dotenv";
import links from "@roast-cms/links";

dotenv.config();

/**
  Parent Express application.
*/
const app = express();

/**
  This is the `links` middleware implementation.
*/
app.use(
  links({
    // REQUIRED redis server URL
    redisURL: process.env.REDIS_URL || "",

    // REQUIRED MongoDB URI
    databaseURI: process.env.DATABASE_URI || "",

    // REQUIRED application secret (random string for app session ID)
    applicationSecret: process.env.APPLICATION_SECRET || "",

    // OPTIONAL path name for the `links` API on local Express router
    pathName: "/recommends",
  })
);

/**
  Parent server intialization.
*/
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is running on :${port}`);
});